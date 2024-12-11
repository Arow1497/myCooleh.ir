const createHttpError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Controller = require('../../controller');
const { StatusCodes } = require('http-status-codes');

class ComplaintController extends Controller {
    
  async create(req, res) {
    try {
      const { filerId, receiverId, projectId } = req.body;

      if (!filerId || !receiverId || !projectId) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'Missing required fields');
      }

      const complaint = await prisma.complaint.create({
        data: {
          ...req.body,
          status: 'PENDING',
          filer: { connect: { id: filerId } },
          receiver: { connect: { id: receiverId } },
          project: { connect: { id: projectId } }
        },
        include: {
          filer: true,
          receiver: true,
          project: true
        }
      });

      // Update related transaction status
      await prisma.transaction.update({
        where: { projectId },
        data: { status: 'DISPUTED' }
      });

      this.success(res, complaint, StatusCodes.CREATED);
    } catch (error) {
      this.error(res, error);
    }
  }

  async resolve(req, res) {
    try {
      const { id } = req.params;
      const { resolution, adminNotes } = req.body;

      if (!resolution) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'Resolution is required');
      }

      const complaint = await prisma.complaint.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolution,
          resolutionDate: new Date(),
          adminNotes
        },
        include: {
          project: true
        }
      });

      // Update related transaction status
      await prisma.transaction.update({
        where: { projectId: complaint.projectId },
        data: { status: 'PENDING_CONFIRMATION' }
      });

      this.success(res, complaint);
    } catch (error) {
      this.error(res, error);
    }
  }

  async findUserComplaints(req, res) {
    try {
      const { userId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const where = {
        OR: [
          { filerId: parseInt(userId) },
          { receiverId: parseInt(userId) }
        ],
        ...(status && { status })
      };

      const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            filer: true,
            receiver: true,
            project: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.complaint.count({ where })
      ]);

      this.success(res, {
        complaints,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      this.error(res, error);
    }
  }

  async checkUserEligibility(req, res) {
    try {
      const { userId } = req.params;

      const pendingComplaints = await prisma.complaint.count({
        where: {
          receiverId: parseInt(userId),
          status: 'PENDING'
        }
      });
      
      this.success(res, {
        eligible: pendingComplaints === 0,
        pendingComplaints
      });
    } catch (error) {
      this.error(res, error);
    }
  }

  async assignAdmin(req, res) {
    try {
      const { id } = req.params;
      const { adminId } = req.body;

      if (!adminId) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'Admin ID is required');
      }

      const complaint = await prisma.complaint.update({
        where: { id },
        data: {
          assignedAdminId: adminId
        },
        include: {
          filer: true,
          receiver: true,
          project: true
        }
      });

      this.success(res, complaint);
    } catch (error) {
      this.error(res, error);
    }
  }

  async addEvidence(req, res) {
    try {
      const { id } = req.params;
      const { evidenceUrl } = req.body;

      if (!evidenceUrl) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'Evidence URL is required');
      }

      const complaint = await prisma.complaint.update({
        where: { id },
        data: {
          evidence: {
            push: evidenceUrl
          }
        }
      });

      this.success(res, complaint);
    } catch (error) {
      this.error(res, error);
    }
  }

  async getComplaintHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const where = {
        OR: [
          { filerId: parseInt(userId) },
          { receiverId: parseInt(userId) }
        ]
      };

      const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            filer: true,
            receiver: true,
            project: true,
            activityLogs: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.complaint.count({ where })
      ]);

      this.success(res, {
        complaints,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      this.error(res, error);
    }
  }

  async getComplaintStats(req, res) {
    try {
      const [total, pending, resolved] = await Promise.all([
        prisma.complaint.count(),
        prisma.complaint.count({ where: { status: 'PENDING' } }),
        prisma.complaint.count({ where: { status: 'RESOLVED' } })
      ]);

      this.success(res, {
        total,
        pending,
        resolved,
        resolutionRate: total > 0 ? (resolved / total) * 100 : 0
      });
    } catch (error) {
      this.error(res, error);
    }
  }

  async createComplaint(req, res, next) {
    try {
        const { 
            projectId, 
            receiverId, 
            description, 
            evidence,
            garagePartOrderId,
            metricId,
            couponId,
            noticeOutSourcingId,
            noticeApprenticeId,
            noticeDastyarId,
            garageOilServiceProjectId
        } = req.body;

        // Get the user ID from the authenticated session
        const filerId = req.user.id;

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: parseInt(projectId) }
        });

        if (!project) {
            throw createHttpError.NotFound('Project not found');
        }

        // Check if there's already an active complaint for this project
        const existingComplaint = await prisma.complaint.findFirst({
            where: {
                projectId: parseInt(projectId),
                status: { not: 'RESOLVED' }
            }
        });

        if (existingComplaint) {
            throw createHttpError.Conflict('An active complaint already exists for this project');
        }

        // Create the complaint
        const complaint = await prisma.complaint.create({
            data: {
                project: { connect: { id: parseInt(projectId) } },
                filer: { connect: { id: filerId } },
                receiver: { connect: { id: parseInt(receiverId) } },
                description,
                evidence,
                garagePartOrder: garagePartOrderId ? { connect: { id: parseInt(garagePartOrderId) } } : undefined,
                metric: metricId ? { connect: { id: parseInt(metricId) } } : undefined,
                coupon: couponId ? { connect: { id: parseInt(couponId) } } : undefined,
                noticeOutSourcing: noticeOutSourcingId ? { connect: { id: parseInt(noticeOutSourcingId) } } : undefined,
                noticeApprentice: noticeApprenticeId ? { connect: { id: parseInt(noticeApprenticeId) } } : undefined,
                noticeDastyar: noticeDastyarId ? { connect: { id: parseInt(noticeDastyarId) } } : undefined,
                garageOilServiceProject: garageOilServiceProjectId ? { connect: { id: parseInt(garageOilServiceProjectId) } } : undefined,
            }
        });

        // Create activity log
        await prisma.activityLog.create({
            data: {
                action: 'COMPLAINT_CREATED',
                userId: filerId,
                projectId: parseInt(projectId),
                details: `Complaint filed against user ${receiverId}`
            }
        });

        return res.status(StatusCodes.CREATED).json({
            status: StatusCodes.CREATED,
            success: true,
            message: "Complaint created successfully",
            data: { complaint }
        });
    } catch (error) {
        next(error);
    }
}

async getComplaints(req, res, next) {
    try {
        const userId = req.user.id;
        const { status, role } = req.query;

        let whereClause = {};

        // Filter by status if provided
        if (status) {
            whereClause.status = status;
        }

        // Filter based on user role (filer or receiver)
        if (role === 'filed') {
            whereClause.filerId = userId;
        } else if (role === 'received') {
            whereClause.receiverId = userId;
        } else {
            // If no role specified, show both filed and received complaints
            whereClause.OR = [
                { filerId: userId },
                { receiverId: userId }
            ];
        }

        const complaints = await prisma.complaint.findMany({
            where: whereClause,
            include: {
                project: true,
                filer: {
                    select: {
                        id: true,
                        mobile: true,
                        bussinesRole: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        mobile: true,
                        bussinesRole: true
                    }
                },
                messages: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.status(StatusCodes.OK).json({
            status: StatusCodes.OK,
            success: true,
            data: { complaints }
        });
    } catch (error) {
        next(error);
    }
}

async getComplaintById(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const complaint = await prisma.complaint.findUnique({
            where: { id },
            include: {
                project: true,
                filer: {
                    select: {
                        id: true,
                        mobile: true,
                        bussinesRole: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        mobile: true,
                        bussinesRole: true
                    }
                },
                messages: true,
                activityLogs: true
            }
        });

        if (!complaint) {
            throw createHttpError.NotFound('Complaint not found');
        }

        // Check if user has permission to view this complaint
        if (complaint.filerId !== userId && complaint.receiverId !== userId) {
            throw createHttpError.Forbidden('You do not have permission to view this complaint');
        }

        return res.status(StatusCodes.OK).json({
            status: StatusCodes.OK,
            success: true,
            data: { complaint }
        });
    } catch (error) {
        next(error);
    }
}

async updateComplaintStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status, resolution } = req.body;
        const userId = req.user.id;

        const complaint = await prisma.complaint.findUnique({
            where: { id },
            include: {
                project: true
            }
        });

        if (!complaint) {
            throw createHttpError.NotFound('Complaint not found');
        }

        // Only the receiver can update the complaint status
        if (complaint.receiverId !== userId) {
            throw createHttpError.Forbidden('Only the complaint receiver can update the status');
        }

        const updatedComplaint = await prisma.complaint.update({
            where: { id },
            data: {
                status,
                resolution: resolution,
                resolutionDate: status === 'RESOLVED' ? new Date() : null
            }
        });

        // Create activity log
        await prisma.activityLog.create({
            data: {
                action: 'COMPLAINT_STATUS_UPDATED',
                userId,
                projectId: complaint.projectId,
                details: `Complaint status updated to ${status}`
            }
        });

        return res.status(StatusCodes.OK).json({
            status: StatusCodes.OK,
            success: true,
            message: "Complaint status updated successfully",
            data: { complaint: updatedComplaint }
        });
    } catch (error) {
        next(error);
    }
}

async addMessageToComplaint(req, res, next) {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const complaint = await prisma.complaint.findUnique({
            where: { id }
        });

        if (!complaint) {
            throw createHttpError.NotFound('Complaint not found');
        }

        // Check if user is involved in the complaint
        if (complaint.filerId !== userId && complaint.receiverId !== userId) {
            throw createHttpError.Forbidden('You cannot add messages to this complaint');
        }

        const message = await prisma.message.create({
            data: {
                content,
                complaint: { connect: { id } },
                sender: { connect: { id: userId } }
            }
        });

        return res.status(StatusCodes.CREATED).json({
            status: StatusCodes.CREATED,
            success: true,
            message: "Message added successfully",
            data: { message }
        });
    } catch (error) {
        next(error);
    }
}

async assignAdminToComplaint(req, res, next) {
    try {
        const { id } = req.params;
        const { adminId, adminNotes } = req.body;
        const userId = req.user.id;

        // Check if user is system admin
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user.isSystemAdmin) {
            throw createHttpError.Forbidden('Only system administrators can assign complaints');
        }

        const updatedComplaint = await prisma.complaint.update({
            where: { id },
            data: {
                assignedAdminId: parseInt(adminId),
                adminNotes
            }
        });

        // Create activity log
        await prisma.activityLog.create({
            data: {
                action: 'ADMIN_ASSIGNED',
                userId,
                complaintId: id,
                details: `Admin ${adminId} assigned to complaint`
            }
        });

        return res.status(StatusCodes.OK).json({
            status: StatusCodes.OK,
            success: true,
            message: "Admin assigned successfully",
            data: { complaint: updatedComplaint }
        });
    } catch (error) {
        next(error);
    }
}
//////////////////////////////////////////////////////////////////////////////??


async getAllComplaintToThisUser(req, res, next){
  try {
      
  } catch (error) {
    console.error("Error showing all apprentice notice requests:", error);
    next(error)
  }
}

async getOneComplaintById(req, res, next){
  try {
      
  } catch (error) {
    console.error("Error showing all apprentice notice requests:", error);
    next(error)
  }
}

async userComplaintUnbanRequest(req, res, next){
  try {
      
  } catch (error) {
    console.error("Error showing all apprentice notice requests:", error);
    next(error)
  }
}

}

modules.exports = {
    ComplaintController: new ComplaintController()
    };

/*
    داخل تب دستیار کاربر ها دسترسی دارند به اگهی های مکانیک شاگرد برونسپاری  
و همچنین میتونند ببینن همکاری های در حال اجرا خودشون رو اما در تب های 
ترنزاکشن و کامپلینت در واقع تاریخچه همکاری ها و همچنین سوابق شکایات هست
انواع ترنزاکشن ها مکانیک شاگرد برونسپاری و پارت اوردر و کوپن و متریک
*/