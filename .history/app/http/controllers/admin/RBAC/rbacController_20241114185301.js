const createHttpError = require('http-errors');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Controller = require('../../controller');
const { 
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  createPermissionSchema
} = require("../../../validators/admin/rbac.schema"); // You'll need to create these schemas

class RBACController extends Controller {

  // Role Management
  async createRole(req, res, next) {
    try {
      const { name, description, permissions } = await createRoleSchema.validateAsync(req.body);
      
      const existingRole = await prisma.role.findUnique({
        where: { name }
      });
      
      if (existingRole) {
        throw createHttpError.BadRequest("Role with this name already exists");
      }
      
      const role = await prisma.role.create({
        data: {
          name,
          description,
          permissions: {
            connect: permissions.map(id => ({ id }))
          }
        },
        include: {
          permissions: true
        }
      });
      
      return res.status(201).json({
        status: 201,
        success: true,
        message: "Role created successfully",
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, permissions } = await updateRoleSchema.validateAsync(req.body);
      
      const role = await prisma.role.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!role) {
        throw createHttpError.NotFound("Role not found");
      }
      
      const updatedRole = await prisma.role.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          permissions: {
            set: permissions.map(id => ({ id }))
          }
        },
        include: {
          permissions: true
        }
      });
      
      return res.json({
        status: 200,
        success: true,
        message: "Role updated successfully",
        data: updatedRole
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req, res, next) {
    try {
      const { id } = req.params;
      
      const role = await prisma.role.findUnique({
        where: { id: parseInt(id) },
        include: {
          users: true,
          clients: true
        }
      });
      
      if (!role) {
        throw createHttpError.NotFound("Role not found");
      }
      
      if (role.users.length > 0 || role.clients.length > 0) {
        throw createHttpError.BadRequest("Cannot delete role with assigned users or clients");
      }
      
      await prisma.role.delete({
        where: { id: parseInt(id) }
      });
      
      return res.json({
        status: 200,
        success: true,
        message: "Role deleted successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  // Permission Management
  async createPermission(req, res, next) {
    try {
      const { name, description } = await createPermissionSchema.validateAsync(req.body);
      
      const existingPermission = await prisma.permission.findUnique({
        where: { name }
      });
      
      if (existingPermission) {
        throw createHttpError.BadRequest("Permission with this name already exists");
      }
      
      const permission = await prisma.permission.create({
        data: {
          name,
          description
        }
      });
      
      return res.status(201).json({
        status: 201,
        success: true,
        message: "Permission created successfully",
        data: permission
      });
    } catch (error) {
      next(error);
    }
  }


  // Role Assignment
  async assignRoleToUser(req, res, next) {
    try {
      const { userId, roleId } = await assignRoleSchema.validateAsync(req.body);
      
      // Check if user and role exist
      const [user, role] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.role.findUnique({ where: { id: roleId } })
      ]);
      
      if (!user) throw createHttpError.NotFound("User not found");
      if (!role) throw createHttpError.NotFound("Role not found");
      
      // Create user role assignment with audit log
      await prisma.$transaction(async (prisma) => {
        const userRole = await prisma.userRole.create({
          data: {
            userId,
            roleId
          }
        });
        
        await prisma.permissionAuditLog.create({
          data: {
            userId,
            action: "GRANT_ROLE",
            resourceType: "USER",
            resourceId: userId,
            newValue: { roleId },
            createdBy: req.user.id // Assuming you have the authenticated user in req.user
          }
        });
        
        return userRole;
      });
      
      return res.json({
        status: 200,
        success: true,
        message: "Role assigned successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  // Role Assignment for Clients
  async assignRoleToClient(req, res, next) {
    try {
      const { clientId, roleId } = await assignRoleSchema.validateAsync(req.body);
      
      const [client, role] = await Promise.all([
        prisma.client.findUnique({ where: { id: clientId } }),
        prisma.role.findUnique({ where: { id: roleId } })
      ]);
      
      if (!client) throw createHttpError.NotFound("Client not found");
      if (!role) throw createHttpError.NotFound("Role not found");
      
      await prisma.$transaction(async (prisma) => {
        const clientRole = await prisma.clientRole.create({
          data: {
            clientId,
            roleId
          }
        });
        
        await prisma.permissionAuditLog.create({
          data: {
            clientId,
            action: "GRANT_ROLE",
            resourceType: "CLIENT",
            resourceId: clientId,
            newValue: { roleId },
            createdBy: req.user.id
          }
        });
        
        return clientRole;
      });
      
      return res.json({
        status: 200,
        success: true,
        message: "Role assigned to client successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  // Query Endpoints
  async getRoles(req, res, next) {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: true,
          _count: {
            select: {
              users: true,
              clients: true
            }
          }
        }
      });
      
      return res.json({
        status: 200,
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  async getPermissions(req, res, next) {
    try {
      const permissions = await prisma.permission.findMany({
        include: {
          roles: true
        }
      });
      
      return res.json({
        status: 200,
        success: true,
        data: permissions
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserRoles(req, res, next) {
    try {
      const { userId } = req.params;
      
      const userRoles = await prisma.userRole.findMany({
        where: { userId: parseInt(userId) },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });
      
      return res.json({
        status: 200,
        success: true,
        data: userRoles
      });
    } catch (error) {
      next(error);
    }
  }

  async getClientRoles(req, res, next) {
    try {
      const { clientId } = req.params;
      
      const clientRoles = await prisma.clientRole.findMany({
        where: { clientId: parseInt(clientId) },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });
      
      return res.json({
        status: 200,
        success: true,
        data: clientRoles
      });
    } catch (error) {
      next(error);
    }
  }

  // Audit Log Query
  async getPermissionAuditLog(req, res, next) {
    try {
      const { userId, clientId, startDate, endDate } = req.query;
      
      const where = {};
      if (userId) where.userId = parseInt(userId);
      if (clientId) where.clientId = parseInt(clientId);
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }
      
      const auditLogs = await prisma.permissionAuditLog.findMany({
        where,
        include: {
          user: true,
          client: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return res.json({
        status: 200,
        success: true,
        data: auditLogs
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  RBACController: new RBACController()
};




//getAllPermissions}
//removePermission
//updatePermissionById
//findPermissionWithName
//findPermissionWithID

// دو نوع مراجعه کننده به بلتفرم داریم یا یوزر ما هستند یا میخان دوره برگذار کنن فریلنسر هستن میخان تبلیغ 
// انجام بدن اینها هم باید بتونن توی \لتفرم به این بخش ها دسترسی داشته باشن

// این کنترلر RBAC شامل تمام اندپوینت‌های اصلی مورد نیاز برای مدیریت نقش‌ها و دسترسی‌ها است.
//  اندپوینت‌های اصلی عبارتند از:

// مدیریت نقش‌ها (Roles):
// createRole: ایجاد نقش جدید
// updateRole: بروزرسانی نقش موجود
// deleteRole: حذف نقش
// getRoles: دریافت لیست نقش‌ها


// مدیریت دسترسی‌ها (Permissions):
// createPermission: ایجاد دسترسی جدید
// getPermissions: دریافت لیست دسترسی‌ها


// تخصیص نقش:
// assignRoleToUser: تخصیص نقش به کاربر
// assignRoleToClient: تخصیص نقش به مشتری
// getUserRoles: دریافت نقش‌های یک کاربر
// getClientRoles: دریافت نقش‌های یک مشتری


// گزارش‌گیری و ممیزی:
// getPermissionAuditLog: دریافت لاگ تغییرات دسترسی‌ها

