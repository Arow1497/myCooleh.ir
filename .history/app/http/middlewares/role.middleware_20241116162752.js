const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Permission levels for different actions
 */
const PERMISSIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage', // Super permission
};

/**
 * Default roles and their permissions
 */
const DEFAULT_ROLES = {
  ADMIN: {
    name: 'admin',
    permissions: Object.values(PERMISSIONS),
  },
  USER: {
    name: 'user',
    permissions: [PERMISSIONS.READ],
  },
  MANAGER: {
    name: 'manager',
    permissions: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE],
  },
  EDITOR: {
    name: 'editor',
    permissions: [PERMISSIONS.READ, PERMISSIONS.UPDATE],
  },
};

/**
 * Cache for storing user roles and permissions
 * In production, consider using Redis or similar caching solution
 */
const userPermissionsCache = new Map();

/**
 * Clear user permissions cache
 * @param {string} userId 
 */
const clearUserPermissionsCache = (userId) => {
  userPermissionsCache.delete(userId);
};

/**
 * Get user permissions from cache or database
 * @param {string} userId 
 * @returns {Promise<string[]>}
 */
const getUserPermissions = async (userId) => {
  // Check cache first
  if (userPermissionsCache.has(userId)) {
    return userPermissionsCache.get(userId);
  }

  try {
    // Get user with roles and permissions from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Combine all permissions from all roles
    const permissions = new Set();
    user.roles.forEach(role => {
      role.permissions.forEach(permission => {
        permissions.add(permission.name);
      });
    });

    // Cache the permissions
    const permissionsArray = Array.from(permissions);
    userPermissionsCache.set(userId, permissionsArray);

    return permissionsArray;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    throw error;
  }
};

/**
 * Check if user has required role
 * @param {string|string[]} roles - Required role(s)
 */
const hasRole = (roles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id; // Assuming user is attached to req by authentication middleware
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true }
      });

      const userRoles = user.roles.map(role => role.name);
      const requiredRoles = Array.isArray(roles) ? roles : [roles];

      if (!requiredRoles.some(role => userRoles.includes(role))) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient role permissions'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has required permission
 * @param {string|string[]} permissions - Required permission(s)
 */
const hasPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const userPermissions = await getUserPermissions(userId);
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

      // Check if user has admin permission or required permissions
      if (!userPermissions.includes(PERMISSIONS.MANAGE) && 
          !requiredPermissions.every(permission => userPermissions.includes(permission))) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Resource-based permission check
 * @param {string} resource - Resource name (e.g., 'post', 'user')
 * @param {string} action - Action to perform (create, read, update, delete)
 */
const checkResourcePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const userPermissions = await getUserPermissions(userId);
      const requiredPermission = `${resource}:${action}`;

      // Check if user has admin permission or specific resource permission
      if (!userPermissions.includes(PERMISSIONS.MANAGE) && 
          !userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          status: 'error',
          message: `Insufficient permissions for ${action} on ${resource}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Ownership check middleware
 * @param {string} resource - Resource name in database
 * @param {string} userField - Field name that references the user (default: 'userId')
 */
const isOwner = (resource, userField = 'userId') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const resourceId = req.params.id;

      if (!userId || !resourceId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const item = await prisma[resource].findUnique({
        where: { id: parseInt(resourceId) }
      });

      if (!item) {
        return res.status(404).json({
          status: 'error',
          message: 'Resource not found'
        });
      }

      if (item[userField].toString() !== userId.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You do not own this resource'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Combine multiple permission checks
 * @param {...Function} middlewares 
 */
const combinePermissions = (...middlewares) => {
  return async (req, res, next) => {
    try {
      for (const middleware of middlewares) {
        await new Promise((resolve, reject) => {
          middleware(req, res, (error) => {
            if (error) reject(error);
            resolve();
          });
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Utility function to initialize roles and permissions
const initializeRolesAndPermissions = async () => {
  try {
    // Create default permissions
    for (const permission of Object.values(PERMISSIONS)) {
      await prisma.permission.upsert({
        where: { name: permission },
        update: {},
        create: { name: permission }
      });
    }

    // Create default roles with their permissions
    for (const [roleName, roleData] of Object.entries(DEFAULT_ROLES)) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {},
        create: { name: roleData.name }
      });

      // Assign permissions to role
      for (const permission of roleData.permissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission
          }
        });
      }
    }

    console.log('Roles and permissions initialized successfully');
  } catch (error) {
    console.error('Error initializing roles and permissions:', error);
    throw error;
  }
};

module.exports = {
  PERMISSIONS,
  DEFAULT_ROLES,
  hasRole,
  hasPermission,
  checkResourcePermission,
  isOwner,
  combinePermissions,
  clearUserPermissionsCache,
  initializeRolesAndPermissions
};


// این middleware قابلیت‌های زیر را فراهم می‌کند:
// مدیریت نقش‌ها (Roles):

// نقش‌های پیش‌فرض (ADMIN, USER, MANAGER, EDITOR)
// امکان بررسی نقش‌های کاربر
// مدیریت مجوزها (Permissions):

// مجوزهای پایه (CREATE, READ, UPDATE, DELETE, MANAGE)
// بررسی مجوزهای کاربر
// کش کردن مجوزها برای بهبود کارایی
// کنترل دسترسی به منابع:

// بررسی مالکیت منابع
// مجوزهای مبتنی بر منابع
// ترکیب چندین بررسی مجوز

// نحوه استفاده:
// const { 
//   hasRole, 
//   hasPermission, 
//   checkResourcePermission, 
//   isOwner, 
//   combinePermissions,
//   PERMISSIONS 
// } = require('./middleware/auth.middleware');

// بررسی نقش
// app.get('/admin', hasRole('admin'), (req, res) => {
//   res.json({ message: 'Admin panel' });
// });

// بررسی مجوز
// app.post('/posts', hasPermission(PERMISSIONS.CREATE), (req, res) => {
  // ایجاد پست
// });

// بررسی مجوز برای منبع خاص
// app.put('/posts/:id', checkResourcePermission('post', 'update'), (req, res) => {
  // بروزرسانی پست
// });

// بررسی مالکیت
// app.delete('/posts/:id', isOwner('post'), (req, res) => {
  // حذف پست
// });

// ترکیب چند بررسی
// app.put('/posts/:id', 
//   combinePermissions(
//     hasRole('editor'),
//     checkResourcePermission('post', 'update'),
//     isOwner('post')
//   ),
//   (req, res) => {
    // بروزرسانی پست
//   }
// );
// برای استفاده از این سیستم، باید جدول‌های مربوطه را در Prisma Schema تعریف کنید:


// model User {
//   id        Int      @id @default(autoincrement())
//   email     String   @unique
//   roles     Role[]   @relation("UserRoles")
  // سایر فیلدها
// }

// model Role {
//   id          Int       @id @default(autoincrement())
//   name        String    @unique
//   users       User[]    @relation("UserRoles")
//   permissions RolePermission[]
// }

// model Permission {
//   id          Int       @id @default(autoincrement())
//   name        String    @unique
//   roles       RolePermission[]
// }

// model RolePermission {
//   role        Role      @relation(fields: [roleId], references: [id])
//   roleId      Int
//   permission  Permission @relation(fields: [permissionId], references: [id])
//   permissionId Int

//   @@id([roleId, permissionId])
// }
// این سیستم یک راه‌حل کامل و انعطاف‌پذیر برای مدیریت نقش‌ها و مجوزها در اپلیکیشن شما فراهم می‌کند.