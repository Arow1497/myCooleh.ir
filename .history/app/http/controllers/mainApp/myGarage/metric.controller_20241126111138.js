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
  
}

module.exports = {
  MetricsController: new MetricsController()
};








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
 