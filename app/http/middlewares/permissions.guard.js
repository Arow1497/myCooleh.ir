const createError = require('http-errors');
const { PrismaClient, ResourcePermission } = require('@prisma/client');
const prisma = new PrismaClient();

// Enhanced permission constants with more granular access levels
const PERMISSIONS = {
  ALL: 'all',
  NONE: 'none',
  RESOURCE_PERMISSIONS: ResourcePermission,
  ACCESS_LEVELS: {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin'
  }
};

/**
 * Enhanced audit logging function with additional metadata
 */
const createAuditLog = async ({
  userId,
  clientId = null,
  action,
  resourceType = null,
  resourceId = null,
  oldValue = null,
  newValue = null,
  createdBy,
  metadata = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    await prisma.permissionAuditLog.create({
      data: {
        userId,
        clientId,
        action,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        createdBy,
        metadata,
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    throw error;
  }
};

/**
 * Cache manager for permissions
 */
class PermissionCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes TTL
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}

const permissionCache = new PermissionCache();

/**
 * Enhanced middleware to check user permissions
 * @param {string[]} requiredPermissions - Array of required permissions
 * @param {string} resourceType - Type of resource being accessed
 */
const checkPermission = (requiredPermissions = [], resourceType = null, options = {}) => {
  const {
    strict = false,  // If true, user must have ALL permissions
    useCache = true, // Enable/disable permission caching
    customMessage = null // Custom error message
  } = options;

  return async (req, res, next) => {
    try {
      const allPermissions = requiredPermissions.flat(2);
      const user = req.user;

      if (!user) {
        throw createError.Unauthorized('کاربر احراز هویت نشده است');
      }

      // Check cache first
      const cacheKey = `permissions:${user.id}:${resourceType}`;
      let userPermissions;

      if (useCache) {
        userPermissions = permissionCache.get(cacheKey);
      }

      if (!userPermissions) {
        const userRolesWithPermissions = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        });

        userPermissions = userRolesWithPermissions.flatMap(userRole => 
          userRole.role.permissions.map(permission => permission.name)
        );

        if (useCache) {
          permissionCache.set(cacheKey, userPermissions);
        }
      }

      const hasAccess = userPermissions.includes(PERMISSIONS.ALL) || 
        (strict ? 
          allPermissions.every(permission => userPermissions.includes(permission)) :
          allPermissions.some(permission => userPermissions.includes(permission)));

      // Enhanced audit logging
      await createAuditLog({
        userId: user.id,
        action: 'PERMISSION_CHECK',
        resourceType,
        resourceId: req.params.id ? parseInt(req.params.id) : null,
        oldValue: { requiredPermissions: allPermissions },
        newValue: { granted: hasAccess },
        createdBy: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          path: req.path,
          method: req.method,
          strict,
          useCache
        }
      });

      if (hasAccess) {
        return next();
      }

      throw createError.Forbidden(customMessage || 'شما به این قسمت دسترسی ندارید');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check hierarchical permissions
 */
const checkHierarchicalPermission = async (userId, permission, resourceType, resourceId) => {
  try {
    const resource = await prisma[resourceType].findUnique({
      where: { id: resourceId },
      include: { parent: true }
    });

    if (!resource) return false;

    // Check permission for current resource
    const hasPermission = await checkResourcePermission(userId, permission, resourceType);
    if (hasPermission) return true;

    // Check parent resources recursively
    if (resource.parent) {
      return checkHierarchicalPermission(userId, permission, resourceType, resource.parent.id);
    }

    return false;
  } catch (error) {
    console.error('Error checking hierarchical permission:', error);
    return false;
  }
};

/**
 * Create a new role with permissions
 */
const createRole = async (name, description, permissionIds, adminUserId) => {
  try {
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          connect: permissionIds.map(id => ({ id }))
        }
      }
    });

    await createAuditLog({
      userId: adminUserId,
      action: 'CREATE_ROLE',
      resourceType: 'ROLE',
      resourceId: role.id,
      newValue: { name, description, permissionIds },
      createdBy: adminUserId
    });

    return role;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

/**
 * Batch update permissions for multiple users
 */
const batchUpdateUserPermissions = async (userIds, roleIds, adminUserId) => {
  try {
    await prisma.$transaction(async (prisma) => {
      for (const userId of userIds) {
        const currentRoles = await prisma.userRole.findMany({
          where: { userId },
          select: { roleId: true }
        });

        await prisma.userRole.deleteMany({
          where: { userId }
        });

        await prisma.userRole.createMany({
          data: roleIds.map(roleId => ({
            userId,
            roleId
          }))
        });

        await createAuditLog({
          userId,
          action: 'BATCH_UPDATE_ROLES',
          resourceType: 'USER_ROLES',
          oldValue: { roleIds: currentRoles.map(r => r.roleId) },
          newValue: { roleIds },
          createdBy: adminUserId
        });
      }
    });

    return true;
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};

/**
 * Get inherited permissions for a user
 */
const getInheritedPermissions = async (userId) => {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            parentRole: {
              include: {
                permissions: true
              }
            },
            permissions: true
          }
        }
      }
    });

    const inheritedPermissions = new Set();
    
    userRoles.forEach(userRole => {
      // Add direct permissions
      userRole.role.permissions.forEach(permission => 
        inheritedPermissions.add(permission.name)
      );
      
      // Add inherited permissions from parent roles
      let currentRole = userRole.role;
      while (currentRole.parentRole) {
        currentRole.parentRole.permissions.forEach(permission =>
          inheritedPermissions.add(permission.name)
        );
        currentRole = currentRole.parentRole;
      }
    });

    return Array.from(inheritedPermissions);
  } catch (error) {
    console.error('Error getting inherited permissions:', error);
    return [];
  }
};

/**
 * Get all permissions for a user
 */
const getUserPermissions = async (userId) => {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });
  
      return [...new Set(userRoles.flatMap(userRole => 
        userRole.role.permissions.map(permission => permission.name)
      ))];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  };


/**
 * Check if a client has specific permissions
 */
const hasClientPermissions = async (clientId, permissions = []) => {
    try {
      const clientRoles = await prisma.clientRole.findMany({
        where: { clientId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }                                    
        }                                      
      });                                      
  
      const clientPermissions = clientRoles.flatMap(clientRole => 
        clientRole.role.permissions.map(permission => permission.name)
      );
  
      return permissions.every(permission => clientPermissions.includes(permission));
    } catch (error) {
      console.error('Error checking client permissions:', error);
      return false;
    }
  };


/**
 * Check if a user has specific permissions
 */
const hasPermissions = async (userId, permissions = []) => {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });
  
      const userPermissions = userRoles.flatMap(userRole => 
        userRole.role.permissions.map(permission => permission.name)
      );
  
      return permissions.every(permission => userPermissions.includes(permission));
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  };

  /**
   * Assign roles to a user with audit logging
   * @param {number} targetUserId - User to assign roles to
   * @param {number[]} roleIds - Roles to assign
   * @param {number} adminUserId - User performing the action
   */
  const assignRolesToUser = async (targetUserId, roleIds, adminUserId) => {
    try {
      // Get current roles for comparison
      const currentRoles = await prisma.userRole.findMany({
        where: { userId: targetUserId },
        select: { roleId: true }
      });
      const currentRoleIds = currentRoles.map(r => r.roleId);
  
      await prisma.$transaction(async (prisma) => {
        // Remove existing roles
        await prisma.userRole.deleteMany({
          where: { userId: targetUserId }
        });
  
        // Assign new roles
        for (const roleId of roleIds) {
          await prisma.userRole.create({
            data: {
              userId: targetUserId,
              roleId
            }
          });
        }
  
        // Create audit log
        await createAuditLog({
          userId: targetUserId,
          action: 'MODIFY_ROLES',
          resourceType: 'USER_ROLES',
          oldValue: { roleIds: currentRoleIds },
          newValue: { roleIds },
          createdBy: adminUserId
        });
      });
  
      return true;
    } catch (error) {
      console.error('Error assigning roles:', error);
      return false;
    }
  };
  
  /**
   * Check resource-specific permissions
   * @param {number} userId - User ID
   * @param {ResourcePermission} permission - Required permission
   * @param {string} resourceType - Type of resource
   */
  const checkResourcePermission = async (userId, permission, resourceType) => {
    try {
      const userPermissions = await getUserPermissions(userId);
      const resourcePermission = `${resourceType}:${permission}`;
      
      return userPermissions.includes(PERMISSIONS.ALL) || 
             userPermissions.includes(resourcePermission);
    } catch (error) {
      console.error('Error checking resource permission:', error);
      return false;
    }
  };
  
  /**
   * Modify permissions for a role with audit logging
   * @param {number} roleId - Role to modify
   * @param {number[]} permissionIds - New permissions
   * @param {number} adminUserId - User performing the action
   */
  const modifyRolePermissions = async (roleId, permissionIds, adminUserId) => {
    try {
      const currentPermissions = await prisma.permission.findMany({
        where: {
          roles: {
            some: {
              id: roleId
            }
          }
        }
      });
  
      const currentPermissionIds = currentPermissions.map(p => p.id);
  
      await prisma.$transaction(async (prisma) => {
        // Update role permissions
        await prisma.role.update({
          where: { id: roleId },
          data: {
            permissions: {
              set: permissionIds.map(id => ({ id }))
            }
          }
        });
  
        // Create audit log
        await createAuditLog({
          userId: adminUserId,
          action: 'MODIFY_PERMISSIONS',
          resourceType: 'ROLE_PERMISSIONS',
          resourceId: roleId,
          oldValue: { permissionIds: currentPermissionIds },
          newValue: { permissionIds },
          createdBy: adminUserId
        });
      });
  
      return true;
    } catch (error) {
      console.error('Error modifying role permissions:', error);
      return false;
    }
  };
  
  /**
   * Get permission audit logs for a specific user or client
   * @param {Object} params - Search parameters
   */
  const getPermissionAuditLogs = async ({
    userId = null,
    clientId = null,
    action = null,
    startDate = null,
    endDate = null,
    limit = 50,
    offset = 0
  }) => {
    try {
      const where = {};
      if (userId) where.userId = userId;
      if (clientId) where.clientId = clientId;
      if (action) where.action = action;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }
  
      const logs = await prisma.permissionAuditLog.findMany({
        where,
        include: {
          user: true,
          client: true
        },
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        }
      });
  
      const total = await prisma.permissionAuditLog.count({ where });
  
      return {
        logs,
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return null;
    }
  };
  
module.exports = {
  checkPermission,
  assignRolesToUser,
  checkResourcePermission,
  modifyRolePermissions,
  getPermissionAuditLogs,
  checkHierarchicalPermission,
  createRole,
  batchUpdateUserPermissions,
  getInheritedPermissions,
  getUserPermissions,
  hasClientPermissions,
  hasPermissions,
  PERMISSIONS,
  ResourcePermission
};