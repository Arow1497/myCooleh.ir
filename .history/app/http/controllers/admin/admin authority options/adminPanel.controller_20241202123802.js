const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AdminPanelController extends Controller {

    /*
    *************************************************************
    *  GeneralController
    *************************************************************
    */
    // Get system statistics and overview
    async getSystemOverview(req, res, next) {
        try {
            const userId = req.user.id;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            // Gather system statistics
            const [
                totalUsers,
                activeUsers,
                totalSupportTickets,
                openSupportTickets,
                totalConversations
            ] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({
                    where: { isActive: true }
                }),
                prisma.conversation.count({
                    where: { type: 'SUPPORT' }
                }),
                prisma.conversation.count({
                    where: {
                        type: 'SUPPORT',
                        isActive: true
                    }
                }),
                prisma.conversation.count()
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    statistics: {
                        totalUsers,
                        activeUsers,
                        totalSupportTickets,
                        openSupportTickets,
                        totalConversations
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Manage user accounts (suspend/activate)
    async manageUserAccount(req, res, next) {
        try {
            const { targetUserId } = req.params;
            const { action, reason } = req.body;
            const adminId = req.user.id;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: adminId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            // Check if target user exists
            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId }
            });

            if (!targetUser) {
                throw createError(HttpStatus.NOT_FOUND, "User not found");
            }

            // Prevent actions on other admins
            const targetProfile = await prisma.socialProfile.findFirst({
                where: { userId: targetUserId }
            });

            if (targetProfile.role === 'ADMIN') {
                throw createError(HttpStatus.FORBIDDEN, "Cannot modify admin accounts");
            }

            // Update user status
            const updatedUser = await prisma.user.update({
                where: { id: targetUserId },
                data: {
                    isActive: action === 'activate',
                    metadata: {
                        ...targetUser.metadata,
                        lastStatusUpdate: {
                            action,
                            reason,
                            updatedBy: adminId,
                            updatedAt: new Date()
                        }
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: `User ${action}d successfully`,
                data: { user: updatedUser }
            });
        } catch (error) {
            next(error);
        }
    }

    // Manage admin roles
    async manageAdminRoles(req, res, next) {
        try {
            const { targetUserId } = req.params;
            const { action } = req.body; // 'grant' or 'revoke'
            const adminId = req.user.id;

            // Verify super admin status
            const isSuperAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: adminId,
                    role: 'ADMIN',
                    metadata: {
                        path: ['isSuperAdmin'],
                        equals: true
                    }
                }
            });

            if (!isSuperAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Only super admins can manage admin roles");
            }

            // Update user role
            const updatedProfile = await prisma.socialProfile.update({
                where: { userId: targetUserId },
                data: {
                    role: action === 'grant' ? 'ADMIN' : 'USER',
                    metadata: {
                        roleUpdatedBy: adminId,
                        roleUpdatedAt: new Date()
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: `Admin role ${action}ed successfully`,
                data: { profile: updatedProfile }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get admin activity logs
    async getAdminActivityLogs(req, res, next) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const logs = await prisma.adminActivityLog.findMany({
                include: {
                    admin: {
                        include: {
                            user: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            });

            const total = await prisma.adminActivityLog.count();

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    logs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get system configuration
    async getSystemConfig(req, res, next) {
        try {
            const userId = req.user.id;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const config = await prisma.systemConfig.findFirst();

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { config }
            });
        } catch (error) {
            next(error);
        }
    }

    // Update system configuration
    async updateSystemConfig(req, res, next) {
        try {
            const userId = req.user.id;
            const { config } = req.body;

            // Verify super admin status
            const isSuperAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN',
                    metadata: {
                        path: ['isSuperAdmin'],
                        equals: true
                    }
                }
            });

            if (!isSuperAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Only super admins can update system configuration");
            }

            const updatedConfig = await prisma.systemConfig.update({
                where: { id: 1 }, // Assuming single config record
                data: {
                    ...config,
                    metadata: {
                        lastUpdatedBy: userId,
                        lastUpdatedAt: new Date()
                    }
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "System configuration updated successfully",
                data: { config: updatedConfig }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get admin dashboard metrics
    async getDashboardMetrics(req, res, next) {
        try {
            const userId = req.user.id;
            const { timeframe } = req.query; // 'daily', 'weekly', 'monthly'

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const startDate = new Date();
            switch (timeframe) {
                case 'weekly':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'monthly':
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                default: // daily
                    startDate.setDate(startDate.getDate() - 1);
            }

            const [
                newUsers,
                newTickets,
                resolvedTickets,
                activeChats
            ] = await Promise.all([
                prisma.user.count({
                    where: {
                        createdAt: {
                            gte: startDate
                        }
                    }
                }),
                prisma.conversation.count({
                    where: {
                        type: 'SUPPORT',
                        createdAt: {
                            gte: startDate
                        }
                    }
                }),
                prisma.conversation.count({
                    where: {
                        type: 'SUPPORT',
                        isActive: false,
                        metadata: {
                            path: ['closedAt'],
                            gte: startDate
                        }
                    }
                }),
                prisma.conversation.count({
                    where: {
                        isActive: true,
                        lastMessageAt: {
                            gte: startDate
                        }
                    }
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    metrics: {
                        newUsers,
                        newTickets,
                        resolvedTickets,
                        activeChats,
                        timeframe
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
    /*
    *************************************************************
    *  AuditController
    *************************************************************
    */
    // Get system audit logs
    async getAuditLogs(req, res, next) {
        try {
            const userId = req.user.id;
            const { startDate, endDate, type, page = 1, limit = 20 } = req.query;
            const skip = (page - 1) * limit;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const whereClause = {
                ...(startDate && {
                    createdAt: {
                        gte: new Date(startDate)
                    }
                }),
                ...(endDate && {
                    createdAt: {
                        lte: new Date(endDate)
                    }
                }),
                ...(type && { type })
            };

            const [logs, total] = await Promise.all([
                prisma.auditLog.findMany({
                    where: whereClause,
                    include: {
                        user: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip,
                    take: limit
                }),
                prisma.auditLog.count({
                    where: whereClause
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    logs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get specific audit log details
    async getAuditLogDetails(req, res, next) {
        try {
            const { logId } = req.params;
            const userId = req.user.id;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const log = await prisma.auditLog.findUnique({
                where: { id: logId },
                include: {
                    user: true,
                    metadata: true
                }
            });

            if (!log) {
                throw createError(HttpStatus.NOT_FOUND, "Audit log not found");
            }

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { log }
            });
        } catch (error) {
            next(error);
        }
    }
    /*
    *************************************************************
    *  BackupController
    *************************************************************
    */
     // Initiate system backup
     async initiateBackup(req, res, next) {
        try {
            const userId = req.user.id;
            const { type, description } = req.body; // 'full', 'partial'

            // Verify super admin status
            const isSuperAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN',
                    metadata: {
                        path: ['isSuperAdmin'],
                        equals: true
                    }
                }
            });

            if (!isSuperAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Only super admins can initiate backups");
            }

            const backup = await prisma.systemBackup.create({
                data: {
                    type,
                    description,
                    initiatedBy: userId,
                    status: 'PENDING'
                }
            });

            // Trigger async backup process
            this.processBackupAsync(backup.id);

            return res.status(HttpStatus.ACCEPTED).json({
                statusCode: HttpStatus.ACCEPTED,
                message: "Backup initiated",
                data: { backupId: backup.id }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get backup status
    async getBackupStatus(req, res, next) {
        try {
            const { backupId } = req.params;
            const userId = req.user.id;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const backup = await prisma.systemBackup.findUnique({
                where: { id: backupId }
            });

            if (!backup) {
                throw createError(HttpStatus.NOT_FOUND, "Backup not found");
            }

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { backup }
            });
        } catch (error) {
            next(error);
        }
    }

    // List all backups
    async listBackups(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20 } = req.query;
            const skip = (page - 1) * limit;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const [backups, total] = await Promise.all([
                prisma.systemBackup.findMany({
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip,
                    take: limit
                }),
                prisma.systemBackup.count()
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    backups,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
    /*
    *************************************************************
    *  ReportingController
    *************************************************************
    */
    // Generate system performance report
    async generateSystemReport(req, res, next) {
        try {
            const userId = req.user.id;
            const { startDate, endDate, metrics } = req.body;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const report = await prisma.systemReport.create({
                data: {
                    generatedBy: userId,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    metrics,
                    status: 'PROCESSING'
                }
            });

            // Trigger async report generation
            this.generateReportAsync(report.id);

            return res.status(HttpStatus.ACCEPTED).json({
                statusCode: HttpStatus.ACCEPTED,
                message: "Report generation started",
                data: { reportId: report.id }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get report status and results
    async getReportStatus(req, res, next) {
        try {
            const { reportId } = req.params;
            const userId = req.user.id;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const report = await prisma.systemReport.findUnique({
                where: { id: reportId }
            });

            if (!report) {
                throw createError(HttpStatus.NOT_FOUND, "Report not found");
            }

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { report }
            });
        } catch (error) {
            next(error);
        }
    }

    // Export report data
    async exportReport(req, res, next) {
        try {
            const { reportId } = req.params;
            const { format } = req.query; // 'csv', 'pdf', 'excel'
            const userId = req.user.id;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const report = await prisma.systemReport.findUnique({
                where: { id: reportId }
            });

            if (!report) {
                throw createError(HttpStatus.NOT_FOUND, "Report not found");
            }

            // Generate export file
            const exportFile = await this.generateExportFile(report, format);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { downloadUrl: exportFile.url }
            });
        } catch (error) {
            next(error);
        }
    }
    /*
    *************************************************************
    *  SecurityController
    *************************************************************
    */
    // Get security logs
    async getSecurityLogs(req, res, next) {
        try {
            const userId = req.user.id;
            const { startDate, endDate, type, page = 1, limit = 20 } = req.query;
            const skip = (page - 1) * limit;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const whereClause = {
                ...(startDate && {
                    timestamp: {
                        gte: new Date(startDate)
                    }
                }),
                ...(endDate && {
                    timestamp: {
                        lte: new Date(endDate)
                    }
                }),
                ...(type && { type })
            };

            const [logs, total] = await Promise.all([
                prisma.securityLog.findMany({
                    where: whereClause,
                    include: {
                        user: true
                    },
                    orderBy: {
                        timestamp: 'desc'
                    },
                    skip,
                    take: limit
                }),
                prisma.securityLog.count({
                    where: whereClause
                })
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    logs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Update security settings
    async updateSecuritySettings(req, res, next) {
        try {
            const userId = req.user.id;
            const { settings } = req.body;

            // Verify super admin status
            const isSuperAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN',
                    metadata: {
                        path: ['isSuperAdmin'],
                        equals: true
                    }
                }
            });

            if (!isSuperAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Only super admins can update security settings");
            }

            const updatedSettings = await prisma.securitySettings.update({
                where: { id: 1 }, // Assuming single settings record
                data: {
                    ...settings,
                    lastUpdatedBy: userId,
                    lastUpdatedAt: new Date()
                }
            });

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: "Security settings updated successfully",
                data: { settings: updatedSettings }
            });
        } catch (error) {
            next(error);
        }
    }

    // Block IP address
    async blockIPAddress(req, res, next) {
        try {
            const userId = req.user.id;
            const { ip, reason, duration } = req.body;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const blockedIP = await prisma.blockedIP.create({
                data: {
                    ip,
                    reason,
                    blockedBy: userId,
                    expiresAt: duration ? new Date(Date.now() + duration) : null
                }
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                message: "IP address blocked successfully",
                data: { blockedIP }
            });
        } catch (error) {
            next(error);
        }
    }

    // Get blocked IPs
    async getBlockedIPs(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20 } = req.query;
            const skip = (page - 1) * limit;

            // Verify admin status
            const isAdmin = await prisma.socialProfile.findFirst({
                where: {
                    id: userId,
                    role: 'ADMIN'
                }
            });

            if (!isAdmin) {
                throw createError(HttpStatus.FORBIDDEN, "Access denied");
            }

            const [blockedIPs, total] = await Promise.all([
                prisma.blockedIP.findMany({
                    include: {
                        blockedByUser: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip,
                    take: limit
                }),
                prisma.blockedIP.count()
            ]);

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    blockedIPs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = {
    AdminPanelController: new AdminPanelController()
};