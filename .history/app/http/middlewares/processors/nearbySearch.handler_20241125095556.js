const {redisClient} = require("../../../utils/initRedis");
const logger = require('../../../utils/logger/winston');
const { z } = require('zod');
const { performance } = require('perf_hooks');


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
        const cachedResult = await redisClient.get(cacheKey);
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
        await redisClient.setex(
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
یک هندلر کلی که برای هر چیزی محصولات اگهی ها درخواست ها فقط مواردی که در محدوده هستن نمایش میده...
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
/////////////////////////////////////////////////////////////////////////

طرز استفاده از میدلور Geofilter با مثال:
فرض کنید یک مدل Product در Prisma دارید و می‌خواهید روت /products را به گونه‌ای پیاده‌سازی کنید که فقط محصولاتی را برگرداند که در فاصله 25 کیلومتری از کاربر قرار دارند.

1. تعریف مدل Product در Prisma:

model Product {
  id        Int      @id @default(autoincrement())
  name      String
  latitude  Float
  longitude Float
}
Use code with caution.
Prisma
2. ایجاد روت در اکسپرس:

const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/initPrisma'); // فرض بر این است که شما prisma client را در این مسیر مقداردهی کرده اید
const createGeoFilterMiddleware = require('./geoFilterMiddleware'); // مسیر به میدلور شما

تعریف میدلور برای مدل Product
const geoFilterProduct = createGeoFilterMiddleware({
  prisma,
  model: 'Product',
  latitudeField: 'latitude',
  longitudeField: 'longitude'
});

تعریف روت برای دریافت محصولات با فیلتر جغرافیایی
router.get('/products', geoFilterProduct, async (req, res) => {
  try {
    res.json(req.filteredRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
Use code with caution.
JavaScript
3. نحوه فراخوانی روت:

برای فراخوانی این روت، باید پارامترهای طول و عرض جغرافیایی کاربر و شعاع مورد نظر را به عنوان query parameters ارسال کنید:

GET /products?userLatitude=35.6892&userLongitude=51.3890&radius=25
Use code with caution.
در این مثال، میدلور geoFilterProduct قبل از هندلر روت اجرا می‌شود و فقط رکوردهایی را در req.filteredRecords قرار می‌دهد که در شعاع 25 کیلومتری از مختصات (35.6892, 51.3890) قرار دارند.

تنظیمات بیشتر:

شما می‌توانید تنظیمات بیشتری را به میدلور createGeoFilterMiddleware ارسال کنید:

const geoFilterProduct = createGeoFilterMiddleware({
  prisma,
  model: 'Product',
  latitudeField: 'latitude',
  longitudeField: 'longitude',
  maxDistance: 50, // حداکثر شعاع پیش فرض (در صورت عدم ارسال radius)
  cacheEnabled: true, // فعال کردن کش
  cacheTTL: 7200, // TTL کش به ثانیه (2 ساعت)
  includeFields: ['id', 'name'], // فقط فیلدهای id و name در پاسخ برگردانده شوند
  orderBy: { distance: 'asc' } // مرتب سازی بر اساس فاصله
});
*/