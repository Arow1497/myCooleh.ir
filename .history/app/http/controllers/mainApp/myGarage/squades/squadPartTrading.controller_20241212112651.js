/*
* همه اعضای کلن سر یک لیست قطعات پر مصرف به تفاهم میرسن 
* هر گاراژ تعداد مورد نیاز از اون قطعه رو اضافه میکنه یک نفر میشه نماینده
* قطعات رو میخرن بصورت عمده و سود قطعه علاوه بر سود تعمیر درامد رو بوست میکنه
*/
const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ClanPartTradingController extends Controller {
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

  async #validateAttachmentType(attachments) {
    if (!attachments) return;
    
    const allowedTypes = ['image', 'audio'];
    for (const attachment of attachments) {
      const fileType = attachment.fileType.toLowerCase();
      if (!allowedTypes.includes(fileType)) {
        throw createError(HttpStatus.BAD_REQUEST, "فقط ارسال تصویر و فایل صوتی مجاز است");
      }
    }
  }

  async #validateClanOwnership(userId, clanId) {
    const clan = await prisma.clan.findFirst({
      where: {
        id: clanId,
        ownerId: userId
      }
    });

    if (!clan) {
      throw createError(HttpStatus.FORBIDDEN, "شما مالک این کلن نیستید");
    }
    return clan;
  }

  async #validateRepresentative(tradingId, userId) {
    const trading = await prisma.clanCommercePartOrderTrading.findFirst({
      where: {
        id: tradingId,
        clanDealRepresentative: {
          userId
        }
      }
    });

    if (!trading) {
      throw createError(HttpStatus.FORBIDDEN, "شما نماینده این معامله نیستید");
    }
    return trading;
  }

  // Representative Management
  async assignTradeRepresentative(req) {
    const { clanId, representativeUserId } = req.body;
    const userId = req.user.id;

    // Validate clan ownership
    await this.#validateClanOwnership(userId, clanId);

    // Validate representative membership
    const membership = await this.#validateClanMembership(representativeUserId, clanId);

    // Create trading instance with representative
    const trading = await prisma.clanCommercePartOrderTrading.create({
      data: {
        clanId,
        clanDealRepresentativeId: membership.id,
        title: "معامله جدید قطعات",
        city: req.body.city,
        tradingStatus: "OPEN"
      }
    });

    return this.ok(trading);
  }

  // Parts List Management
  async createPartsList(req) {
    const { tradingId, parts } = req.body;
    const userId = req.user.id;

    // Validate representative
    await this.#validateRepresentative(tradingId, userId);

    // Create parts list
    const createdParts = await prisma.$transaction(
      parts.map(part => 
        prisma.clanCommercePartsList.create({
          data: {
            tradingId,
            partName: part.name,
            partNumber: part.number,
            brand: part.brand,
            condition: part.condition,
            description: part.description
          }
        })
      )
    );

    return this.ok(createdParts);
  }

  // Garage Order Management
  async createGarageOrder(req) {
    const { tradingId, partQuantities } = req.body;
    const userId = req.user.id;

    // Validate clan membership and get garage
    const garage = await prisma.garage.findFirst({
      where: {
        ownerId: userId
      }
    });

    if (!garage) {
      throw createError(HttpStatus.FORBIDDEN, "شما صاحب هیچ گاراژی نیستید");
    }

    // Create garage order
    const order = await prisma.clanCommerceGarageOrder.create({
      data: {
        clanCommercePartOrderTradingId: tradingId,
        garageId: garage.id,
        status: "PENDING",
        partQuantities: {
          create: partQuantities.map(pq => ({
            partsListId: pq.partId,
            quantity: pq.quantity,
            notes: pq.notes
          }))
        }
      },
      include: {
        partQuantities: true
      }
    });

    return this.ok(order);
  }

  // Supplier Management
  async createSupplyRequest(req) {
    const { tradingId, price, deliveryDate, notes } = req.body;
    const userId = req.user.id;

    // Validate supplier store ownership
    const supplierStore = await prisma.supplierStore.findFirst({
      where: {
        ownerId: userId
      }
    });

    if (!supplierStore) {
      throw createError(HttpStatus.FORBIDDEN, "شما صاحب هیچ فروشگاه قطعات نیستید");
    }

    // Create supply request
    const request = await prisma.clanCommercePartOrderTradingRequestedForSupply.create({
      data: {
        supplierStoreId: supplierStore.id,
        clanCommercePartOrderTradingId: tradingId,
        status: "PENDING"
      }
    });

    return this.ok(request);
  }

  async selectSupplier(req) {
    const { tradingId, supplierRequestId } = req.body;
    const userId = req.user.id;

    // Validate representative
    await this.#validateRepresentative(tradingId, userId);

    // Update trading with selected supplier
    const updatedTrading = await prisma.clanCommercePartOrderTrading.update({
      where: {
        id: tradingId
      },
      data: {
        tradingStatus: "SUPPLIER_SELECTED",
        dealStatus: "IN_PROGRESS",
        dealStartedAt: new Date(),
        reqForSupply: {
          update: {
            where: {
              id: supplierRequestId
            },
            data: {
              status: "ACCEPTED"
            }
          }
        }
      }
    });

    return this.ok(updatedTrading);
  }

  // Trading Status Management
  async updateTradingStatus(req) {
    const { tradingId, status } = req.body;
    const userId = req.user.id;

    // Validate representative
    await this.#validateRepresentative(tradingId, userId);

    const updatedTrading = await prisma.clanCommercePartOrderTrading.update({
      where: {
        id: tradingId
      },
      data: {
        tradingStatus: status,
        ...(status === "COMPLETED" && {
          dealStatus: "COMPLETED",
          dealEndedAt: new Date()
        })
      }
    });

    return this.ok(updatedTrading);
  }

  // Query Methods
  async getTradingDetails(req) {
    const { tradingId } = req.params;
    
    const trading = await prisma.clanCommercePartOrderTrading.findUnique({
      where: {
        id: tradingId
      },
      include: {
        partsList: true,
        garageOrders: {
          include: {
            partQuantities: true,
            garage: true
          }
        },
        reqForSupply: {
          include: {
            supplierStore: true
          }
        }
      }
    });

    if (!trading) {
      throw createError(HttpStatus.NOT_FOUND, "معامله مورد نظر یافت نشد");
    }

    return this.ok(trading);
  }

  async listClanTradings(req) {
    const { clanId } = req.params;
    const userId = req.user.id;

    // Validate clan membership
    await this.#validateClanMembership(userId, clanId);

    const tradings = await prisma.clanCommercePartOrderTrading.findMany({
      where: {
        clanId
      },
      include: {
        clanDealRepresentative: {
          include: {
            user: true
          }
        },
        partsList: true
      }
    });

    return this.ok(tradings);
  }

  // NEW METHODS BELOW

  // Parts List Management - Additional Methods
  async updatePartsList(req) {
    const { tradingId, partId, updates } = req.body;
    const userId = req.user.id;

    await this.#validateRepresentative(tradingId, userId);

    const trading = await prisma.clanCommercePartOrderTrading.findUnique({
      where: { id: tradingId }
    });

    if (trading.tradingStatus !== "OPEN") {
      throw createError(HttpStatus.BAD_REQUEST, "لیست قطعات فقط در وضعیت باز قابل ویرایش است");
    }

    const updatedPart = await prisma.clanCommercePartsList.update({
      where: { id: partId },
      data: updates
    });

    return this.ok(updatedPart);
  }

  async deletePartFromList(req) {
    const { tradingId, partId } = req.params;
    const userId = req.user.id;

    await this.#validateRepresentative(tradingId, userId);

    const trading = await prisma.clanCommercePartOrderTrading.findUnique({
      where: { id: tradingId }
    });

    if (trading.tradingStatus !== "OPEN") {
      throw createError(HttpStatus.BAD_REQUEST, "حذف قطعه فقط در وضعیت باز ممکن است");
    }

    await prisma.clanCommercePartsList.delete({
      where: { id: partId }
    });

    return this.ok({ message: "قطعه با موفقیت حذف شد" });
  }

  // Garage Order Management - Additional Methods
  async updateGarageOrder(req) {
    const { orderId, updates } = req.body;
    const userId = req.user.id;

    const order = await prisma.clanCommerceGarageOrder.findFirst({
      where: {
        id: orderId,
        garage: {
          ownerId: userId
        }
      }
    });

    if (!order) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش این سفارش نیستید");
    }

    if (order.status !== "PENDING") {
      throw createError(HttpStatus.BAD_REQUEST, "فقط سفارش‌های در انتظار قابل ویرایش هستند");
    }

    const updatedOrder = await prisma.clanCommerceGarageOrder.update({
      where: { id: orderId },
      data: {
        partQuantities: {
          upsert: updates.partQuantities.map(pq => ({
            where: {
              garageOrderId_partsListId: {
                garageOrderId: orderId,
                partsListId: pq.partId
              }
            },
            create: {
              partsListId: pq.partId,
              quantity: pq.quantity,
              notes: pq.notes
            },
            update: {
              quantity: pq.quantity,
              notes: pq.notes
            }
          }))
        }
      },
      include: {
        partQuantities: true
      }
    });

    return this.ok(updatedOrder);
  }

  async cancelGarageOrder(req) {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await prisma.clanCommerceGarageOrder.findFirst({
      where: {
        id: orderId,
        garage: {
          ownerId: userId
        }
      }
    });

    if (!order) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به لغو این سفارش نیستید");
    }

    if (order.status === "DELIVERED") {
      throw createError(HttpStatus.BAD_REQUEST, "سفارش تحویل شده قابل لغو نیست");
    }

    const cancelledOrder = await prisma.clanCommerceGarageOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED" }
    });

    return this.ok(cancelledOrder);
  }

  // Supplier Management - Additional Methods
  async updateSupplyRequest(req) {
    const { requestId, updates } = req.body;
    const userId = req.user.id;

    const request = await prisma.clanCommercePartOrderTradingRequestedForSupply.findFirst({
      where: {
        id: requestId,
        supplierStore: {
          ownerId: userId
        }
      }
    });

    if (!request) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به ویرایش این درخواست نیستید");
    }

    if (request.status !== "PENDING") {
      throw createError(HttpStatus.BAD_REQUEST, "فقط درخواست‌های در انتظار قابل ویرایش هستند");
    }

    const updatedRequest = await prisma.clanCommercePartOrderTradingRequestedForSupply.update({
      where: { id: requestId },
      data: updates
    });

    return this.ok(updatedRequest);
  }

  async cancelSupplyRequest(req) {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await prisma.clanCommercePartOrderTradingRequestedForSupply.findFirst({
      where: {
        id: requestId,
        supplierStore: {
          ownerId: userId
        }
      }
    });

    if (!request) {
      throw createError(HttpStatus.FORBIDDEN, "شما مجاز به لغو این درخواست نیستید");
    }

    if (request.status !== "PENDING") {
      throw createError(HttpStatus.BAD_REQUEST, "فقط درخواست‌های در انتظار قابل لغو هستند");
    }

    const cancelledRequest = await prisma.clanCommercePartOrderTradingRequestedForSupply.update({
      where: { id: requestId },
      data: { status: "CANCELLED" }
    });

    return this.ok(cancelledRequest);
  }

  // Trading Analytics and Reports
  async getTradingAnalytics(req) {
    const { tradingId } = req.params;
    const userId = req.user.id;

    await this.#validateRepresentative(tradingId, userId);

    const trading = await prisma.clanCommercePartOrderTrading.findUnique({
      where: { id: tradingId },
      include: {
        partsList: true,
        garageOrders: {
          include: {
            partQuantities: true
          }
        }
      }
    });

    // Calculate analytics
    const totalGarages = trading.garageOrders.length;
    const totalParts = trading.partsList.length;
    
    // Calculate total quantities per part
    const partsAnalytics = trading.partsList.map(part => {
      const totalQuantity = trading.garageOrders.reduce((sum, order) => {
        const quantity = order.partQuantities.find(pq => pq.partsListId === part.id)?.quantity || 0;
        return sum + quantity;
      }, 0);

      return {
        partId: part.id,
        partName: part.partName,
        totalQuantity
      };
    });

    return this.ok({
      totalGarages,
      totalParts,
      partsAnalytics,
      tradingStatus: trading.tradingStatus,
      createdAt: trading.createdAt,
      updatedAt: trading.updatedAt
    });
  }

  // Trading Search and Filters
  async searchTradings(req) {
    const { clanId, status, city, dateRange, supplierStoreId } = req.query;
    const userId = req.user.id;

    await this.#validateClanMembership(userId, clanId);

    const where = {
      clanId,
      ...(status && { tradingStatus: status }),
      ...(city && { city }),
      ...(supplierStoreId && { suplierStoreId: supplierStoreId }),
      ...(dateRange && {
        createdAt: {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end)
        }
      })
    };

    const tradings = await prisma.clanCommercePartOrderTrading.findMany({
      where,
      include: {
        clanDealRepresentative: {
          include: {
            user: true
          }
        },
        partsList: true,
        garageOrders: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return this.ok(tradings);
  }

  
  // Milestone Management
  async addTradingMilestone(req) {
    const { tradingId, title, description, expectedDate } = req.body;
    const userId = req.user.id;

    await this.#validateRepresentative(tradingId, userId);

    const milestone = await prisma.milestone.create({
      data: {
        tradingId,
        title,
        description,
        expectedDate: new Date(expectedDate),
        status: 'PENDING'
      }
    });

    return this.ok(milestone);
  }

  async updateMilestoneStatus(req) {
    const { milestoneId, status, completionNotes } = req.body;
    const userId = req.user.id;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { trading: true }
    });

    await this.#validateRepresentative(milestone.tradingId, userId);

    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status,
        completionNotes,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    });

    return this.ok(updatedMilestone);
  }

  // Trading Status Management
  async updateTradingStatus(req) {
    const { tradingId, newStatus, statusNotes } = req.body;
    const userId = req.user.id;

    const trading = await this.#validateRepresentative(tradingId, userId);

    // Validate status transition
    const validTransitions = {
      OPEN: ['SUPPLIER_SELECTED', 'CANCELLED'],
      SUPPLIER_SELECTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };

    if (!validTransitions[trading.tradingStatus].includes(newStatus)) {
      throw createError(
        HttpStatus.BAD_REQUEST,
        `تغییر وضعیت از ${trading.tradingStatus} به ${newStatus} امکان‌پذیر نیست`
      );
    }

    const updatedTrading = await prisma.clanCommercePartOrderTrading.update({
      where: { id: tradingId },
      data: {
        tradingStatus: newStatus,
        ...(newStatus === 'COMPLETED' && { dealEndedAt: new Date() }),
        transactionsActivityLogs: {
          create: {
            type: 'STATUS_CHANGE',
            description: statusNotes || `وضعیت معامله به ${newStatus} تغییر کرد`,
            metadata: {
              previousStatus: trading.tradingStatus,
              newStatus,
              changedBy: userId
            }
          }
        }
      }
    });

    return this.ok(updatedTrading);
  }

  // Bulk Operations
  async bulkUpdatePartQuantities(req) {
    const { tradingId, updates } = req.body;
    const userId = req.user.id;

    await this.#validateRepresentative(tradingId, userId);

    const trading = await prisma.clanCommercePartOrderTrading.findUnique({
      where: { id: tradingId }
    });

    if (trading.tradingStatus !== "OPEN") {
      throw createError(HttpStatus.BAD_REQUEST, "بروزرسانی دسته‌ای فقط در وضعیت باز امکان‌پذیر است");
    }

    const result = await prisma.$transaction(
      updates.map(update => 
        prisma.clanCommerceGaragePartQuantity.upsert({
          where: {
            garageOrderId_partsListId: {
              garageOrderId: update.garageOrderId,
              partsListId: update.partId
            }
          },
          create: {
            garageOrderId: update.garageOrderId,
            partsListId: update.partId,
            quantity: update.quantity,
            notes: update.notes
          },
          update: {
            quantity: update.quantity,
            notes: update.notes
          }
        })
      )
    );

    return this.ok(result);
  }

  // Advanced Trading Management
  async mergeTradingOrders(req) {
    const { sourceOrderIds, targetOrderId } = req.body;
    const userId = req.user.id;

    // Validate representative status for all involved orders
    await Promise.all([
      ...sourceOrderIds.map(id => this.#validateRepresentative(id, userId)),
      this.#validateRepresentative(targetOrderId, userId)
    ]);

    // Merge orders
    const result = await prisma.$transaction(async (tx) => {
      // Update all garage orders to point to target trading
      await tx.clanCommerceGarageOrder.updateMany({
        where: {
          clanCommercePartOrderTradingId: {
            in: sourceOrderIds
          }
        },
        data: {
          clanCommercePartOrderTradingId: targetOrderId
        }
      });

      // Move all parts to target trading
      await tx.clanCommercePartsList.updateMany({
        where: {
          tradingId: {
            in: sourceOrderIds
          }
        },
        data: {
          tradingId: targetOrderId
        }
      });

      // Close source tradings
      await tx.clanCommercePartOrderTrading.updateMany({
        where: {
          id: {
            in: sourceOrderIds
          }
        },
        data: {
          tradingStatus: 'CANCELLED',
          dealEndedAt: new Date(),
          dealFeedback: 'ادغام شده با معامله دیگر'
        }
      });

      return tx.clanCommercePartOrderTrading.findUnique({
        where: { id: targetOrderId },
        include: {
          partsList: true,
          garageOrders: {
            include: {
              partQuantities: true
            }
          }
        }
      });
    });

    return this.ok(result);
  }

  // Trading History and Audit
  async getTradingHistory(req) {
    const { tradingId } = req.params;
    const userId = req.user.id;

    await this.#validateClanMembership(userId, tradingId);

    const history = await prisma.transactionsActivityLog.findMany({
      where: { tradingId },
      orderBy: { createdAt: 'desc' },
      include: {
        trading: {
          select: {
            title: true,
            tradingStatus: true
          }
        }
      }
    });

    return this.ok(history);
  }

  // Trading Validation and Verification
  async verifyTradingCompletion(req) {
    const { tradingId } = req.params;
    const userId = req.user.id;

    const trading = await this.#validateRepresentative(tradingId, userId);

    if (trading.tradingStatus !== 'IN_PROGRESS') {
      throw createError(HttpStatus.BAD_REQUEST, "فقط معاملات در حال انجام قابل تایید نهایی هستند");
    }

    // Verify all orders are delivered
    const undeliveredOrders = await prisma.clanCommerceGarageOrder.count({
      where: {
        clanCommercePartOrderTradingId: tradingId,
        status: {
          not: 'DELIVERED'
        }
      }
    });

    if (undeliveredOrders > 0) {
      throw createError(
        HttpStatus.BAD_REQUEST,
        "همه سفارش‌ها باید تحویل داده شوند"
      );
    }

    const result = await prisma.clanCommercePartOrderTrading.update({
      where: { id: tradingId },
      data: {
        tradingStatus: 'COMPLETED',
        dealEndedAt: new Date(),
        transactionsActivityLogs: {
          create: {
            type: 'COMPLETION_VERIFICATION',
            description: 'تایید نهایی تکمیل معامله',
            metadata: {
              verifiedBy: userId,
              verificationDate: new Date()
            }
          }
        }
      }
    });

    return this.ok(result);
  }

}

module.exports = {
    ClanPartTradingController : new ClanPartTradingController()
};




/*

model ClanCommercePartOrderTrading{
  id                     String      @id @default(uuid())
  clanId                 String
  clan                   Clan        @relation(fields: [clanId], references: [id])
  partOrderId            String      @unique
  partOrder              PartOrder   @relation(fields: [partOrderId], references: [id])
  clanDealRepresentativeId String    @unique
  clanDealRepresentative ClanMembership @relation(fields: [clanDealRepresentativeId], references: [id])
  suplierStoreId         String
  acceptorSuppleirStore  SupplierStore   @relation(fields: [suplierStoreId], references: [id])
  title                  String
  isAvailable            Boolean        @default(true)
  city                   String
  requirements           Json?          // Detailed project requirements
  attachments            Attachment[] 
  // Conversation
  conversation           Conversation[]

 // Related records
  reqForSupply           ClanCommercePartOrderTradingRequestedForSupply[]
  milestones             Milestone[]
  reviews                Review[]
  transactionsActivityLogs         TransactionsActivityLog[]
  bookmarks              Bookmark[]
  share                  Share[]

  dealStatus             CollaborationStatus  @default(PENDING)
  dealStartedAt          DateTime?
  dealEndedAt            DateTime?
  dealAmount             Float?
  dealCommission         Float?
  dealRating             Float?
  dealFeedback           String?
  // dealDispute            Dispute?
  // dealDisputeResolution  DisputeResolution?
  // dealCommunications     ClanCommunication[]
  // dealActivities         ClanActivity[]
  createdAt              DateTime    @default(now())
  updaedAt               DateTime    @updatedAt
  claimedAt              DateTime?
  expiresAt              DateTime?
}


  */