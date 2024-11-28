// for both supplierStores and freelancer suppliers
const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CouponsController extends Controller {
  // Private helper methods
  async #validateSupplierStoreAccess(userId) {
    const user = await prisma.projectProfile.findUnique({
      where: { id: userId },
      include: { supplierStore: true }
    });

    if (!user?.supplierStore) {
      throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین فروشگاه قطعات مجاز است");
    }
    return user.supplierStore.id;
  }

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

  async #getCouponById(couponId) {
    const coupon = await prisma.coupons.findUnique({
      where: { id: couponId },
      include: {
        supplierStore: true,
        partSpecifications: true,
        acceptorGarages: true,
        successGarages: true
      }
    });

    if (!coupon) {
      throw createError(HttpStatus.NOT_FOUND, "کوپن مورد نظر یافت نشد");
    }
    return coupon;
  }

  // Public methods for coupon management
  async createCoupon(req) {
    const userId = req.user.id;
    const supplierStoreId = await this.#validateSupplierStoreAccess(userId);
    
    const {
      title,
      description,
      city,
      partSpecifications,
      quantity,
      condition,
      urgencyLevel,
      notes
    } = req.body;

    const coupon = await prisma.coupons.create({
      data: {
        publisherId: userId,
        supplierStoreId,
        title,
        description,
        city,
        quantity,
        condition,
        urgencyLevel,
        notes,
        partSpecifications: {
          create: partSpecifications
        }
      },
      include: {
        supplierStore: true,
        partSpecifications: true
      }
    });

    return this.ok(coupon);
  }

  async updateCoupon(req) {
    const userId = req.user.id;
    const couponId = req.params.id;
    await this.#validateSupplierStoreAccess(userId);
    
    const coupon = await this.#getCouponById(couponId);
    
    if (coupon.publisherId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش این کوپن نیستید");
    }

    const updateData = req.body;
    const updatedCoupon = await prisma.coupons.update({
      where: { id: couponId },
      data: updateData,
      include: {
        supplierStore: true,
        partSpecifications: true
      }
    });

    return this.ok(updatedCoupon);
  }

  async deleteCoupon(req) {
    const userId = req.user.id;
    const couponId = req.params.id;
    await this.#validateSupplierStoreAccess(userId);
    
    const coupon = await this.#getCouponById(couponId);
    
    if (coupon.publisherId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به حذف این کوپن نیستید");
    }

    await prisma.coupons.delete({
      where: { id: couponId }
    });

    return this.ok({ message: "کوپن با موفقیت حذف شد" });
  }

  async getCouponDetails(req) {
    const couponId = req.params.id;
    const coupon = await this.#getCouponById(couponId);
    
    // Increment view count
    await prisma.coupons.update({
      where: { id: couponId },
      data: { viewCount: { increment: 1 } }
    });

    return this.ok(coupon);
  }

  async listCoupons(req) {
    const {
      city,
      condition,
      urgencyLevel,
      page = 1,
      limit = 10
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {};

    if (city) where.city = city;
    if (condition) where.condition = condition;
    if (urgencyLevel) where.urgencyLevel = parseInt(urgencyLevel);

    const [coupons, total] = await prisma.$transaction([
      prisma.coupons.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          supplierStore: true,
          partSpecifications: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.coupons.count({ where })
    ]);

    return this.ok({
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  // Garage-related coupon handlers
  async requestCoupon(req) {
    const userId = req.user.id;
    const couponId = req.params.id;
    const garageId = await this.#validateGarageAccess(userId);
    
    const coupon = await this.#getCouponById(couponId);
    
    if (!coupon.isAvailable) {
      throw createError(HttpStatus.BAD_REQUEST, "این کوپن در حال حاضر در دسترس نیست");
    }

    const existingRequest = await prisma.couponGarageAcceptor.findUnique({
      where: {
        couponId_garageId: {
          couponId,
          garageId
        }
      }
    });

    if (existingRequest) {
      throw createError(HttpStatus.CONFLICT, "درخواست شما قبلاً ثبت شده است");
    }

    const request = await prisma.couponGarageAcceptor.create({
      data: {
        couponId,
        garageId,
        status: 'PENDING'
      }
    });

    return this.ok(request);
  }

  async updateCouponRequest(req) {
    const userId = req.user.id;
    const { couponId, garageId } = req.params;
    const { status } = req.body;
    
    await this.#validateSupplierStoreAccess(userId);
    const coupon = await this.#getCouponById(couponId);

    if (coupon.publisherId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به تغییر وضعیت این درخواست نیستید");
    }

    const updatedRequest = await prisma.couponGarageAcceptor.update({
      where: {
        couponId_garageId: {
          couponId,
          garageId
        }
      },
      data: { status }
    });

    return this.ok(updatedRequest);
  }

  async markCouponSuccess(req) {
    const userId = req.user.id;
    const couponId = req.params.id;
    const garageId = await this.#validateGarageAccess(userId);

    const acceptedRequest = await prisma.couponGarageAcceptor.findUnique({
      where: {
        couponId_garageId: {
          couponId,
          garageId
        }
      }
    });

    if (!acceptedRequest || acceptedRequest.status !== 'ACCEPTED') {
      throw createError(HttpStatus.BAD_REQUEST, "شما مجاز به ثبت موفقیت برای این کوپن نیستید");
    }

    const success = await prisma.couponGarageSuccess.create({
      data: {
        couponId,
        garageId
      }
    });

    // Update coupon success count
    await prisma.coupons.update({
      where: { id: couponId },
      data: { successCount: { increment: 1 } }
    });

    return this.ok(success);
  }

  // Social interaction handlers
  async toggleLike(req) {
    const userId = req.user.id;
    const couponId = req.params.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        couponId_userId: {
          couponId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          couponId_userId: {
            couponId,
            userId
          }
        }
      });
      return this.ok({ liked: false });
    }

    await prisma.like.create({
      data: {
        couponId,
        userId
      }
    });

    return this.ok({ liked: true });
  }

  async addComment(req) {
    const userId = req.user.id;
    const couponId = req.params.id;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: {
        couponId,
        userId,
        content
      },
      include: {
        user: true
      }
    });

    return this.ok(comment);
  }

  async toggleBookmark(req) {
    const userId = req.user.id;
    const couponId = req.params.id;

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        couponId_userId: {
          couponId,
          userId
        }
      }
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          couponId_userId: {
            couponId,
            userId
          }
        }
      });
      return this.ok({ bookmarked: false });
    }

    await prisma.bookmark.create({
      data: {
        couponId,
        userId
      }
    });

    return this.ok({ bookmarked: true });
  }


  async getSupplierStoreCoupons(req) {
    const userId = req.user.id;
    const supplierStoreId = await this.#validateSupplierStoreAccess(userId);
    const { status, page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const where = { supplierStoreId };
    
    if (status) where.status = status;

    const [coupons, total] = await prisma.$transaction([
      prisma.coupons.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          acceptorGarages: true,
          successGarages: true,
          partSpecifications: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.coupons.count({ where })
    ]);

    return this.ok({
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  async getGarageAcceptedCoupons(req) {
    const userId = req.user.id;
    const garageId = await this.#validateGarageAccess(userId);
    const { status, page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const where = {
      garageId,
      status: status || 'ACCEPTED'
    };

    const [acceptedCoupons, total] = await prisma.$transaction([
      prisma.couponGarageAcceptor.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          coupon: {
            include: {
              supplierStore: true,
              partSpecifications: true
            }
          }
        },
        orderBy: { acceptedAt: 'desc' }
      }),
      prisma.couponGarageAcceptor.count({ where })
    ]);

    return this.ok({
      coupons: acceptedCoupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  async getGarageSuccessfulCoupons(req) {
    const userId = req.user.id;
    const garageId = await this.#validateGarageAccess(userId);
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const [successfulCoupons, total] = await prisma.$transaction([
      prisma.couponGarageSuccess.findMany({
        where: { garageId },
        skip,
        take: parseInt(limit),
        include: {
          coupon: {
            include: {
              supplierStore: true,
              partSpecifications: true
            }
          }
        },
        orderBy: { succeededAt: 'desc' }
      }),
      prisma.couponGarageSuccess.count({ where: { garageId } })
    ]);

    return this.ok({
      coupons: successfulCoupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  async searchCoupons(req) {
    const { 
      query, 
      city, 
      condition,
      minUrgencyLevel,
      maxUrgencyLevel,
      supplierStoreId,
      page = 1, 
      limit = 10 
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {};

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }
    
    if (city) where.city = city;
    if (condition) where.condition = condition;
    if (supplierStoreId) where.supplierStoreId = supplierStoreId;
    if (minUrgencyLevel || maxUrgencyLevel) {
      where.urgencyLevel = {};
      if (minUrgencyLevel) where.urgencyLevel.gte = parseInt(minUrgencyLevel);
      if (maxUrgencyLevel) where.urgencyLevel.lte = parseInt(maxUrgencyLevel);
    }

    const [coupons, total] = await prisma.$transaction([
      prisma.coupons.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          supplierStore: true,
          partSpecifications: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true,
              successGarages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.coupons.count({ where })
    ]);

    return this.ok({
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  async getCouponStatistics(req) {
    const userId = req.user.id;
    const couponId = req.params.id;
    await this.#validateSupplierStoreAccess(userId);
    
    const coupon = await this.#getCouponById(couponId);
    
    if (coupon.publisherId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به مشاهده آمار این کوپن نیستید");
    }

    const stats = await prisma.coupons.findUnique({
      where: { id: couponId },
      include: {
        _count: {
          select: {
            acceptorGarages: true,
            successGarages: true,
            likes: true,
            comments: true,
            bookmarks: true
          }
        },
        acceptorGarages: {
          select: {
            status: true
          }
        }
      }
    });

    const statusCounts = stats.acceptorGarages.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    return this.ok({
      views: stats.viewCount,
      shares: stats.shareCount,
      likes: stats._count.likes,
      comments: stats._count.comments,
      bookmarks: stats._count.bookmarks,
      totalAcceptors: stats._count.acceptorGarages,
      successfulUsage: stats._count.successGarages,
      statusBreakdown: statusCounts
    });
  }

  async shareCoupon(req) {
    const userId = req.user.id;
    const couponId = req.params.id;
    const { platform } = req.body;

    await this.#getCouponById(couponId);

    const share = await prisma.share.create({
      data: {
        couponId,
        userId,
        platform
      }
    });

    await prisma.coupons.update({
      where: { id: couponId },
      data: { shareCount: { increment: 1 } }
    });

    return this.ok(share);
  }

  async getBookmarkedCoupons(req) {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const [bookmarks, total] = await prisma.$transaction([
      prisma.bookmark.findMany({
        where: { userId },
        skip,
        take: parseInt(limit),
        include: {
          coupon: {
            include: {
              supplierStore: true,
              partSpecifications: true,
              _count: {
                select: {
                  likes: true,
                  comments: true,
                  bookmarks: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bookmark.count({ where: { userId } })
    ]);

    return this.ok({
      bookmarks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  async getCouponComments(req) {
    const couponId = req.params.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where: { couponId },
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.comment.count({ where: { couponId } })
    ]);

    return this.ok({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }


  // New Analytics and Reporting Methods
  async getSupplierAnalytics(req) {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const supplierStoreId = await this.#validateSupplierStoreAccess(userId);
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [couponsStats, garageStats, mechanicStats] = await prisma.$transaction([
      // Coupon performance stats
      prisma.coupons.groupBy({
        by: ['status'],
        where: {
          supplierStoreId,
          createdAt: dateFilter
        },
        _count: {
          _all: true
        },
        _sum: {
          shareCount: true,
          viewCount: true
        }
      }),

      // Garage engagement stats
      prisma.couponGarageAcceptor.groupBy({
        by: ['status'],
        where: {
          coupon: {
            supplierStoreId,
            createdAt: dateFilter
          }
        },
        _count: {
          _all: true
        }
      }),

      // Mechanic engagement stats
      prisma.couponMechanicAcceptor.groupBy({
        by: ['status'],
        where: {
          coupon: {
            supplierStoreId,
            createdAt: dateFilter
          }
        },
        _count: {
          _all: true
        }
      })
    ]);

    return this.ok({
      couponsStats,
      garageStats,
      mechanicStats
    });
  }

  async getTrendingCoupons(req) {
    const { city, category, timeframe = 'week', limit = 10 } = req.query;

    const timeframeMap = {
      day: 1,
      week: 7,
      month: 30
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeMap[timeframe]);

    const where = {
      createdAt: {
        gte: startDate
      },
      isAvailable: true
    };

    if (city) where.city = city;
    if (category) {
      where.partSpecifications = {
        some: { category }
      };
    }

    const trendingCoupons = await prisma.coupons.findMany({
      where,
      take: parseInt(limit),
      include: {
        supplierStore: true,
        partSpecifications: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
            successGarages: true
          }
        }
      },
      orderBy: [
        { viewCount: 'desc' },
        { shareCount: 'desc' }
      ]
    });

    return this.ok({
      timeframe,
      coupons: trendingCoupons
    });
  }

  // Advanced Filtering and Search
  async getRecommendedCoupons(req) {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get user's garage info and previous interactions
    const userProfile = await prisma.projectProfile.findUnique({
      where: { id: userId },
      include: {
        ownedGarage: {
          include: {
            successCoupons: {
              include: {
                coupon: {
                  include: {
                    partSpecifications: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!userProfile?.ownedGarage) {
      throw createError(HttpStatus.BAD_REQUEST, "کاربر گاراژ ندارد");
    }

    // Extract categories from successful coupon usage
    const preferredCategories = userProfile.ownedGarage.successCoupons
      .flatMap(success => success.coupon.partSpecifications
        .map(spec => spec.category));

    // Get recommended coupons based on previous interactions
    const recommendedCoupons = await prisma.coupons.findMany({
      where: {
        isAvailable: true,
        city: userProfile.ownedGarage.city,
        partSpecifications: {
          some: {
            category: {
              in: preferredCategories
            }
          }
        }
      },
      take: parseInt(limit),
      include: {
        supplierStore: true,
        partSpecifications: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return this.ok({
      recommendations: recommendedCoupons
    });
  }

  // Bulk Operations
  async bulkUpdateCoupons(req) {
    const userId = req.user.id;
    const { couponIds, updates } = req.body;
    
    const supplierStoreId = await this.#validateSupplierStoreAccess(userId);

    // Verify ownership of all coupons
    const coupons = await prisma.coupons.findMany({
      where: {
        id: { in: couponIds },
        supplierStoreId,
        publisherId: userId
      }
    });

    if (coupons.length !== couponIds.length) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش برخی از این کوپن‌ها نیستید");
    }

    const updatedCoupons = await prisma.$transaction(
      couponIds.map(id =>
        prisma.coupons.update({
          where: { id },
          data: updates
        })
      )
    );

    return this.ok({
      updatedCount: updatedCoupons.length,
      updatedCoupons
    });
  }

  // Social Interaction Methods
  async toggleCouponBookmark(req) {
    const userId = req.user.id;
    const { couponId } = req.params;

    await this.#getCouponById(couponId);

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        couponId_userId: {
          couponId,
          userId
        }
      }
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          couponId_userId: {
            couponId,
            userId
          }
        }
      });
      return this.ok({ bookmarked: false });
    }

    await prisma.bookmark.create({
      data: {
        couponId,
        userId
      }
    });

    return this.ok({ bookmarked: true });
  }

  async addCouponComment(req) {
    const userId = req.user.id;
    const { couponId } = req.params;
    const { content } = req.body;

    await this.#getCouponById(couponId);

    const comment = await prisma.comment.create({
      data: {
        couponId,
        userId,
        content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true
          }
        }
      }
    });

    return this.ok(comment);
  }

  // Performance and Success Tracking
  async trackCouponSuccess(req) {
    const userId = req.user.id;
    const { couponId } = req.params;
    const { garageId, mechanicId, notes } = req.body;

    const coupon = await this.#getCouponById(couponId);
    
    // Verify garage ownership
    if (garageId) {
      const userGarageId = await this.#validateGarageAccess(userId);
      if (garageId !== userGarageId) {
        throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ثبت موفقیت برای این گاراژ نیستید");
      }
    }

    await prisma.$transaction(async (prisma) => {
      // Update success count
      await prisma.coupons.update({
        where: { id: couponId },
        data: { successCount: { increment: 1 } }
      });

      // Record garage success if applicable
      if (garageId) {
        await prisma.couponGarageSuccess.create({
          data: {
            couponId,
            garageId,
            notes
          }
        });
      }

      // Record mechanic success if applicable
      if (mechanicId) {
        await prisma.couponMechanicSuccess.create({
          data: {
            couponId,
            mechanicId,
            notes
          }
        });
      }
    });

    return this.ok({
      message: "موفقیت با موفقیت ثبت شد",
      couponId,
      garageId,
      mechanicId
    });
  }
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  // Private helper methods
  async #validateClanMembership(userId, clanId) {
    const membership = await prisma.clanMembership.findUnique({
      where: {
        clanId_userId: {
          clanId,
          userId
        }
      }
    });

    if (!membership) {
      throw createError(HttpStatus.FORBIDDEN, "شما عضو این کلن نیستید");
    }
    return membership;
  }




  async #getClanCouponById(couponId, clanId) {
    const coupon = await prisma.clanCoupon.findUnique({
      where: {
        clanId_id: {
          id: couponId,
          clanId
        }
      },
      include: {
        clan: true,
        supplierStore: true,
        partSpecifications: true,
        acceptorGarages: true,
        successGarages: true
      }
    });

    if (!coupon) {
      throw createError(HttpStatus.NOT_FOUND, "کوپن مورد نظر یافت نشد");
    }
    return coupon;
  }

  // Clan Coupon Management
  async createClanCoupon(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const supplierStoreId = await this.#validateSupplierStoreAccess(userId);
    await this.#validateClanMembership(userId, clanId);
    
    const {
      title,
      description,
      city,
      partSpecifications,
      quantity,
      condition,
      urgencyLevel,
      notes,
      requirements
    } = req.body;

    const coupon = await prisma.clanCoupon.create({
      data: {
        clanId,
        publisherId: userId,
        supplierStoreId,
        title,
        description,
        city,
        quantity,
        condition,
        urgencyLevel,
        notes,
        requirements,
        partSpecifications: {
          create: partSpecifications
        }
      },
      include: {
        clan: true,
        supplierStore: true,
        partSpecifications: true
      }
    });

    return this.ok(coupon);
  }

  async updateClanCoupon(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    await this.#validateClanMembership(userId, clanId);
    
    const coupon = await this.#getClanCouponById(couponId, clanId);
    
    if (coupon.publisherId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش این کوپن نیستید");
    }

    const updateData = req.body;
    const updatedCoupon = await prisma.clanCoupon.update({
      where: {
        clanId_id: {
          id: couponId,
          clanId
        }
      },
      data: updateData,
      include: {
        clan: true,
        supplierStore: true,
        partSpecifications: true
      }
    });

    return this.ok(updatedCoupon);
  }

  async deleteClanCoupon(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    await this.#validateClanMembership(userId, clanId);
    
    const coupon = await this.#getClanCouponById(couponId, clanId);
    
    if (coupon.publisherId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به حذف این کوپن نیستید");
    }

    await prisma.clanCoupon.delete({
      where: {
        clanId_id: {
          id: couponId,
          clanId
        }
      }
    });

    return this.ok({ message: "کوپن با موفقیت حذف شد" });
  }

  // Clan Coupon Listing and Details
  async listClanCoupons(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const {
      city,
      condition,
      urgencyLevel,
      page = 1,
      limit = 10
    } = req.query;

    await this.#validateClanMembership(userId, clanId);

    const skip = (page - 1) * limit;
    const where = { clanId };

    if (city) where.city = city;
    if (condition) where.condition = condition;
    if (urgencyLevel) where.urgencyLevel = parseInt(urgencyLevel);

    const [coupons, total] = await prisma.$transaction([
      prisma.clanCoupon.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          supplierStore: true,
          partSpecifications: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true,
              successGarages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.clanCoupon.count({ where })
    ]);

    return this.ok({
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  async getClanCouponDetails(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    
    await this.#validateClanMembership(userId, clanId);
    const coupon = await this.#getClanCouponById(couponId, clanId);
    
    // Increment view count
    await prisma.clanCoupon.update({
      where: {
        clanId_id: {
          id: couponId,
          clanId
        }
      },
      data: { viewCount: { increment: 1 } }
    });

    return this.ok(coupon);
  }

  // Garage Interaction with Clan Coupons
  async requestClanCoupon(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    const garageId = await this.#validateGarageAccess(userId);
    
    await this.#validateClanMembership(userId, clanId);
    const coupon = await this.#getClanCouponById(couponId, clanId);
    
    if (!coupon.isAvailable) {
      throw createError(HttpStatus.BAD_REQUEST, "این کوپن در حال حاضر در دسترس نیست");
    }

    const existingRequest = await prisma.clanCouponGarageAcceptor.findUnique({
      where: {
        couponId_garageId: {
          couponId,
          garageId
        }
      }
    });

    if (existingRequest) {
      throw createError(HttpStatus.CONFLICT, "درخواست شما قبلاً ثبت شده است");
    }

    const request = await prisma.clanCouponGarageAcceptor.create({
      data: {
        couponId,
        garageId,
        status: 'PENDING'
      }
    });

    return this.ok(request);
  }

  async updateClanCouponRequest(req) {
    const userId = req.user.id;
    const { clanId, couponId, garageId } = req.params;
    const { status } = req.body;
    
    await this.#validateClanMembership(userId, clanId);
    const coupon = await this.#getClanCouponById(couponId, clanId);

    if (coupon.publisherId !== userId) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به تغییر وضعیت این درخواست نیستید");
    }

    const updatedRequest = await prisma.clanCouponGarageAcceptor.update({
      where: {
        couponId_garageId: {
          couponId,
          garageId
        }
      },
      data: { status }
    });

    return this.ok(updatedRequest);
  }

  async markClanCouponSuccess(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    const garageId = await this.#validateGarageAccess(userId);

    await this.#validateClanMembership(userId, clanId);
    
    const acceptedRequest = await prisma.clanCouponGarageAcceptor.findUnique({
      where: {
        couponId_garageId: {
          couponId,
          garageId
        }
      }
    });

    if (!acceptedRequest || acceptedRequest.status !== 'ACCEPTED') {
      throw createError(HttpStatus.BAD_REQUEST, "شما مجاز به ثبت موفقیت برای این کوپن نیستید");
    }

    const success = await prisma.clanCouponGarageSuccess.create({
      data: {
        couponId,
        garageId
      }
    });

    // Update coupon success count
    await prisma.clanCoupon.update({
      where: {
        clanId_id: {
          id: couponId,
          clanId
        }
      },
      data: { successCount: { increment: 1 } }
    });

    return this.ok(success);
  }

  // Social Interactions
  async toggleClanCouponLike(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    
    await this.#validateClanMembership(userId, clanId);
    await this.#getClanCouponById(couponId, clanId);

    const existingLike = await prisma.clanCouponLike.findUnique({
      where: {
        couponId_userId: {
          couponId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.clanCouponLike.delete({
        where: {
          couponId_userId: {
            couponId,
            userId
          }
        }
      });
      return this.ok({ liked: false });
    }

    await prisma.clanCouponLike.create({
      data: {
        couponId,
        userId
      }
    });

    return this.ok({ liked: true });
  }

  async addClanCouponComment(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    const { content } = req.body;
    
    await this.#validateClanMembership(userId, clanId);
    await this.#getClanCouponById(couponId, clanId);

    const comment = await prisma.clanCouponComment.create({
      data: {
        couponId,
        userId,
        content
      },
      include: {
        user: true
      }
    });

    return this.ok(comment);
  }

  async toggleClanCouponBookmark(req) {
    const userId = req.user.id;
    const { clanId, couponId } = req.params;
    
    await this.#validateClanMembership(userId, clanId);
    await this.#getClanCouponById(couponId, clanId);

    const existingBookmark = await prisma.clanCouponBookmark.findUnique({
      where: {
        couponId_userId: {
          couponId,
          userId
        }
      }
    });

    if (existingBookmark) {
      await prisma.clanCouponBookmark.delete({
        where: {
          couponId_userId: {
            couponId,
            userId
          }
        }
      });
      return this.ok({ bookmarked: false });
    }

    await prisma.clanCouponBookmark.create({
      data: {
        couponId,
        userId
      }
    });

    return this.ok({ bookmarked: true });
  }

  // New Analytics Methods
  async getClanCouponAnalytics(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const { startDate, endDate } = req.query;
    
    await this.#validateClanMembership(userId, clanId);

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [totalCoupons, activeCoupons, successMetrics, topGarages] = await prisma.$transaction([
      // Total coupons count
      prisma.clanCoupon.count({
        where: {
          clanId,
          createdAt: dateFilter
        }
      }),
      
      // Active coupons count
      prisma.clanCoupon.count({
        where: {
          clanId,
          isAvailable: true,
          createdAt: dateFilter
        }
      }),
      
      // Success metrics
      prisma.clanCouponGarageSuccess.groupBy({
        by: ['couponId'],
        where: {
          coupon: {
            clanId,
            createdAt: dateFilter
          }
        },
        _count: {
          _all: true
        }
      }),
      
      // Top performing garages
      prisma.clanCouponGarageSuccess.groupBy({
        by: ['garageId'],
        where: {
          coupon: {
            clanId,
            createdAt: dateFilter
          }
        },
        _count: {
          _all: true
        },
        orderBy: {
          _count: {
            _all: 'desc'
          }
        },
        take: 5
      })
    ]);

    return this.ok({
      totalCoupons,
      activeCoupons,
      successRate: totalCoupons ? (successMetrics.length / totalCoupons) * 100 : 0,
      topPerformingGarages: topGarages
    });
  }

  async getClanCouponUsageReport(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const { period = 'monthly' } = req.query;
    
    await this.#validateClanMembership(userId, clanId);

    const periodMap = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodMap[period]);

    const usageStats = await prisma.clanCouponGarageSuccess.groupBy({
      by: ['couponId'],
      where: {
        coupon: {
          clanId,
          createdAt: {
            gte: startDate
          }
        }
      },
      _count: {
        _all: true
      }
    });

    return this.ok({
      period,
      usageStats,
      totalUsage: usageStats.reduce((acc, curr) => acc + curr._count._all, 0)
    });
  }

  // Advanced Search and Filtering
  async searchClanCoupons(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const {
      query,
      categories,
      minUrgencyLevel,
      maxUrgencyLevel,
      minSuccessCount,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    await this.#validateClanMembership(userId, clanId);

    const skip = (page - 1) * limit;
    const where = { clanId };

    // Build search criteria
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (categories) {
      where.partSpecifications = {
        some: {
          category: {
            in: Array.isArray(categories) ? categories : [categories]
          }
        }
      };
    }

    if (minUrgencyLevel || maxUrgencyLevel) {
      where.urgencyLevel = {};
      if (minUrgencyLevel) where.urgencyLevel.gte = parseInt(minUrgencyLevel);
      if (maxUrgencyLevel) where.urgencyLevel.lte = parseInt(maxUrgencyLevel);
    }

    if (minSuccessCount) {
      where.successCount = {
        gte: parseInt(minSuccessCount)
      };
    }

    const [coupons, total] = await prisma.$transaction([
      prisma.clanCoupon.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          supplierStore: true,
          partSpecifications: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true,
              successGarages: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.clanCoupon.count({ where })
    ]);

    return this.ok({
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  // Bulk Operations
  async bulkUpdateClanCoupons(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const { couponIds, updates } = req.body;
    
    await this.#validateClanMembership(userId, clanId);

    // Verify ownership of all coupons
    const coupons = await prisma.clanCoupon.findMany({
      where: {
        id: { in: couponIds },
        clanId,
        publisherId: userId
      }
    });

    if (coupons.length !== couponIds.length) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش برخی از این کوپن‌ها نیستید");
    }

    const updatedCoupons = await prisma.$transaction(
      couponIds.map(id =>
        prisma.clanCoupon.update({
          where: {
            clanId_id: {
              id,
              clanId
            }
          },
          data: updates
        })
      )
    );

    return this.ok({
      updatedCount: updatedCoupons.length,
      updatedCoupons
    });
  }

  // Mechanic-specific handlers
  async getMechanicClanCoupons(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    await this.#validateClanMembership(userId, clanId);

    const skip = (page - 1) * limit;
    const where = {
      mechanicId: userId,
      coupon: {
        clanId
      }
    };

    if (status) {
      where.status = status;
    }

    const [acceptedCoupons, total] = await prisma.$transaction([
      prisma.clanCouponMechanicAcceptor.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          coupon: {
            include: {
              supplierStore: true,
              partSpecifications: true
            }
          }
        },
        orderBy: { acceptedAt: 'desc' }
      }),
      prisma.clanCouponMechanicAcceptor.count({ where })
    ]);

    return this.ok({
      coupons: acceptedCoupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  async getMechanicSuccessfulCoupons(req) {
    const userId = req.user.id;
    const { clanId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    await this.#validateClanMembership(userId, clanId);

    const skip = (page - 1) * limit;

    const [successfulCoupons, total] = await prisma.$transaction([
      prisma.clanCouponMechanicSuccess.findMany({
        where: {
          mechanicId: userId,
          coupon: {
            clanId
          }
        },
        skip,
        take: parseInt(limit),
        include: {
          coupon: {
            include: {
              supplierStore: true,
              partSpecifications: true
            }
          }
        },
        orderBy: { succeededAt: 'desc' }
      }),
      prisma.clanCouponMechanicSuccess.count({
        where: {
          mechanicId: userId,
          coupon: {
            clanId
          }
        }
      })
    ]);

    return this.ok({
      coupons: successfulCoupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

}

module.exports = {
  CouponsController: new CouponsController()
};


// addCommentsForCoupon
// BookmarkCoupon
// likeCoupon
// dislikeCoupon
// shareCoupon
// addCouponByIdToCooleh
// peleCouponById
// successSellCouponById