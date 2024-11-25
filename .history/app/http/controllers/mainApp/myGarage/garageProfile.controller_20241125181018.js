const createError = require("http-errors");
const Controller = require("../controller");

class GarageProfileController extends Controller {
  async ShowUsersGarageProfile(req, res, next) {
    try {
      const { garageId } = req.params;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      // Get garage basic information with owner and address
      const garage = await this.prisma.garage.findUnique({
        where: { id: garageId },
        include: {
          garageOwner: true,
          address: true,
          mechanics: true,
          apprentices: true,
          media: true,
        }
      });

      if (!garage) throw createError.NotFound("Garage not found");

      // Get garage metrics and statistics
      const metrics = await this.prisma.metric.findMany({
        where: { garageId },
        include: {
          client: true,
          reviews: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get garage reviews
      const reviews = await this.prisma.review.findMany({
        where: { garageId },
        include: {
          author: true,
          project: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get garage projects
      const projects = await this.prisma.project.findMany({
        where: { garageId },
        include: {
          client: true,
          mechanicsTeam: true,
          apprenticesTeam: true,
          reviews: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get garage oil service projects
      const oilServiceProjects = await this.prisma.garageOilServiceProjects.findMany({
        where: { garageId },
        include: {
          client: true,
          reviews: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get garage activity logs
      const activityLogs = await this.prisma.garageActivityLog.findMany({
        where: { garageId },
        orderBy: { date: 'desc' },
        take: 30, // Last 30 days
      });

      // Get accepted coupons
      const acceptedCoupons = await this.prisma.couponGarageAcceptor.findMany({
        where: { garageId },
        include: {
          coupon: {
            include: {
              supplierStore: true,
            }
          }
        },
      });

      // Calculate business metrics
      const businessMetrics = {
        totalProjects: garage.totalProjects,
        completedProjects: garage.completedProjects,
        successRate: garage.successRate,
        rating: garage.rating,
        totalReviews: garage.totalReviews,
        activeComplaints: garage.activeComplaints,
        averageResponseTime: garage.averageResponseTime,
      };

      // Calculate activity metrics
      const activityMetrics = {
        totalActivityDays: garage.totalActivityDays,
        currentStreak: garage.currentStreak,
        longestStreak: garage.longestStreak,
        lastActivityDate: garage.lastActivityDate,
      };

      return res.json({
        status: 200,
        success: true,
        data: {
          garage: {
            ...garage,
            businessMetrics,
            activityMetrics,
          },
          metrics,
          reviews,
          projects,
          oilServiceProjects,
          activityLogs,
          acceptedCoupons,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageReviews(req, res, next) {
    try {
      const { garageId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const skip = (page - 1) * limit;

      const reviews = await this.prisma.review.findMany({
        where: { garageId },
        include: {
          author: true,
          project: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      });

      const totalReviews = await this.prisma.review.count({
        where: { garageId },
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          reviews,
          pagination: {
            total: totalReviews,
            pages: Math.ceil(totalReviews / limit),
            currentPage: Number(page),
            limit: Number(limit),
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageProjects(req, res, next) {
    try {
      const { garageId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const skip = (page - 1) * limit;
      const where = { garageId };

      if (status) {
        where.status = status;
      }

      const projects = await this.prisma.project.findMany({
        where,
        include: {
          client: true,
          mechanicsTeam: true,
          apprenticesTeam: true,
          reviews: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      });

      const totalProjects = await this.prisma.project.count({ where });

      return res.json({
        status: 200,
        success: true,
        data: {
          projects,
          pagination: {
            total: totalProjects,
            pages: Math.ceil(totalProjects / limit),
            currentPage: Number(page),
            limit: Number(limit),
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageActivityLogs(req, res, next) {
    try {
      const { garageId } = req.params;
      const { startDate, endDate } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const where = { garageId };

      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const activityLogs = await this.prisma.garageActivityLog.findMany({
        where,
        orderBy: { date: 'desc' },
      });

      return res.json({
        status: 200,
        success: true,
        data: activityLogs,
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageMedia(req, res, next) {
    try {
      const { garageId } = req.params;
      const { type, isArchived = false } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const where = { 
        garageId,
        isArchived: Boolean(isArchived)
      };

      if (type) {
        where.type = type;
      }

      const media = await this.prisma.garageMedia.findMany({
        where,
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' }
        ],
      });

      return res.json({
        status: 200,
        success: true,
        data: media
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageTeam(req, res, next) {
    try {
      const { garageId } = req.params;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const garage = await this.prisma.garage.findUnique({
        where: { id: garageId },
        include: {
          mechanics: {
            include: {
              user: true,
              ProjectsMechanicWorkAt: {
                include: {
                  project: true
                }
              }
            }
          },
          apprentices: {
            include: {
              user: true,
              ProjectsApprenticeWorkAt: {
                include: {
                  project: true
                }
              }
            }
          }
        }
      });

      if (!garage) throw createError.NotFound("Garage not found");

      return res.json({
        status: 200,
        success: true,
        data: {
          mechanics: garage.mechanics,
          apprentices: garage.apprentices
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageCoupons(req, res, next) {
    try {
      const { garageId } = req.params;
      const { status } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      // Get accepted coupons
      const acceptedCouponsQuery = {
        where: { garageId },
        include: {
          coupon: {
            include: {
              supplierStore: true,
              publisher: true
            }
          }
        }
      };

      if (status) {
        acceptedCouponsQuery.where.status = status;
      }

      const acceptedCoupons = await this.prisma.couponGarageAcceptor.findMany(acceptedCouponsQuery);

      // Get successful coupons
      const successfulCoupons = await this.prisma.couponGarageSuccess.findMany({
        where: { garageId },
        include: {
          coupon: {
            include: {
              supplierStore: true,
              publisher: true
            }
          }
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          acceptedCoupons,
          successfulCoupons
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageAwaitList(req, res, next) {
    try {
      const { garageId } = req.params;
      const { status } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const where = { garageId };
      if (status) {
        where.acceptancestatus = status;
      }

      const awaitList = await this.prisma.garageAwaitList.findMany({
        where,
        include: {
          client: true,
          attachment: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        status: 200,
        success: true,
        data: awaitList
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGaragePartOrders(req, res, next) {
    try {
      const { garageId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const skip = (page - 1) * limit;
      const where = { garageId };

      if (status) {
        where.status = status;
      }

      const partOrders = await this.prisma.garagePartOrder.findMany({
        where,
        include: {
          client: true,
          acceptorSuppleirStore: true,
          parts: true,
          project: {
            select: {
              title: true,
              status: true
            }
          },
          reqForSupply: true,
          reviews: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      });

      const totalOrders = await this.prisma.garagePartOrder.count({ where });

      return res.json({
        status: 200,
        success: true,
        data: {
          partOrders,
          pagination: {
            total: totalOrders,
            pages: Math.ceil(totalOrders / limit),
            currentPage: Number(page),
            limit: Number(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageMetrics(req, res, next) {
    try {
      const { garageId } = req.params;
      const { startDate, endDate } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Get garage with basic metrics
      const garage = await this.prisma.garage.findUnique({
        where: { id: garageId }
      });

      if (!garage) throw createError.NotFound("Garage not found");

      // Get project statistics
      const projectStats = await this.prisma.project.groupBy({
        by: ['status'],
        where: {
          garageId,
          ...dateFilter
        },
        _count: true
      });

      // Get review statistics
      const reviewStats = await this.prisma.review.aggregate({
        where: {
          garageId,
          ...dateFilter
        },
        _avg: {
          rating: true
        },
        _count: true
      });

      // Get activity statistics
      const activityStats = await this.prisma.garageActivityLog.aggregate({
        where: {
          garageId,
          ...dateFilter
        },
        _sum: {
          projectCount: true,
          collaborationCount: true,
          partOrderCount: true,
          completedProjectCount: true,
          apprenticeshipCount: true,
          outSourceCount: true
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          basicMetrics: {
            rating: garage.rating,
            totalReviews: garage.totalReviews,
            totalProjects: garage.totalProjects,
            completedProjects: garage.completedProjects,
            successRate: garage.successRate,
            activeComplaints: garage.activeComplaints
          },
          projectStats,
          reviewStats,
          activityStats,
          activityMetrics: {
            totalActivityDays: garage.totalActivityDays,
            currentStreak: garage.currentStreak,
            longestStreak: garage.longestStreak
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageCollaborations(req, res, next) {
    try {
      const { garageId } = req.params;
      const { type, status } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const collaborations = {
        outSourcing: [],
        apprenticeship: [],
        dastyar: []
      };

      // Get OutSourcing collaborations
      if (!type || type === 'outSourcing') {
        const outSourcingWhere = { 
          OR: [
            { hostGarageId: garageId },
            { acceptorGarageId: garageId }
          ]
        };
        if (status) outSourcingWhere.status = status;

        collaborations.outSourcing = await this.prisma.outSourcingCollaborationHistory.findMany({
          where: outSourcingWhere,
          include: {
            hostGarage: true,
            acceptorGarage: true,
            project: true
          }
        });
      }

      // Get Apprenticeship collaborations
      if (!type || type === 'apprenticeship') {
        const apprenticeshipWhere = { garageId };
        if (status) apprenticeshipWhere.status = status;

        collaborations.apprenticeship = await this.prisma.noticeApprenticeship.findMany({
          where: apprenticeshipWhere,
          include: {
            project: true,
            reviews: true
          }
        });
      }

      // Get Dastyar collaborations
      if (!type || type === 'dastyar') {
        const dastyarWhere = { garageId };
        if (status) dastyarWhere.status = status;

        collaborations.dastyar = await this.prisma.noticeDastyar.findMany({
          where: dastyarWhere,
          include: {
            project: true,
            reviews: true
          }
        });
      }

      return res.json({
        status: 200,
        success: true,
        data: collaborations
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageFinancialMetrics(req, res, next) {
    try {
      const { garageId } = req.params;
      const { startDate, endDate } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Get garage basic financial info
      const garage = await this.prisma.garage.findUnique({
        where: { id: garageId },
        include: {
          bankAccount: true
        }
      });

      if (!garage) throw createError.NotFound("Garage not found");

      // Get project revenue
      const projectRevenue = await this.prisma.project.aggregate({
        where: {
          garageId,
          status: 'COMPLETED',
          ...dateFilter
        },
        _sum: {
          budget: true
        }
      });

      // Get coupon revenue
      const couponRevenue = await this.prisma.couponGarageSuccess.aggregate({
        where: {
          garageId,
          ...dateFilter
        },
        _sum: {
          profit: true
        }
      });

      // Get supplier store sales
      const supplierSales = await this.prisma.sellFromSupplier.aggregate({
        where: {
          garageId,
          ...dateFilter
        },
        _sum: {
          totalSellPrice: true
        }
      });

      // Get mechanic payments
      const mechanicPayments = await this.prisma.garageMechanicsMothlyPaying.aggregate({
        where: {
          garageId,
          ...dateFilter
        },
        _sum: {
          totalEarning: true
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          bankAccount: garage.bankAccount,
          garageSquadeProfit: garage.garageSquadeProfit,
          revenue: {
            projects: projectRevenue._sum.budget || 0,
            coupons: couponRevenue._sum.profit || 0,
            supplierSales: supplierSales._sum.totalSellPrice || 0
          },
          expenses: {
            mechanicPayments: mechanicPayments._sum.totalEarning || 0
          },
          netProfit: (
            (projectRevenue._sum.budget || 0) +
            (couponRevenue._sum.profit || 0) +
            (supplierSales._sum.totalSellPrice || 0) -
            (mechanicPayments._sum.totalEarning || 0)
          )
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetMechanicPayments(req, res, next) {
    try {
      const { garageId } = req.params;
      const { year, month } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const where = { 
        garageId,
        ...(year && { year: String(year) }),
        ...(month && { month: String(month) })
      };

      const payments = await this.prisma.garageMechanicsMothlyPaying.findMany({
        where,
        include: {
          projectsMechanicWorkAtThisMonth: true,
          projectsApprenticeWorkAtThisMonth: true
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ]
      });

      // Calculate summary statistics
      const summary = await this.prisma.garageMechanicsMothlyPaying.aggregate({
        where,
        _sum: {
          totalEarning: true,
          totalInhouseProjectsIncome: true,
          totalOutsourceProjectsIncome: true
        },
        _avg: {
          projectSharePercentage: true,
          outsourceSharePercentage: true
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          payments,
          summary
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageProjects(req, res, next) {
    try {
      const { garageId } = req.params;
      const { status, type = 'regular', page = 1, limit = 10 } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const skip = (page - 1) * limit;
      const where = { garageId };

      if (status) {
        where.status = status;
      }

      // Handle different project types
      const projectModel = type === 'oilService' 
        ? this.prisma.garageOilServiceProjects
        : this.prisma.project;

      const projects = await projectModel.findMany({
        where,
        include: {
          client: true,
          reviews: true,
          attachments: true,
          conversation: true,
          milestones: true,
          ...(type === 'regular' && {
            mechanicsTeam: {
              include: {
                mechanic: true
              }
            },
            apprenticesTeam: {
              include: {
                apprentice: true
              }
            }
          })
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      });

      const totalProjects = await projectModel.count({ where });

      return res.json({
        status: 200,
        success: true,
        data: {
          projects,
          pagination: {
            total: totalProjects,
            pages: Math.ceil(totalProjects / limit),
            currentPage: Number(page),
            limit: Number(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetProjectTimeline(req, res, next) {
    try {
      const { projectId } = req.params;

      if (!projectId) throw createError.BadRequest("Project ID is required");

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          milestones: true,
          reviews: true,
          conversation: {
            orderBy: { createdAt: 'asc' }
          },
          transactionsActivityLogs: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!project) throw createError.NotFound("Project not found");

      // Combine all timeline events and sort by date
      const timeline = [
        ...project.milestones.map(m => ({ ...m, type: 'milestone' })),
        ...project.reviews.map(r => ({ ...r, type: 'review' })),
        ...project.conversation.map(c => ({ ...c, type: 'conversation' })),
        ...project.transactionsActivityLogs.map(l => ({ ...l, type: 'activity' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.json({
        status: 200,
        success: true,
        data: {
          project,
          timeline
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetGarageReviews(req, res, next) {
    try {
      const { garageId } = req.params;
      const { page = 1, limit = 10, sort = 'latest' } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const skip = (page - 1) * limit;
      
      const orderBy = sort === 'rating' 
        ? { rating: 'desc' }
        : { createdAt: 'desc' };

      const reviews = await this.prisma.review.findMany({
        where: { garageId },
        include: {
          author: true,
          project: {
            select: {
              title: true,
              car: true,
              status: true
            }
          }
        },
        orderBy,
        skip,
        take: Number(limit)
      });

      const totalReviews = await this.prisma.review.count({
        where: { garageId }
      });

      // Calculate rating statistics
      const ratingStats = await this.prisma.review.groupBy({
        by: ['rating'],
        where: { garageId },
        _count: true
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          reviews,
          ratingStats,
          pagination: {
            total: totalReviews,
            pages: Math.ceil(totalReviews / limit),
            currentPage: Number(page),
            limit: Number(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async RespondToReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const { response } = req.body;

      if (!reviewId || !response) {
        throw createError.BadRequest("Review ID and response are required");
      }

      const updatedReview = await this.prisma.review.update({
        where: { id: reviewId },
        data: { response },
        include: {
          author: true,
          project: true
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: updatedReview
      });
    } catch (error) {
      next(error);
    }
  }

  async GetPerformanceMetrics(req, res, next) {
    try {
      const { garageId } = req.params;
      const { period = '30d' } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      const now = new Date();

      switch (period) {
        case '7d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 90));
          break;
        case '1y':
          dateFilter.gte = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      // Get project completion metrics
      const projectMetrics = await this.prisma.project.groupBy({
        by: ['status'],
        where: {
          garageId,
          createdAt: dateFilter
        },
        _count: true,
        _avg: {
          budget: true
        }
      });

      // Get customer satisfaction metrics
      const satisfactionMetrics = await this.prisma.review.aggregate({
        where: {
          garageId,
          createdAt: dateFilter
        },
        _avg: {
          rating: true
        },
        _count: true
      });

      // Get collaboration success metrics
      const collaborationMetrics = await Promise.all([
        // OutSourcing success rate
        this.prisma.outSourcingCollaborationHistory.groupBy({
          by: ['status'],
          where: {
            OR: [
              { hostGarageId: garageId },
              { acceptorGarageId: garageId }
            ],
            createdAt: dateFilter
          },
          _count: true
        }),
        // Apprenticeship success rate
        this.prisma.noticeApprenticeship.groupBy({
          by: ['status'],
          where: {
            garageId,
            createdAt: dateFilter
          },
          _count: true
        })
      ]);

      // Calculate response time metrics
      const responseTimes = await this.prisma.conversation.aggregate({
        where: {
          project: {
            garageId
          },
          createdAt: dateFilter
        },
        _avg: {
          responseTime: true
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          projectMetrics,
          satisfactionMetrics: {
            averageRating: satisfactionMetrics._avg.rating || 0,
            totalReviews: satisfactionMetrics._count
          },
          collaborationMetrics: {
            outSourcing: collaborationMetrics[0],
            apprenticeship: collaborationMetrics[1]
          },
          responseMetrics: {
            averageResponseTime: responseTimes._avg.responseTime || 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetCustomerInsights(req, res, next) {
    try {
      const { garageId } = req.params;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      // Get customer retention metrics
      const customerRetention = await this.prisma.project.groupBy({
        by: ['clientId'],
        where: { garageId },
        _count: true,
        having: {
          projectId: {
            _count: {
              gt: 1 // Returning customers
            }
          }
        }
      });

      // Get service type distribution
      const serviceDistribution = await this.prisma.project.groupBy({
        by: ['car'],
        where: { garageId },
        _count: true,
        _sum: {
          budget: true
        }
      });

      // Get customer feedback trends
      const feedbackTrends = await this.prisma.review.groupBy({
        by: ['rating'],
        where: { garageId },
        _count: true,
        orderBy: {
          rating: 'desc'
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          customerRetention: {
            returningCustomers: customerRetention.length,
            totalCustomers: await this.prisma.project.groupBy({
              by: ['clientId'],
              where: { garageId },
              _count: true
            }).then(result => result.length)
          },
          serviceDistribution,
          feedbackTrends
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetActivityStats(req, res, next) {
    try {
      const { garageId } = req.params;
      const { period = 'week' } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      const now = new Date();

      switch (period) {
        case 'week':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          dateFilter.gte = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          dateFilter.gte = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      const activityLogs = await this.prisma.garageActivityLog.findMany({
        where: {
          garageId,
          date: dateFilter
        },
        orderBy: { date: 'desc' },
        include: {
          garage: {
            select: {
              garage_name: true,
              currentStreak: true,
              longestStreak: true
            }
          }
        }
      });

      // Calculate activity level distribution
      const activityLevels = await this.prisma.garageActivityLog.groupBy({
        by: ['activityLevel'],
        where: {
          garageId,
          date: dateFilter
        },
        _count: true
      });

      // Get total contributions
      const totalContributions = await this.prisma.garageActivityLog.aggregate({
        where: {
          garageId,
          date: dateFilter
        },
        _sum: {
          projectCount: true,
          collaborationCount: true,
          partOrderCount: true,
          completedProjectCount: true,
          apprenticeshipCount: true,
          outSourceCount: true
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          activityLogs,
          activityLevels,
          totalContributions: totalContributions._sum,
          streaks: {
            current: activityLogs[0]?.garage.currentStreak || 0,
            longest: activityLogs[0]?.garage.longestStreak || 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetDailyContributions(req, res, next) {
    try {
      const { garageId } = req.params;
      const { date } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const targetDate = date ? new Date(date) : new Date();

      const dailyActivity = await this.prisma.garageActivityLog.findFirst({
        where: {
          garageId,
          date: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999))
          }
        }
      });

      // Get related activities
      const relatedActivities = await Promise.all([
        // Projects created/completed today
        this.prisma.project.findMany({
          where: {
            garageId,
            OR: [
              { createdAt: { gte: targetDate, lt: new Date(targetDate.getTime() + 86400000) } },
              { completedAt: { gte: targetDate, lt: new Date(targetDate.getTime() + 86400000) } }
            ]
          }
        }),
        // Part orders made today
        this.prisma.garagePartOrder.findMany({
          where: {
            garageId,
            createdAt: { gte: targetDate, lt: new Date(targetDate.getTime() + 86400000) }
          }
        }),
        // Collaborations started today
        this.prisma.outSourcingCollaborationHistory.findMany({
          where: {
            OR: [
              { hostGarageId: garageId },
              { acceptorGarageId: garageId }
            ],
            createdAt: { gte: targetDate, lt: new Date(targetDate.getTime() + 86400000) }
          }
        })
      ]);

      return res.json({
        status: 200,
        success: true,
        data: {
          dailyActivity,
          relatedActivities: {
            projects: relatedActivities[0],
            partOrders: relatedActivities[1],
            collaborations: relatedActivities[2]
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetMediaGallery(req, res, next) {
    try {
      const { garageId } = req.params;
      const { type, page = 1, limit = 20 } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const skip = (page - 1) * limit;
      const where = { garageId, isArchived: false };

      if (type) {
        where.type = type;
      }

      const [media, totalCount] = await Promise.all([
        this.prisma.garageMedia.findMany({
          where,
          orderBy: [
            { isFeatured: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: Number(limit)
        }),
        this.prisma.garageMedia.count({ where })
      ]);

      // Get media stats
      const mediaStats = await this.prisma.garageMedia.groupBy({
        by: ['type'],
        where: { garageId },
        _count: true
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          media,
          stats: mediaStats,
          pagination: {
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
            currentPage: Number(page),
            limit: Number(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async UpdateMediaMetadata(req, res, next) {
    try {
      const { mediaId } = req.params;
      const { isFeatured, metadata } = req.body;

      if (!mediaId) throw createError.BadRequest("Media ID is required");

      const updatedMedia = await this.prisma.garageMedia.update({
        where: { id: mediaId },
        data: {
          isFeatured: isFeatured !== undefined ? isFeatured : undefined,
          metadata: metadata ? { ...metadata } : undefined
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: updatedMedia
      });
    } catch (error) {
      next(error);
    }
  }

  async ArchiveMedia(req, res, next) {
    try {
      const { mediaId } = req.params;
      const { archive = true } = req.body;

      if (!mediaId) throw createError.BadRequest("Media ID is required");

      const updatedMedia = await this.prisma.garageMedia.update({
        where: { id: mediaId },
        data: { isArchived: archive }
      });

      return res.json({
        status: 200,
        success: true,
        data: updatedMedia
      });
    } catch (error) {
      next(error);
    }
  }

  async GetTeamPerformance(req, res, next) {
    try {
      const { garageId } = req.params;
      const { period = '30d' } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      const now = new Date();

      switch (period) {
        case '7d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 90));
          break;
      }

      // Get mechanics performance
      const mechanicsPerformance = await this.prisma.projectsMechanicWorkAt.groupBy({
        by: ['mechanicId'],
        where: {
          project: {
            garageId,
            createdAt: dateFilter
          }
        },
        _count: {
          projectId: true
        },
        _sum: {
          completedTasks: true,
          totalTasks: true
        }
      });

      // Get apprentices performance
      const apprenticesPerformance = await this.prisma.projectsApprenticeWorkAt.groupBy({
        by: ['apprenticeId'],
        where: {
          project: {
            garageId,
            createdAt: dateFilter
          }
        },
        _count: {
          projectId: true
        },
        _sum: {
          completedTasks: true,
          totalTasks: true
        }
      });

      // Get team member details
      const teamMembers = await this.prisma.garage.findUnique({
        where: { id: garageId },
        include: {
          mechanics: {
            include: {
              user: true,
              ProjectsMechanicWorkAt: {
                where: { 
                  project: { createdAt: dateFilter }
                },
                include: {
                  project: {
                    select: {
                      status: true,
                      rating: true
                    }
                  }
                }
              }
            }
          },
          apprentices: {
            include: {
              user: true,
              ProjectsApprenticeWorkAt: {
                where: { 
                  project: { createdAt: dateFilter }
                },
                include: {
                  project: {
                    select: {
                      status: true,
                      rating: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          mechanicsPerformance,
          apprenticesPerformance,
          teamMembers: {
            mechanics: teamMembers.mechanics,
            apprentices: teamMembers.apprentices
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetTeamSchedule(req, res, next) {
    try {
      const { garageId } = req.params;
      const { startDate, endDate } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Get active projects with team assignments
      const activeProjects = await this.prisma.project.findMany({
        where: {
          garageId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          },
          ...dateFilter
        },
        include: {
          mechanicsTeam: {
            include: {
              mechanic: true
            }
          },
          apprenticesTeam: {
            include: {
              apprentice: true
            }
          }
        }
      });

      // Get garage await list
      const awaitList = await this.prisma.garageAwaitList.findMany({
        where: {
          garageId,
          ...dateFilter
        },
        include: {
          client: true
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          activeProjects,
          awaitList,
          schedule: {
            projects: activeProjects.map(project => ({
              projectId: project.id,
              title: project.title,
              status: project.status,
              deadline: project.deadline,
              team: {
                mechanics: project.mechanicsTeam,
                apprentices: project.apprenticesTeam
              }
            }))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetTeamPaymentHistory(req, res, next) {
    try {
      const { garageId } = req.params;
      const { year, month } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      // Get monthly payments history
      const paymentsHistory = await this.prisma.garageMechanicsMothlyPaying.findMany({
        where: {
          garageId,
          ...(year && { year: String(year) }),
          ...(month && { month: String(month) })
        },
        include: {
          projectsMechanicWorkAtThisMonth: true,
          projectsApprenticeWorkAtThisMonth: true
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ]
      });

      // Calculate performance-based metrics
      const performanceMetrics = await Promise.all([
        // Mechanics performance
        this.prisma.projectsMechanicWorkAt.groupBy({
          by: ['mechanicId'],
          where: {
            project: {
              garageId,
              ...(year && { 
                createdAt: {
                  gte: new Date(`${year}-01-01`),
                  lt: new Date(`${parseInt(year) + 1}-01-01`)
                }
              })
            }
          },
          _avg: {
            projectSharePercentage: true
          },
          _sum: {
            totalInhouseProjectsIncome: true,
            totalOutsourceProjectsIncome: true
          }
        }),
        // Apprentices performance
        this.prisma.projectsApprenticeWorkAt.groupBy({
          by: ['apprenticeId'],
          where: {
            project: {
              garageId,
              ...(year && {
                createdAt: {
                  gte: new Date(`${year}-01-01`),
                  lt: new Date(`${parseInt(year) + 1}-01-01`)
                }
              })
            }
          },
          _avg: {
            projectSharePercentage: true
          },
          _sum: {
            totalInhouseProjectsIncome: true,
            totalOutsourceProjectsIncome: true
          }
        })
      ]);

      return res.json({
        status: 200,
        success: true,
        data: {
          paymentsHistory,
          performanceMetrics: {
            mechanics: performanceMetrics[0],
            apprentices: performanceMetrics[1]
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetTeamCollaborationStats(req, res, next) {
    try {
      const { garageId } = req.params;
      const { period = '30d' } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      const now = new Date();

      switch (period) {
        case '7d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 90));
          break;
      }

      // Get outsourcing collaboration stats
      const outsourcingStats = await this.prisma.outSourcingCollaborationHistory.groupBy({
        by: ['status'],
        where: {
          OR: [
            { hostGarageId: garageId },
            { acceptorGarageId: garageId }
          ],
          createdAt: dateFilter
        },
        _count: true
      });

      // Get apprenticeship stats
      const apprenticeshipStats = await this.prisma.noticeApprenticeship.groupBy({
        by: ['status'],
        where: {
          garageId,
          createdAt: dateFilter
        },
        _count: true
      });

      // Get dastyar collaboration stats
      const dastyarStats = await this.prisma.noticeDastyar.groupBy({
        by: ['status'],
        where: {
          garageId,
          createdAt: dateFilter
        },
        _count: true
      });

      // Get team collaboration success rate
      const collaborationSuccess = await Promise.all([
        // Successful outsourcing projects
        this.prisma.outSourcingCollaborationHistory.count({
          where: {
            OR: [
              { hostGarageId: garageId },
              { acceptorGarageId: garageId }
            ],
            status: 'COMPLETED',
            createdAt: dateFilter
          }
        }),
        // Total outsourcing projects
        this.prisma.outSourcingCollaborationHistory.count({
          where: {
            OR: [
              { hostGarageId: garageId },
              { acceptorGarageId: garageId }
            ],
            createdAt: dateFilter
          }
        })
      ]);

      return res.json({
        status: 200,
        success: true,
        data: {
          outsourcingStats,
          apprenticeshipStats,
          dastyarStats,
          successRate: collaborationSuccess[1] > 0 
            ? (collaborationSuccess[0] / collaborationSuccess[1]) * 100 
            : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetServiceTypePerformance(req, res, next) {
    try {
      const { garageId } = req.params;
      const { period = '30d' } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      const now = new Date();

      switch (period) {
        case '7d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          dateFilter.gte = new Date(now.setDate(now.getDate() - 90));
          break;
      }

      // Get regular service performance
      const regularServiceStats = await this.prisma.project.groupBy({
        by: ['status', 'car'],
        where: {
          garageId,
          createdAt: dateFilter
        },
        _count: true,
        _avg: {
          budget: true
        }
      });

      // Get oil service performance
      const oilServiceStats = await this.prisma.garageOilServiceProjects.groupBy({
        by: ['status', 'car'],
        where: {
          garageId,
          createdAt: dateFilter
        },
        _count: true,
        _avg: {
          budget: true
        }
      });

      // Get service quality metrics
      const qualityMetrics = await Promise.all([
        // Regular service reviews
        this.prisma.review.groupBy({
          by: ['rating'],
          where: {
            garageId,
            project: {
              garageId,
              createdAt: dateFilter
            }
          },
          _count: true
        }),
        // Oil service reviews
        this.prisma.review.groupBy({
          by: ['rating'],
          where: {
            garageId,
            garageOilServiceProject: {
              garageId,
              createdAt: dateFilter
            }
          },
          _count: true
        })
      ]);

      return res.json({
        status: 200,
        success: true,
        data: {
          regularService: {
            stats: regularServiceStats,
            qualityMetrics: qualityMetrics[0]
          },
          oilService: {
            stats: oilServiceStats,
            qualityMetrics: qualityMetrics[1]
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetCarModelServiceHistory(req, res, next) {
    try {
      const { garageId } = req.params;
      const { carModel } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const where = { 
        garageId,
        ...(carModel && { car: carModel })
      };

      // Get regular service history
      const regularServices = await this.prisma.project.findMany({
        where,
        include: {
          reviews: true,
          client: true,
          mechanicsTeam: {
            include: {
              mechanic: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get oil service history
      const oilServices = await this.prisma.garageOilServiceProjects.findMany({
        where,
        include: {
          reviews: true,
          client: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate service statistics
      const serviceStats = {
        totalServices: regularServices.length + oilServices.length,
        averageRating: this.calculateAverageRating([...regularServices, ...oilServices]),
        commonIssues: this.extractCommonIssues([...regularServices, ...oilServices]),
        averageServiceInterval: this.calculateServiceInterval(oilServices)
      };

      return res.json({
        status: 200,
        success: true,
        data: {
          regularServices,
          oilServices,
          serviceStats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetQualityMetrics(req, res, next) {
    try {
      const { garageId } = req.params;
      const { startDate, endDate } = req.query;

      if (!garageId) throw createError.BadRequest("Garage ID is required");

      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Get customer satisfaction metrics
      const satisfactionMetrics = await this.prisma.review.groupBy({
        by: ['rating'],
        where: {
          garageId,
          ...dateFilter
        },
        _count: true
      });

      // Get service completion times
      const completionTimes = await this.prisma.project.aggregate({
        where: {
          garageId,
          status: 'COMPLETED',
          ...dateFilter
        },
        _avg: {
          completionTime: true
        },
        _min: {
          completionTime: true
        },
        _max: {
          completionTime: true
        }
      });

      // Get repeat service requests
      const repeatServices = await this.prisma.project.groupBy({
        by: ['clientId', 'car'],
        where: {
          garageId,
          ...dateFilter
        },
        having: {
          projectId: {
            _count: {
              gt: 1
            }
          }
        },
        _count: true
      });

      // Get part replacement frequency
      const partReplacements = await this.prisma.garagePartOrder.groupBy({
        by: ['parts'],
        where: {
          garageId,
          ...dateFilter
        },
        _count: true,
        orderBy: {
          _count: {
            projectId: 'desc'
          }
        }
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          satisfactionMetrics,
          serviceEfficiency: {
            averageCompletionTime: completionTimes._avg.completionTime,
            fastestCompletion: completionTimes._min.completionTime,
            slowestCompletion: completionTimes._max.completionTime
          },
          repeatServices: repeatServices.length,
          commonReplacements: partReplacements
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async GetServiceRecommendations(req, res, next) {
    try {
      const { garageId } = req.params;
      const { carModel, mileage } = req.query;

      if (!garageId || !carModel || !mileage) {
        throw createError.BadRequest("Garage ID, car model, and mileage are required");
      }

      // Get service history for similar cars
      const serviceHistory = await this.prisma.garageOilServiceProjects.findMany({
        where: {
          garageId,
          car: carModel,
          carMillage: {
            lte: parseInt(mileage) + 10000,
            gte: parseInt(mileage) - 10000
          }
        },
        include: {
          reviews: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Analyze common services at this mileage
      const commonServices = await this.prisma.project.groupBy({
        by: ['brokeReportDetails'],
        where: {
          garageId,
          car: carModel,
          carMillage: {
            lte: parseInt(mileage) + 10000,
            gte: parseInt(mileage) - 10000
          }
        },
        _count: true,
        orderBy: {
          _count: {
            projectId: 'desc'
          }
        }
      });

      // Get part replacement patterns
      const partPatterns = await this.prisma.garagePartOrder.groupBy({
        by: ['parts'],
        where: {
          garageId,
          project: {
            car: carModel,
            carMillage: {
              lte: parseInt(mileage) + 10000,
              gte: parseInt(mileage) - 10000
            }
          }
        },
        _count: true
      });

      return res.json({
        status: 200,
        success: true,
        data: {
          recommendedServices: this.analyzeServicePatterns(serviceHistory),
          commonIssues: commonServices,
          recommendedParts: partPatterns,
          nextServiceMileage: this.calculateNextServiceMileage(serviceHistory, mileage)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  calculateAverageRating(services) {
    const ratings = services.flatMap(service => 
      service.reviews.map(review => review.rating)
    );
    return ratings.length ? 
      ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length : 0;
  }

  extractCommonIssues(services) {
    const issues = services.map(service => service.brokeReportDetails);
    return [...new Set(issues)];
  }

  calculateServiceInterval(oilServices) {
    if (oilServices.length < 2) return null;
    
    const intervals = oilServices
      .slice(1)
      .map((service, index) => 
        parseInt(service.thisServiceMilage) - parseInt(oilServices[index].thisServiceMilage)
      );
    
    return intervals.reduce((acc, curr) => acc + curr, 0) / intervals.length;
  }

  analyzeServicePatterns(serviceHistory) {
    // Implementation for service pattern analysis
    return serviceHistory.reduce((patterns, service) => {
      const key = `${service.thisServiceOil}_${service.thisServiceMilage}`;
      patterns[key] = (patterns[key] || 0) + 1;
      return patterns;
    }, {});
  }

  calculateNextServiceMileage(serviceHistory, currentMileage) {
    if (!serviceHistory.length) return parseInt(currentMileage) + 5000;
    
    const averageInterval = this.calculateServiceInterval(serviceHistory);
    return averageInterval ? 
      parseInt(currentMileage) + averageInterval : 
      parseInt(currentMileage) + 5000;
  }
}


module.exports = {
  GarageProfileController: new GarageProfileController(),
};


//  ShowUsersGarageProfile
//  ShowGarageComments
//  ShowGarageProjects
//  ShowGarageDastyarReqs
//  ShowGarageOutsourcingReqs
//  ShowUsersSupplierStoreProfile
