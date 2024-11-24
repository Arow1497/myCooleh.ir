// یک هندلر کلی که برای هر چیزی محصولات اگهی ها درخواست ها فقط مواردی که در محدوده هستن نمایش میده...

const Redis = require('ioredis');
const winston = require('winston');
const { z } = require('zod');
const { performance } = require('perf_hooks');

// Setup Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Setup Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Input validation schema
const coordinatesSchema = z.object({
  userLatitude: z.number()
    .min(-90)
    .max(90)
    .transform(val => parseFloat(val)),
  userLongitude: z.number()
    .min(-180)
    .max(180)
    .transform(val => parseFloat(val)),
  radius: z.number()
    .min(0)
    .max(100)
    .optional()
    .transform(val => parseFloat(val))
});

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Create bounding box for initial filtering
function calculateBoundingBox(lat, lon, distance) {
  const latKm = 110.574; // Approximate kilometers per degree of latitude
  const lonKm = 111.320 * Math.cos(lat * Math.PI / 180); // Kilometers per degree of longitude

  const latDelta = distance / latKm;
  const lonDelta = distance / lonKm;

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
}

// Main middleware factory
const createGeoFilterMiddleware = ({
  maxDistance = 25,
  latitudeField = 'latitude',
  longitudeField = 'longitude',
  prisma,
  model,
  cacheEnabled = true,
  cacheTTL = 3600, // 1 hour
  includeFields = [],
  excludeFields = [],
  orderBy = {},
  customWhere = {}
}) => {
  return async (req, res, next) => {
    const startTime = performance.now();
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    try {
      // Validate and parse input
      const validatedData = await coordinatesSchema.parseAsync({
        userLatitude: req.query.userLatitude,
        userLongitude: req.query.userLongitude,
        radius: req.query.radius || maxDistance
      });

      const { userLatitude, userLongitude, radius } = validatedData;

      // Generate cache key if caching is enabled
      const cacheKey = cacheEnabled ? 
        `geo:${model}:${userLatitude}:${userLongitude}:${radius}:${JSON.stringify(customWhere)}` : null;

      // Try to get from cache first
      if (cacheEnabled) {
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          logger.info({
            message: 'Cache hit',
            requestId,
            model,
            coords: { userLatitude, userLongitude, radius }
          });
          req.filteredRecords = JSON.parse(cachedResult);
          return next();
        }
      }

      // Calculate bounding box for initial filtering
      const box = calculateBoundingBox(userLatitude, userLongitude, radius);

      // Construct the where clause
      const whereClause = {
        AND: [
          {
            [latitudeField]: {
              gte: box.minLat,
              lte: box.maxLat
            }
          },
          {
            [longitudeField]: {
              gte: box.minLon,
              lte: box.maxLon
            }
          },
          { ...customWhere }
        ]
      };

      // Construct select clause based on include/exclude fields
      const selectClause = {};
      if (includeFields.length > 0) {
        includeFields.forEach(field => selectClause[field] = true);
      } else if (excludeFields.length > 0) {
        const allFields = await prisma[model].fields();
        allFields
          .filter(field => !excludeFields.includes(field))
          .forEach(field => selectClause[field] = true);
      }

      // Fetch records with optimized query
      const records = await prisma[model].findMany({
        where: whereClause,
        ...(Object.keys(selectClause).length > 0 && { select: selectClause }),
        ...(Object.keys(orderBy).length > 0 && { orderBy })
      });

      // Precise distance filtering
      const filteredRecords = records.filter(record => {
        const distance = calculateDistance(
          userLatitude,
          userLongitude,
          record[latitudeField],
          record[longitudeField]
        );
        record.distance = Math.round(distance * 100) / 100; // Add distance to record
        return distance <= radius;
      });

      // Sort by distance
      filteredRecords.sort((a, b) => a.distance - b.distance);

      // Cache results if enabled
      if (cacheEnabled && filteredRecords.length > 0) {
        await redis.setex(
          cacheKey,
          cacheTTL,
          JSON.stringify(filteredRecords)
        );
      }

      // Log performance metrics
      const endTime = performance.now();
      logger.info({
        message: 'Geo filter executed',
        requestId,
        model,
        coords: { userLatitude, userLongitude, radius },
        metrics: {
          executionTime: Math.round(endTime - startTime),
          recordsFound: filteredRecords.length,
          cacheStatus: cacheEnabled ? 'miss' : 'disabled'
        }
      });

      req.filteredRecords = filteredRecords;
      next();

    } catch (error) {
      logger.error({
        message: 'Geo filter error',
        requestId,
        error: error.message,
        stack: error.stack
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input parameters',
          errors: error.errors
        });
      }

      // Handle Redis errors gracefully
      if (error.name === 'RedisError') {
        logger.warn({
          message: 'Redis error - continuing without cache',
          requestId,
          error: error.message
        });
        // Continue without cache
      }

      if (error.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
          success: false,
          message: 'Database query error',
          error: error.message
        });
      }

      if (error.name === 'PrismaClientUnknownRequestError') {
        return res.status(500).json({
          success: false,
          message: 'Unexpected database error',
          error: 'Internal server error'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'production' ? 
          'An unexpected error occurred' : error.message
      });
    }
  };
};

module.exports = createGeoFilterMiddleware;

/*
نحوه استفاده:
const geoMiddleware = createGeoFilterMiddleware({
  prisma,
  model: 'notice',
  maxDistance: 25,
  cacheEnabled: true,
  cacheTTL: 3600,
  includeFields: ['id', 'title', 'latitude', 'longitude'],
  customWhere: { isActive: true },
  orderBy: { createdAt: 'desc' }
});
*/