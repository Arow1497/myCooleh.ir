// src/middleware/roleResourceManagement.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Resource-specific permission validators
 */
const resourceValidators = {
  // Validate garage-specific permissions
  async validateGarageAccess(userId, garageId, requiredPermission) {
    const businessProfile = await prisma.businessProfile.findFirst({
      where: { userId },
      include: {
        mechanicAt: true,
        apprenticeAt: true,
      }
    });

    // Check if user is a mechanic at this garage
    if (businessProfile?.mechanicAt?.id === garageId) {
      // Define allowed permissions for mechanics
      const mechanicPermissions = ['READ', 'CREATE_DOCUMENT', 'UPDATE_DOCUMENT', 'READ_METRICS'];
      return mechanicPermissions.includes(requiredPermission);
    }

    // Check if user is an apprentice at this garage
    if (businessProfile?.apprenticeAt?.id === garageId) {
      // Define allowed permissions for apprentices
      const apprenticePermissions = ['READ', 'CREATE_BASIC_DOCUMENT', 'READ_BASIC_METRICS'];
      return apprenticePermissions.includes(requiredPermission);
    }

    // Check if user is the garage owner
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
      include: { garageOwner: true }
    });
    
    return garage?.garageOwner?.userId === userId;
  },

  // Validate supplier store permissions
  async validateSupplierStoreAccess(userId, storeId, requiredPermission) {
    const businessProfile = await prisma.businessProfile.findFirst({
      where: { userId },
      include: {
        ownedSupplierStore: {
          where: { id: storeId }
        }
      }
    });

    return businessProfile?.ownedSupplierStore?.length > 0;
  }
};

/**
 * Enhanced middleware for resource-specific access control
 */
const resourceAccessControl = {
  // Garage document access control
  garageDocumentAccess: (permissionType) => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const garageId = req.params.garageId || req.body.garageId;
        
        if (!userId || !garageId) {
          return res.status(401).json({ 
            error: 'Unauthorized', 
            details: 'User ID or Garage ID missing' 
          });
        }

        const hasAccess = await resourceValidators.validateGarageAccess(
          userId, 
          garageId, 
          permissionType
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            details: 'You do not have permission to access this garage\'s documents'
          });
        }

        // Add garage info to request for downstream use
        req.garageAccess = {
          garageId,
          permissionType,
          timestamp: new Date()
        };

        next();
      } catch (error) {
        console.error('Garage document access check failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  },

  // Mechanic-specific operations
  mechanicOperations: () => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const garageId = req.params.garageId || req.body.garageId;

        const businessProfile = await prisma.businessProfile.findFirst({
          where: { 
            userId,
            mechanicGarageId: garageId
          }
        });

        if (!businessProfile) {
          return res.status(403).json({
            error: 'Forbidden',
            details: 'You are not registered as a mechanic in this garage'
          });
        }

        // Add mechanic info to request
        req.mechanicAccess = {
          profileId: businessProfile.id,
          garageId,
          timestamp: new Date()
        };

        next();
      } catch (error) {
        console.error('Mechanic operation check failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  },

  // Apprentice-specific operations
  apprenticeOperations: () => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const garageId = req.params.garageId || req.body.garageId;

        const businessProfile = await prisma.businessProfile.findFirst({
          where: { 
            userId,
            apprenticeGarageId: garageId
          }
        });

        if (!businessProfile) {
          return res.status(403).json({
            error: 'Forbidden',
            details: 'You are not registered as an apprentice in this garage'
          });
        }

        // Add apprentice info to request
        req.apprenticeAccess = {
          profileId: businessProfile.id,
          garageId,
          timestamp: new Date()
        };

        next();
      } catch (error) {
        console.error('Apprentice operation check failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  },

  // Project-specific access control
  projectAccess: () => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const projectId = req.params.projectId || req.body.projectId;
        
        const projectProfile = await prisma.projectProfile.findFirst({
          where: {
            userId,
            OR: [
              { 
                inProgressProjectMechanic: {
                  some: { projectId }
                }
              },
              {
                inProgressProjectApprentice: {
                  some: { projectId }
                }
              },
              {
                projectProvider: {
                  id: projectId
                }
              }
            ]
          }
        });

        if (!projectProfile) {
          return res.status(403).json({
            error: 'Forbidden',
            details: 'You do not have access to this project'
          });
        }

        // Add project access info to request
        req.projectAccess = {
          profileId: projectProfile.id,
          projectId,
          timestamp: new Date()
        };

        next();
      } catch (error) {
        console.error('Project access check failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  },
  
  // Access control for handling complaints
  complaintHandler: () => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const complaintId = req.params.complaintId || req.body.complaintId;
        
        const projectProfile = await prisma.projectProfile.findFirst({
          where: {
            userId,
            OR: [
              { 
                complaintsFiled: {
                  some: { id: complaintId }
                }
              },
              {
                complaintsReceived: {
                  some: { id: complaintId }
                }
              }
            ]
          }
        });

        if (!projectProfile) {
          return res.status(403).json({
            error: 'Forbidden',
            details: 'You are not authorized to handle this complaint'
          });
        }

        req.complaintAccess = {
          profileId: projectProfile.id,
          complaintId,
          timestamp: new Date()
        };

        next();
      } catch (error) {
        console.error('Complaint handler check failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  }
};

/**
 * Audit logging middleware
 */
const auditLogger = {
  logAccess: (resourceType) => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const resourceId = req.params.id || req.body.resourceId;
        
        await prisma.permissionAuditLog.create({
          data: {
            userId,
            action: req.method,
            resourceType,
            resourceId,
            createdBy: userId,
            oldValue: req.body.oldValue ? JSON.stringify(req.body.oldValue) : null,
            newValue: req.body ? JSON.stringify(req.body) : null
          }
        });
        
        next();
      } catch (error) {
        console.error('Audit logging failed:', error);
        // Continue even if logging fails
        next();
      }
    };
  }
};

module.exports = {
  resourceAccessControl,
  auditLogger
};

/*

نحوه استفاده از میدلور جدید در مسیرهای اکسپرس:
javascriptCopyconst { resourceAccessControl, auditLogger } = require('./middleware/roleResourceManagement');

مسیرهای مربوط به اسناد گاراژ
router.post('/garages/:garageId/documents',
  resourceAccessControl.garageDocumentAccess('CREATE_DOCUMENT'),
  auditLogger.logAccess('GARAGE'),
  garageController.createDocument
);

مسیرهای مخصوص مکانیک
router.post('/garages/:garageId/mechanic/reports',
  resourceAccessControl.mechanicOperations(),
  auditLogger.logAccess('GARAGE'),
  garageController.createMechanicReport
);

مسیرهای مخصوص شاگرد
router.post('/garages/:garageId/apprentice/tasks',
  resourceAccessControl.apprenticeOperations(),
  auditLogger.logAccess('GARAGE'),
  garageController.createApprenticeTask
);

مسیرهای مربوط به پروژه‌ها
router.put('/projects/:projectId',
  resourceAccessControl.projectAccess(),
  auditLogger.logAccess('PROJECT'),
  projectController.updateProject
);

مسیرهای مربوط به شکایات
router.put('/complaints/:complaintId',
  resourceAccessControl.complaintHandler(),
  auditLogger.logAccess('COMPLAINT'),
  complaintController.handleComplaint
);
بهبود‌های اعمال شده در این نسخه:

کنترل دقیق‌تر دسترسی‌ها:

تفکیک دقیق دسترسی‌های مکانیک و شاگرد
بررسی ارتباط کاربر با گاراژ مورد نظر
محدود کردن عملیات‌های مجاز برای هر نقش


اضافه شدن validator های اختصاصی:

validateGarageAccess: بررسی دسترسی به گاراژ
validateSupplierStoreAccess: بررسی دسترسی به فروشگاه


کنترل‌های دسترسی جدید:

کنترل دسترسی به پروژه‌ها
کنترل دسترسی به شکایات
عملیات‌های مخصوص مکانیک و شاگرد


سیستم Audit Logging:

ثبت تمام دسترسی‌ها
ذخیره تغییرات (مقادیر قدیم و جدید)
ثبت زمان و کاربر انجام دهنده عملیات


اطلاعات اضافی در درخواست:

افزودن اطلاعات دسترسی به req برای استفاده در کنترلرها
ثبت زمان دسترسی
ثبت جزئیات پروفایل کاربر


پیام‌های خطای دقیق‌تر:

توضیحات مشخص برای هر نوع خطای دسترسی
جزئیات بیشتر در پیام‌های خطا



برای بهبود بیشتر می‌توان موارد زیر را اضافه کرد:

سیستم Rate Limiting: محدود کردن تعداد درخواست‌های دسترسی
Cache بیشتر: ذخیره موقت نتایج بررسی‌های دسترسی
Rollback سیستم: امکان برگشت تغییرات در صورت خطا
گزارش‌گیری: سیستم گزارش‌گیری از دسترسی‌ها و تغییرات
سیستم هشدار: اعلان در صورت تلاش‌های مکرر غیرمجاز

*/
////////////////////////////////////////////////////////////////////////////////

// src/middleware/roleManagement.js

// Cache for storing user permissions (to reduce database queries)
const permissionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Utility to check if a user has specific permissions
 */
async function hasPermission(userId, requiredPermission, resourceType, resourceId = null) {
  try {
    // Check cache first
    const cacheKey = `${userId}-${requiredPermission}-${resourceType}-${resourceId}`;
    const cachedResult = permissionCache.get(cacheKey);
    if (cachedResult && cachedResult.timestamp > Date.now() - CACHE_DURATION) {
      return cachedResult.hasPermission;
    }

    // Get user roles with their permissions
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            },
            resources: true
          }
        }
      }
    });

    // Check permissions across all roles
    for (const userRole of userRoles) {
      // Check direct role permissions
      const hasDirectPermission = userRole.role.rolePermissions.some(
        rp => rp.permission.name === requiredPermission
      );

      // Check resource-specific permissions
      const hasResourcePermission = userRole.role.resources.some(
        resource => 
          resource.resourceType === resourceType &&
          resource.permission === requiredPermission &&
          (!resourceId || resource.resourceId === resourceId)
      );

      if (hasDirectPermission || hasResourcePermission) {
        // Cache the result
        permissionCache.set(cacheKey, {
          hasPermission: true,
          timestamp: Date.now()
        });
        return true;
      }
    }

    // Cache the negative result
    permissionCache.set(cacheKey, {
      hasPermission: false,
      timestamp: Date.now()
    });
    return false;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Middleware to check if user owns the resource
 */
async function isResourceOwner(userId, resourceType, resourceId) {
  try {
    switch (resourceType) {
      case 'GARAGE':
        const garage = await prisma.garage.findUnique({
          where: { id: resourceId },
          include: { garageOwner: true }
        });
        return garage?.garageOwner?.userId === userId;

      case 'SUPPLIER_STORE':
        const store = await prisma.supplierStore.findUnique({
          where: { id: resourceId },
          include: { supplierStoreOwner: true }
        });
        return store?.supplierStoreOwner?.userId === userId;

      // Add more resource types as needed
      default:
        return false;
    }
  } catch (error) {
    console.error('Resource ownership check failed:', error);
    return false;
  }
}

/**
 * Main middleware for checking permissions
 */
function checkPermission(requiredPermission, resourceType) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id; // Assuming user is attached to req by auth middleware
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const resourceId = req.params.id || req.body.resourceId;
      const hasRequiredPermission = await hasPermission(
        userId,
        requiredPermission,
        resourceType,
        resourceId
      );

      if (hasRequiredPermission) {
        return next();
      }

      // Check if user owns the resource (owners always have full access)
      if (resourceId) {
        const isOwner = await isResourceOwner(userId, resourceType, resourceId);
        if (isOwner) {
          return next();
        }
      }

      return res.status(403).json({ error: 'Forbidden' });
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware for checking multiple permissions (ANY match)
 */
function checkAnyPermission(permissions) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const resourceId = req.params.id || req.body.resourceId;
      
      for (const { permission, resourceType } of permissions) {
        const hasPermission = await hasPermission(
          userId,
          permission,
          resourceType,
          resourceId
        );
        
        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({ error: 'Forbidden' });
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware for checking role assignment
 */
function hasRole(roleName) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userRole = await prisma.userRole.findFirst({
        where: {
          userId,
          role: { name: roleName }
        }
      });

      if (userRole) {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden' });
    } catch (error) {
      console.error('Role check middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Utility middleware for garage-specific operations
const garagePermissions = {
  async canModifyGarage(req, res, next) {
    try {
      const userId = req.user?.id;
      const garageId = req.params.garageId || req.body.garageId;

      if (!userId || !garageId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is garage owner
      const isOwner = await isResourceOwner(userId, 'GARAGE', garageId);
      if (isOwner) {
        return next();
      }

      // Check if user is a mechanic in this garage
      const mechanic = await prisma.businessProfile.findFirst({
        where: {
          userId,
          mechanicGarageId: garageId
        }
      });

      if (mechanic) {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden' });
    } catch (error) {
      console.error('Garage permission check failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Add more garage-specific permission checks as needed
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  hasRole,
  garagePermissions
};

/*
Here's how to use the middleware in your Express routes:
javascriptCopyconst { checkPermission, checkAnyPermission, hasRole, garagePermissions } = require('./middleware/roleManagement');

Example routes with permission checks
router.post('/garages', 
  checkPermission('CREATE', 'GARAGE'),
  garageController.createGarage
);

router.put('/garages/:id',
  checkPermission('UPDATE', 'GARAGE'),
  garageController.updateGarage
);

Check if user can modify garage documents
router.put('/garages/:garageId/documents',
  garagePermissions.canModifyGarage,
  garageController.updateDocuments
);

Route accessible by either mechanics or garage owners
router.get('/garages/:id/metrics',
  checkAnyPermission([
    { permission: 'READ', resourceType: 'GARAGE' },
    { permission: 'READ', resourceType: 'METRIC' }
  ]),
  garageController.getMetrics
);

Role-based route
router.post('/suppliers',
  hasRole('SUPPLIER'),
  supplierController.createSupplier
);
Key features of this middleware system:

Permission Caching: Implements a caching system to reduce database queries
Resource Ownership: Automatically checks resource ownership
Flexible Permission Checking: Supports both single and multiple permission checks
Role-Based Checks: Includes role-specific middleware
Resource-Type Support: Handles different resource types (GARAGE, SUPPLIER_STORE, etc.)
Custom Garage Permissions: Special handling for garage-specific operations

To enhance this system, you might want to:

Add more specific permission checks for different resources
Implement role inheritance
Add audit logging for permission checks
Expand the caching mechanism
Add more specific error messages
Implement rate limiting for permission checks
*/