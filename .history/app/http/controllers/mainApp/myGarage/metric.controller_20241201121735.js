/*
*            ____ForceMajeureMetrics متریک های فورس که مکانیک مشتری رو متقاعد به خرید کرده
*           |
*Metrics----|
*           |____PostponedMetrics متریک های به تعویق افتاده که مشتری راضی به خرید نشده و تامین کننده خودش بازاریابی میکنه
*            
*/
const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MetricsController extends Controller {
  // Private helper methods
  async #validateGarageAccess(userId) {
    const user = await prisma.projectProfile.findUnique({
      where: { id: userId },
      include: { ownedGarage: true }
    });

    if (!user?.ownedGarage) {
      throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
    }
    return user.ownedGarage.id;
  }
  async #validateClanMembership(userId, clanId) {
    const membership = await prisma.clanMembership.findFirst({
      where: {
        userId,
        clanId,
        role: { in: ['OWNER', 'COLEADER', 'ELDER'] }
      }
    });
    if (!membership) {
      throw createError(HttpStatus.UNAUTHORIZED, "شما دسترسی لازم در این کلن را ندارید");
    }
    return membership;
  }
  
  // Create new metric
  async createMetric(req) {
    try {
      const garageId = await this.#validateGarageAccess(req.user.id);
      
      const {
        clientId,
        supplierStoreId,
        title,
        description,
        carModel,
        carBuildYear,
        partSpecifications,
        quantity,
        condition,
        urgencyLevel,
        notes,
        metricStatus,
        currentUsage,
        maxLifespan,
        estimatedReplacementCost,
        nextInspectionDate,
        recommendedAction,
        mechanicCommissionPercentage
      } = req.body;

      const metric = await prisma.metric.create({
        data: {
          publisherId: req.user.id,
          garageId,
          clientId,
          supplierStoreId,
          title,
          description,
          carModel,
          carBuildYear,
          quantity,
          condition,
          urgencyLevel: parseInt(urgencyLevel),
          notes,
          metricStatus,
          currentUsage: parseFloat(currentUsage),
          maxLifespan: parseFloat(maxLifespan),
          estimatedReplacementCost: parseFloat(estimatedReplacementCost),
          nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
          recommendedAction,
          mechanicCommissionPercentage: parseFloat(mechanicCommissionPercentage),
          partSpecifications: {
            create: partSpecifications
          }
        }
      });

      return this.success(metric);
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Update existing metric
  async updateMetric(req) {
    try {
      const { metricId } = req.params;
      await this.#validateGarageAccess(req.user.id);

      const metric = await prisma.metric.findUnique({
        where: { id: metricId }
      });

      if (!metric) {
        throw createError(HttpStatus.NOT_FOUND, "متریک مورد نظر یافت نشد");
      }

      const updatedMetric = await prisma.metric.update({
        where: { id: metricId },
        data: {
          ...req.body,
          updatedAt: new Date()
        }
      });

      return this.success(updatedMetric);
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Delete metric
  async deleteMetric(req) {
    try {
      const { metricId } = req.params;
      await this.#validateGarageAccess(req.user.id);

      await prisma.metric.delete({
        where: { id: metricId }
      });

      return this.success({ message: "متریک با موفقیت حذف شد" });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get metric details
  async getMetricDetails(req) {
    try {
      const { metricId } = req.params;

      const metric = await prisma.metric.findUnique({
        where: { id: metricId },
        include: {
          publisher: true,
          garage: true,
          client: true,
          supplierStore: true,
          partSpecifications: true,
          conversation: true
        }
      });

      if (!metric) {
        throw createError(HttpStatus.NOT_FOUND, "متریک مورد نظر یافت نشد");
      }

      return this.success(metric);
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Handle supplier store request for metric assignment
  async handleSupplierStoreRequest(req) {
    try {
      const { metricId } = req.params;
      const { partSpecifications, quantity, condition, urgencyLevel, notes } = req.body;

      const request = await prisma.supplierStoreReqsForMetricAssignment.create({
        data: {
          publisherId: req.user.id,
          supplierStoreId: req.user.supplierStoreId,
          metricId,
          partSpecifications: {
            create: partSpecifications
          },
          quantity,
          condition,
          urgencyLevel: parseInt(urgencyLevel),
          notes
        }
      });

      return this.success(request);
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Record successful metric assignment
  async recordSuccessfulAssignment(req) {
    try {
      const { metricId } = req.params;
      const {
        finalPrice,
        partDetails,
        salePrice,
        mechanicCommission
      } = req.body;

      const metric = await prisma.metric.findUnique({
        where: { id: metricId }
      });

      const successful = await prisma.wasSupplierStoreMetricAssignmentSuccessful.create({
        data: {
          supplierStoreId: req.user.supplierStoreId,
          metricId,
          garageId: metric.garageId,
          clientId: metric.clientId,
          finalPrice,
          partDetails,
          salePrice: parseFloat(salePrice),
          mechanicCommission: parseFloat(mechanicCommission),
          successRate: 1,
          successfulAssignments: 1,
          totalMetricAssignments: 1
        }
      });

      return this.success(successful);
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get metrics by garage
  async getGarageMetrics(req) {
    try {
      const garageId = await this.#validateGarageAccess(req.user.id);
      const { status, page = 1, limit = 10 } = req.query;

      const where = {
        garageId,
        ...(status && { metricStatus: status })
      };

      const metrics = await prisma.metric.findMany({
        where,
        include: {
          client: true,
          partSpecifications: true
        },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      const total = await prisma.metric.count({ where });

      return this.success({
        metrics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get metrics by supplier store
  async getSupplierStoreMetrics(req) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const metrics = await prisma.metric.findMany({
        where: {
          supplierStoreId: req.user.supplierStoreId
        },
        include: {
          garage: true,
          client: true,
          partSpecifications: true
        },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      const total = await prisma.metric.count({
        where: { supplierStoreId: req.user.supplierStoreId }
      });

      return this.success({
        metrics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }


  // Get metrics statistics for garage
  async getGarageMetricsStats(req) {
    try {
      const garageId = await this.#validateGarageAccess(req.user.id);

      const stats = await prisma.metric.groupBy({
        by: ['metricStatus'],
        where: { garageId },
        _count: true,
      });

      const totalRevenue = await prisma.wasSupplierStoreMetricAssignmentSuccessful.aggregate({
        where: { garageId },
        _sum: {
          mechanicCommission: true
        }
      });

      const urgentMetrics = await prisma.metric.count({
        where: {
          garageId,
          urgencyLevel: { gte: 4 }
        }
      });

      return this.success({
        statusDistribution: stats,
        totalCommission: totalRevenue._sum.mechanicCommission || 0,
        urgentCount: urgentMetrics
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get metrics by car model
  async getMetricsByCarModel(req) {
    try {
      const { carModel, carBuildYear, page = 1, limit = 10 } = req.query;

      const where = {
        carModel: { contains: carModel },
        ...(carBuildYear && { carBuildYear })
      };

      const metrics = await prisma.metric.findMany({
        where,
        include: {
          garage: true,
          partSpecifications: true
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.metric.count({ where });

      return this.success({
        metrics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get supplier performance metrics
  async getSupplierPerformanceMetrics(req) {
    try {
      const { supplierStoreId } = req.params;

      const performance = await prisma.wasSupplierStoreMetricAssignmentSuccessful.aggregate({
        where: { supplierStoreId },
        _avg: {
          successRate: true,
          salePrice: true
        },
        _sum: {
          successfulAssignments: true,
          totalMetricAssignments: true
        }
      });

      const recentSales = await prisma.wasSupplierStoreMetricAssignmentSuccessful.findMany({
        where: { supplierStoreId },
        include: {
          metric: {
            include: {
              partSpecifications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      return this.success({
        averageSuccessRate: performance._avg.successRate || 0,
        averageSalePrice: performance._avg.salePrice || 0,
        totalSuccessfulAssignments: performance._sum.successfulAssignments || 0,
        totalAssignments: performance._sum.totalMetricAssignments || 0,
        recentSales
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get expiring metrics (parts near replacement)
  async getExpiringMetrics(req) {
    try {
      const { daysThreshold = 30, page = 1, limit = 10 } = req.query;
      const garageId = await this.#validateGarageAccess(req.user.id);

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + parseInt(daysThreshold));

      const where = {
        garageId,
        nextInspectionDate: {
          lte: thresholdDate
        },
        isAvailable: true
      };

      const metrics = await prisma.metric.findMany({
        where,
        include: {
          client: true,
          partSpecifications: true
        },
        orderBy: {
          nextInspectionDate: 'asc'
        },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      const total = await prisma.metric.count({ where });

      return this.success({
        metrics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Update metric status in bulk
  async updateMetricsStatus(req) {
    try {
      const { metricIds, status } = req.body;
      const garageId = await this.#validateGarageAccess(req.user.id);

      const updatePromises = metricIds.map(id =>
        prisma.metric.updateMany({
          where: {
            id,
            garageId // Ensure garage ownership
          },
          data: {
            metricStatus: status,
            updatedAt: new Date()
          }
        })
      );

      await prisma.$transaction(updatePromises);

      return this.success({
        message: "وضعیت متریک‌ها با موفقیت به‌روزرسانی شد",
        updatedCount: metricIds.length
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get client metric history
  async getClientMetricHistory(req) {
    try {
      const { clientId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const metrics = await prisma.metric.findMany({
        where: { clientId },
        include: {
          garage: true,
          partSpecifications: true,
          wasSupplierStoreMetricAssignmentSuccessful: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      const total = await prisma.metric.count({ where: { clientId } });

      // Calculate statistics
      const totalSpent = await prisma.wasSupplierStoreMetricAssignmentSuccessful.aggregate({
        where: { clientId },
        _sum: {
          salePrice: true
        }
      });

      return this.success({
        metrics,
        statistics: {
          totalMetrics: total,
          totalSpent: totalSpent._sum.salePrice || 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get metrics analytics by part type
  async getMetricsAnalyticsByPart(req) {
    try {
      const { startDate, endDate } = req.query;
      const garageId = await this.#validateGarageAccess(req.user.id);

      const dateFilter = {
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      };

      const partAnalytics = await prisma.partSpecification.groupBy({
        by: ['partType'],
        where: {
          metric: {
            garageId,
            ...dateFilter
          }
        },
        _count: true,
        _avg: {
          estimatedCost: true
        }
      });

      return this.success({
        analytics: partAnalytics.map(item => ({
          partType: item.partType,
          count: item._count,
          averageCost: item._avg?.estimatedCost || 0
        }))
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get metrics revenue forecast
  async getMetricsRevenueForecast(req) {
    try {
      const garageId = await this.#validateGarageAccess(req.user.id);

      const pendingMetrics = await prisma.metric.findMany({
        where: {
          garageId,
          metricStatus: 'NEEDS_REPLACEMENT',
          isAvailable: true
        },
        include: {
          partSpecifications: true
        }
      });

      const forecast = pendingMetrics.reduce((acc, metric) => {
        const totalEstimatedCost = metric.partSpecifications.reduce(
          (sum, part) => sum + (part.estimatedCost || 0),
          0
        );
        const potentialCommission = totalEstimatedCost * (metric.mechanicCommissionPercentage / 100);
        return acc + potentialCommission;
      }, 0);

      return this.success({
        pendingMetricsCount: pendingMetrics.length,
        potentialRevenue: forecast,
        averageRevenuePerMetric: pendingMetrics.length ? forecast / pendingMetrics.length : 0
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get supplier recommendations for metric
  async getSupplierRecommendations(req) {
    try {
      const { metricId } = req.params;
      const metric = await prisma.metric.findUnique({
        where: { id: metricId },
        include: {
          partSpecifications: true
        }
      });

      if (!metric) {
        throw createError(HttpStatus.NOT_FOUND, "متریک مورد نظر یافت نشد");
      }

      // Find suppliers with similar successful transactions
      const recommendedSuppliers = await prisma.supplierStore.findMany({
        where: {
          wasSupplierStoreMetricAssignmentSuccessful: {
            some: {
              partSpecifications: {
                some: {
                  partType: {
                    in: metric.partSpecifications.map(p => p.partType)
                  }
                }
              },
              successRate: {
                gte: 0.8 // 80% success rate threshold
              }
            }
          }
        },
        include: {
          wasSupplierStoreMetricAssignmentSuccessful: {
            where: {
              partSpecifications: {
                some: {
                  partType: {
                    in: metric.partSpecifications.map(p => p.partType)
                  }
                }
              }
            },
            take: 5,
            orderBy: {
              successRate: 'desc'
            }
          }
        },
        take: 5
      });

      return this.success({
        metric,
        recommendedSuppliers: recommendedSuppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          averageSuccessRate: supplier.wasSupplierStoreMetricAssignmentSuccessful.reduce(
            (acc, assignment) => acc + assignment.successRate,
            0
          ) / supplier.wasSupplierStoreMetricAssignmentSuccessful.length,
          relevantTransactions: supplier.wasSupplierStoreMetricAssignmentSuccessful.length
        }))
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get metrics maintenance schedule
  async getMaintenanceSchedule(req) {
    try {
      const { startDate, endDate } = req.query;
      const garageId = await this.#validateGarageAccess(req.user.id);

      const schedule = await prisma.metric.findMany({
        where: {
          garageId,
          nextInspectionDate: {
            gte: startDate ? new Date(startDate) : new Date(),
            lte: endDate ? new Date(endDate) : undefined
          },
          isAvailable: true
        },
        include: {
          client: true,
          partSpecifications: true
        },
        orderBy: {
          nextInspectionDate: 'asc'
        }
      });

      // Group by date
      const groupedSchedule = schedule.reduce((acc, metric) => {
        const date = metric.nextInspectionDate.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(metric);
        return acc;
      }, {});

      return this.success({
        schedule: Object.entries(groupedSchedule).map(([date, metrics]) => ({
          date,
          metrics,
          totalAppointments: metrics.length,
          estimatedTotalWork: metrics.reduce(
            (sum, metric) => sum + metric.partSpecifications.length,
            0
          )
        }))
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get comparative metrics analysis
  async getComparativeAnalysis(req) {
    try {
      const { carModel, partType } = req.query;
      const garageId = await this.#validateGarageAccess(req.user.id);

      const analysis = await prisma.metric.groupBy({
        by: ['carBuildYear'],
        where: {
          garageId,
          carModel,
          partSpecifications: {
            some: {
              partType
            }
          }
        },
        _avg: {
          currentUsage: true,
          maxLifespan: true
        },
        _count: true
      });

      return this.success({
        carModel,
        partType,
        yearlyAnalysis: analysis.map(year => ({
          buildYear: year.carBuildYear,
          averageUsage: year._avg.currentUsage,
          averageLifespan: year._avg.maxLifespan,
          sampleSize: year._count,
          reliabilityScore: (year._avg.maxLifespan / year._avg.currentUsage) * 100
        }))
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  async addReviewForMetric(req, res, next) {
    try {
        // ثبت کامنت نظر امتیاز توسط طرفین همکاری به یکدیگر در این همکاری
        await transactionService.apprentice.addReview(
            req.user,
            req.params.noticeApprenticeId,
            req.body
        );
        return res.status(HttpStatus.OK).json({
            statusCode: HttpStatus.OK,
            data: {
                message: "باتشکر...نظر و امتیاز شما برای این همکاری ثبت شد"
            }
        });
    } catch (error) {
        next(error);
    }
  }

  async createTransactionRoom(req, res, next) {
      try {
          // ایجاد اتاق دایرکت مسج برای ارتباط طرفین همکاری با یکدیگر
          const conversation = await conversationService.createTransactionRoom(
              req.params.transactionId,
              req.user.id
          );
          return res.status(HttpStatus.CREATED).json({
              statusCode: HttpStatus.CREATED,
              data: {
                  message: "اتاق گفتگو با موفقیت ایجاد شد",
                  conversationId: conversation.id
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async sendMessage(req, res, next) {
      try {
          const message = await conversationService.sendMessage(
              req.params.conversationId,
              req.user.id,
              req.body,
              req.files
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  message: "پیام با موفقیت ارسال شد",
                  messageData: message
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async getMessages(req, res, next) {
      try {
          const { messages, totalMessages } = await conversationService.getMessages(
              req.params.conversationId,
              req.user.id,
              req.query.page,
              req.query.limit
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  messages,
                  pagination: {
                      currentPage: Number(req.query.page),
                      totalPages: Math.ceil(totalMessages / req.query.limit),
                      totalMessages,
                      limit: Number(req.query.limit)
                  }
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async getUserConversations(req, res, next) {
      try {
          const { conversations, totalConversations } = await conversationService.getUserConversations(
              req.user.id,
              req.query.page,
              req.query.limit,
              req.query.status
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  conversations,
                  pagination: {
                      currentPage: Number(req.query.page),
                      totalPages: Math.ceil(totalConversations / req.query.limit),
                      totalConversations,
                      limit: Number(req.query.limit)
                  }
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async markMessagesAsRead(req, res, next) {
      try {
          const { count } = await conversationService.markMessagesAsRead(
              req.params.conversationId,
              req.user.id
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  message: count > 0 
                      ? "پیام‌ها به عنوان خوانده شده علامت‌گذاری شدند"
                      : "پیام ناخوانده‌ای وجود ندارد",
                  count
              }
          });
      } catch (error) {
          next(error);
      }
  }

  async getConversationDetails(req, res, next) {
      try {
          const conversationDetails = await conversationService.getConversationDetails(
              req.params.conversationId,
              req.user.id
          );
          return res.status(HttpStatus.OK).json({
              statusCode: HttpStatus.OK,
              data: {
                  conversation: conversationDetails
              }
          });
      } catch (error) {
          next(error);
      }
  }
  
  //////////////////////////////////////////////////////////////


  // New Clan Metric Methods

  // Create a new clan metric
  async createClanMetric(req) {
    try {
      const garageId = await this.#validateGarageAccess(req.user.id);
      const membership = await this.#validateClanMembership(req.user.id, req.body.clanId);

      const {
        title,
        description,
        carModel,
        carBuildYear,
        currentUsage,
        maxLifespan,
        priority,
        visibilityScope,
        collaborationType,
        minSupplierTier,
        partSpecifications,
        clanId
      } = req.body;

      const clanMetric = await prisma.clanMetric.create({
        data: {
          title,
          description,
          carModel,
          carBuildYear,
          currentUsage,
          maxLifespan,
          priority,
          visibilityScope,
          collaborationType,
          minSupplierTier,
          creatorGarageId: garageId,
          clanId,
          partSpecifications: {
            create: partSpecifications
          },
          collaborators: {
            create: {
              memberId: membership.id,
              role: 'MANAGER'
            }
          }
        },
        include: {
          partSpecifications: true,
          collaborators: true
        }
      });

      return this.success({
        message: "متریک کلن با موفقیت ایجاد شد",
        clanMetric
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get clan metrics with filtering
  async getClanMetrics(req) {
    try {
      const { clanId, status, visibilityScope, collaborationType } = req.query;
      
      await this.#validateClanMembership(req.user.id, clanId);

      const metrics = await prisma.clanMetric.findMany({
        where: {
          clanId,
          ...(status && { metricStatus: status }),
          ...(visibilityScope && { visibilityScope }),
          ...(collaborationType && { collaborationType })
        },
        include: {
          partSpecifications: true,
          collaborators: {
            include: {
              member: true
            }
          },
          supplierBids: {
            include: {
              supplier: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return this.success({ metrics });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Submit a bid for a clan metric
  async submitClanMetricBid(req) {
    try {
      const { metricId } = req.params;
      const { bidAmount, description, estimatedDeliveryTime } = req.body;

      const supplier = await prisma.supplierStore.findFirst({
        where: { ownerId: req.user.id }
      });

      if (!supplier) {
        throw createError(HttpStatus.UNAUTHORIZED, "فقط تامین‌کنندگان می‌توانند پیشنهاد ارائه دهند");
      }

      const metric = await prisma.clanMetric.findUnique({
        where: { id: metricId },
        include: { clan: true }
      });

      if (!metric) {
        throw createError(HttpStatus.NOT_FOUND, "متریک مورد نظر یافت نشد");
      }

      const bid = await prisma.clanMetricBid.create({
        data: {
          clanMetricId: metricId,
          supplierId: supplier.id,
          bidAmount,
          description,
          estimatedDeliveryTime: new Date(estimatedDeliveryTime)
        }
      });

      return this.success({
        message: "پیشنهاد شما با موفقیت ثبت شد",
        bid
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Assign clan metric to supplier
  async assignClanMetricToSupplier(req) {
    try {
      const { metricId, supplierId } = req.params;
      const { finalAmount } = req.body;

      const membership = await prisma.clanMetricCollaborator.findFirst({
        where: {
          clanMetricId: metricId,
          member: {
            userId: req.user.id
          },
          role: 'MANAGER'
        }
      });

      if (!membership) {
        throw createError(HttpStatus.UNAUTHORIZED, "شما دسترسی لازم برای این عملیات را ندارید");
      }

      const assignment = await prisma.clanMetricAssignment.create({
        data: {
          clanMetricId: metricId,
          supplierId,
          finalAmount,
          status: 'PENDING'
        }
      });

      // Update metric status
      await prisma.clanMetric.update({
        where: { id: metricId },
        data: { metricStatus: 'IN_PROGRESS' }
      });

      return this.success({
        message: "متریک با موفقیت به تامین‌کننده اختصاص داده شد",
        assignment
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Update clan metric assignment status
  async updateClanMetricAssignment(req) {
    try {
      const { assignmentId } = req.params;
      const { status, ratings } = req.body;

      const assignment = await prisma.clanMetricAssignment.findUnique({
        where: { id: assignmentId },
        include: { clanMetric: true }
      });

      if (!assignment) {
        throw createError(HttpStatus.NOT_FOUND, "تخصیص مورد نظر یافت نشد");
      }

      const updatedAssignment = await prisma.clanMetricAssignment.update({
        where: { id: assignmentId },
        data: {
          status,
          ...(ratings && {
            qualityRating: ratings.quality,
            deliverySpeed: ratings.delivery,
            communication: ratings.communication,
            overallRating: (ratings.quality + ratings.delivery + ratings.communication) / 3
          }),
          ...(status === 'COMPLETED' && { completedAt: new Date() })
        }
      });

      if (status === 'COMPLETED') {
        await prisma.clanMetric.update({
          where: { id: assignment.clanMetricId },
          data: { 
            metricStatus: 'COMPLETED',
            completedAt: new Date()
          }
        });
      }

      return this.success({
        message: "وضعیت تخصیص با موفقیت بروزرسانی شد",
        assignment: updatedAssignment
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get clan metric analytics
  async getClanMetricAnalytics(req) {
    try {
      const { clanId } = req.params;
      const { startDate, endDate } = req.query;

      await this.#validateClanMembership(req.user.id, clanId);

      const dateFilter = {
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      };

      const [metrics, assignments, bids] = await Promise.all([
        prisma.clanMetric.count({
          where: { clanId, ...dateFilter }
        }),
        prisma.clanMetricAssignment.findMany({
          where: {
            clanMetric: {
              clanId,
              ...dateFilter
            }
          },
          include: {
            supplier: true
          }
        }),
        prisma.clanMetricBid.count({
          where: {
            clanMetric: {
              clanId,
              ...dateFilter
            }
          }
        })
      ]);

      const completedAssignments = assignments.filter(a => a.status === 'COMPLETED');
      const averageRatings = completedAssignments.reduce((acc, curr) => ({
        quality: acc.quality + (curr.qualityRating || 0),
        delivery: acc.delivery + (curr.deliverySpeed || 0),
        communication: acc.communication + (curr.communication || 0)
      }), { quality: 0, delivery: 0, communication: 0 });

      const totalAssignments = completedAssignments.length;

      return this.success({
        totalMetrics: metrics,
        totalBids: bids,
        completedAssignments: totalAssignments,
        averageRatings: totalAssignments ? {
          quality: averageRatings.quality / totalAssignments,
          delivery: averageRatings.delivery / totalAssignments,
          communication: averageRatings.communication / totalAssignments
        } : null,
        topSuppliers: assignments
          .reduce((acc, curr) => {
            const supplier = acc.find(s => s.id === curr.supplier.id);
            if (supplier) {
              supplier.completedJobs++;
              supplier.totalRating += curr.overallRating || 0;
            } else {
              acc.push({
                id: curr.supplier.id,
                name: curr.supplier.name,
                completedJobs: 1,
                totalRating: curr.overallRating || 0
              });
            }
            return acc;
          }, [])
          .sort((a, b) => (b.totalRating / b.completedJobs) - (a.totalRating / a.completedJobs))
          .slice(0, 5)
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }


  // Get clan metric collaboration opportunities
  async getCollaborationOpportunities(req) {
    try {
      const { clanId } = req.params;
      const { supplierTier, partTypes } = req.query;
      
      await this.#validateClanMembership(req.user.id, clanId);

      const opportunities = await prisma.clanMetric.findMany({
        where: {
          clanId,
          metricStatus: 'PENDING',
          collaborationType: 'MULTI_SUPPLIER',
          minSupplierTier: supplierTier ? supplierTier : undefined,
          partSpecifications: partTypes ? {
            some: {
              partType: {
                in: Array.isArray(partTypes) ? partTypes : [partTypes]
              }
            }
          } : undefined
        },
        include: {
          partSpecifications: true,
          collaborators: {
            include: {
              member: true
            }
          },
          assignments: {
            include: {
              supplier: true
            }
          }
        }
      });

      return this.success({
        opportunities: opportunities.map(opportunity => ({
          ...opportunity,
          availableSlots: opportunity.collaborationType === 'MULTI_SUPPLIER' 
            ? Math.max(0, 3 - opportunity.assignments.length) // Assuming max 3 suppliers per metric
            : opportunity.assignments.length === 0 ? 1 : 0
        }))
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Add collaborator to clan metric
  async addMetricCollaborator(req) {
    try {
      const { metricId } = req.params;
      const { memberId, role } = req.body;

      const metric = await prisma.clanMetric.findUnique({
        where: { id: metricId },
        include: {
          collaborators: true
        }
      });

      if (!metric) {
        throw createError(HttpStatus.NOT_FOUND, "متریک مورد نظر یافت نشد");
      }

      // Check if requester is a manager
      const requesterCollaborator = metric.collaborators.find(
        c => c.memberId === req.user.id && c.role === 'MANAGER'
      );

      if (!requesterCollaborator) {
        throw createError(HttpStatus.UNAUTHORIZED, "شما دسترسی لازم برای افزودن همکار را ندارید");
      }

      const collaborator = await prisma.clanMetricCollaborator.create({
        data: {
          clanMetricId: metricId,
          memberId,
          role
        },
        include: {
          member: true
        }
      });

      return this.success({
        message: "همکار جدید با موفقیت اضافه شد",
        collaborator
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get clan metric performance report
  async getClanMetricPerformanceReport(req) {
    try {
      const { clanId } = req.params;
      const { startDate, endDate } = req.query;

      await this.#validateClanMembership(req.user.id, clanId);

      const dateFilter = {
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      };

      const metrics = await prisma.clanMetric.findMany({
        where: {
          clanId,
          ...dateFilter
        },
        include: {
          assignments: {
            include: {
              supplier: true
            }
          },
          partSpecifications: true
        }
      });

      const report = {
        totalMetrics: metrics.length,
        completedMetrics: metrics.filter(m => m.metricStatus === 'COMPLETED').length,
        totalValue: metrics.reduce((sum, m) => 
          sum + (m.assignments.reduce((total, a) => total + a.finalAmount, 0)), 0
        ),
        averageCompletionTime: metrics
          .filter(m => m.completedAt)
          .reduce((sum, m) => sum + (m.completedAt - m.createdAt), 0) / 
          metrics.filter(m => m.completedAt).length,
        partTypeDistribution: metrics.reduce((acc, m) => {
          m.partSpecifications.forEach(p => {
            acc[p.partType] = (acc[p.partType] || 0) + 1;
          });
          return acc;
        }, {}),
        supplierPerformance: metrics
          .flatMap(m => m.assignments)
          .reduce((acc, assignment) => {
            const supplier = acc.find(s => s.id === assignment.supplier.id);
            if (supplier) {
              supplier.totalAssignments++;
              supplier.completedAssignments += assignment.status === 'COMPLETED' ? 1 : 0;
              supplier.totalRating += assignment.overallRating || 0;
              supplier.totalValue += assignment.finalAmount;
            } else {
              acc.push({
                id: assignment.supplier.id,
                name: assignment.supplier.name,
                totalAssignments: 1,
                completedAssignments: assignment.status === 'COMPLETED' ? 1 : 0,
                totalRating: assignment.overallRating || 0,
                totalValue: assignment.finalAmount
              });
            }
            return acc;
          }, [])
          .map(s => ({
            ...s,
            averageRating: s.totalRating / s.completedAssignments,
            completionRate: (s.completedAssignments / s.totalAssignments) * 100
          }))
      };

      return this.success({ report });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Update clan metric visibility and collaboration settings
  async updateClanMetricSettings(req) {
    try {
      const { metricId } = req.params;
      const { 
        visibilityScope, 
        collaborationType, 
        minSupplierTier,
        mechanicCommissionPercentage,
        supplierCommissionPercentage,
        clanCommissionPercentage
      } = req.body;

      const metric = await prisma.clanMetric.findUnique({
        where: { id: metricId },
        include: {
          collaborators: true
        }
      });

      if (!metric) {
        throw createError(HttpStatus.NOT_FOUND, "متریک مورد نظر یافت نشد");
      }

      // Validate requester is manager
      const isManager = metric.collaborators.some(
        c => c.memberId === req.user.id && c.role === 'MANAGER'
      );

      if (!isManager) {
        throw createError(HttpStatus.UNAUTHORIZED, "شما دسترسی لازم برای تغییر تنظیمات را ندارید");
      }

      const updatedMetric = await prisma.clanMetric.update({
        where: { id: metricId },
        data: {
          visibilityScope,
          collaborationType,
          minSupplierTier,
          mechanicCommissionPercentage,
          supplierCommissionPercentage,
          clanCommissionPercentage
        }
      });

      return this.success({
        message: "تنظیمات متریک با موفقیت بروزرسانی شد",
        metric: updatedMetric
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }

  // Get clan metric inspection schedule
  async getClanMetricInspectionSchedule(req) {
    try {
      const { clanId } = req.params;
      const { startDate, endDate } = req.query;

      await this.#validateClanMembership(req.user.id, clanId);

      const schedule = await prisma.clanMetric.findMany({
        where: {
          clanId,
          nextInspectionDate: {
            gte: startDate ? new Date(startDate) : new Date(),
            lte: endDate ? new Date(endDate) : undefined
          }
        },
        include: {
          creatorGarage: true,
          partSpecifications: true,
          collaborators: {
            include: {
              member: true
            }
          }
        },
        orderBy: {
          nextInspectionDate: 'asc'
        }
      });

      // Group by date and calculate workload
      const groupedSchedule = schedule.reduce((acc, metric) => {
        const date = metric.nextInspectionDate.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            metrics: [],
            totalParts: 0,
            estimatedWorkHours: 0
          };
        }
        
        acc[date].metrics.push(metric);
        acc[date].totalParts += metric.partSpecifications.length;
        acc[date].estimatedWorkHours += metric.partSpecifications.length * 1.5; // Assuming 1.5 hours per part
        
        return acc;
      }, {});

      return this.success({
        schedule: Object.values(groupedSchedule)
      });
    } catch (error) {
      throw createError(HttpStatus.BAD_REQUEST, error.message);
    }
  }
  
}

module.exports = {
  MetricsController: new MetricsController()
};

/*
روال ترنزاکشن در بخش متریک:
بخش متریک با بخش شاپ و پروداکت خیلی ارتباط نزدیکی دارند....
درسته که تعداد زیادی مکانیک و شاگرد توی پلتفرم هستن که خودشون هم ماشین دارن و به نوعی مخاطب لوازم یدکی و محصولات و غیره هستن....
اما تمرکز بیشتر بر کلاینت ها هست..
ببین ما کلاینت ها رو مجبور میکنیم که pwa رو نصب کنند....
بعد تبلیغات هدفمند و فید هدفمند و هوشمند بر اساس نیازی که میدونیم کلاینت داره با توجه به متریکی که مکانیک ازش ثبت کرده نشونش میدیم..
متلا مکانیک ثبت کرده که روکش صندلی هاش پاره هستن.. ما دیگه هی محصولات و تبلیغات بیشتر با تمرکز بر روکش صندلی بهش نشون میدیم و براش پوش نوتیفیکیشن می‌فرستیم.....
از طرفی چون پلتفرم واسط بین کلاینت و تامین کننده هسن ما
 میدونیم که آیا خزید زد یا نه چون بخش خرید رو خودمون هندل میکنیم ولی بخش پرداخت رو میگیم خودت با تامین کننده درست کن...
  حالا یا حضوری برو یا تسویه بعد از دریافت باشه.. بله
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
اما روال چطور باید باشه ببین مکانیک تمام کاستی ها اینکه چه قطعاتی به اخر طول عمرشون رسیدن ولی مشتری راضی
نمیشه که تعویض کنه رو ثبت میکنه ....حالا ما میدونیم چه مشتری دقیقا چه نیاز های اسپسیفیکی داره..
ما توی بنر اصلی پی دبلیو ای قرار هست دقیقا از این منطق استفاده کنیم... تامین کننده ها میبینن که 
این کلاینت براش این متریک ها ثبت شده و میتونن بوکمارک کنن یا به کوله اضافه کنن تا یادشون نره ولی 
محدودیتی نیست که چه تعداد تامین کننده از این متریک استفاده کنن...
حالا این تامین کننده ها یک بنر اختصاصی درست میکنن مثلا روکش صندلی با تخفیف فقط امروز انقدر
و این توی بنر اصلی کلاینت تبلیغ میشه یا یک تامین کننده دیگه یک قطعه دیگه.. و این بنر اسلایدر هست
همچنین میتونند برای دایرکت مسج کلاینت پیام ارسال کنند و با عکس و وویس کیفیت محصولشون رو عرضه کنند...
و اینطوری به فروش محصولاتشون به کلاینت های بالقوه استفاده کنن.. اما اطلاعاتی از کلاینت ندارن و کلاینت باید درخواست خرید
رو از طریق پلتفرم ما انجام بده بعد ارسال و پرداخت درب خانه و تایید دوطرفه انجام ترنزاکشن و حالا 
ما میگیم به تامین کننده که حالا که فروش موفق داشتی حق مکانیک رو واریز کن و مکانیک رو 
هم در جریان میزاریم که به فروش منتج شد متریکت... و باز همون مراحل شکایت هم هستو بن شدن تامین کننده در 
صورت زیرآبی رفتن... ما میدونیم که مشتری یکبار درخواست خرید ثبت کرده و یکبار تایید کرده پس مطمین میشیم که
خرید ثبت شد اما اگه تامین کننده بهش گفت تایید نکن تا این سهم مکانیک رو نده چی؟
مکانیک برعکس تامین کننده به شماره مشتری دسترسی داره و ما بهش میگیم این ترنزاکشن یکبار درخواست
خرید ثبت شد پس زنگ بزن به مشتری و پیگیری کن اگه خریده بود شکایت ثبت کن تا بنش کنیم
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
اما متریک های با تگ فوری:

*/





//     addMetricByIdToCooleh(req, res, next){
//     try {
//         const suplierStoreID = req.user.suplierStoreID;
//         const {metricID} = req.parms;
//         await this.findMetricById(metricID);

//   let AddMetric = await MetricsModel.findOne({
//             _id: metricID,
//             suplierStoreID : suplierStoreID
//         })
//         const updateQuery = AddMetric? {$pull:{suplierStoreID: suplierStoreID}} : {$push: {suplierStoreID: suplierStoreID}}
//         await MetricsModel.updateOne({ _id: metricID }, updateQuery)
//         let message
//         if(!AddMetric){ 
//             message = "متریک به کوله شما اضافه شد"
//         } else message = "متریک از کوله شما حذف شد"

//         return res.status(HttpStatus.OK).json({
//             statusCode: HttpStatus.OK,
//             data : {
//                 message
//             }
//         })

//     } catch (error) {
//         next(error)
//     }
//    }
//     peleMetricById
//     successSellMetricById
 