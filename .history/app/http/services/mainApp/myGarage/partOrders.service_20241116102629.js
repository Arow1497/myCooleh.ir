const createError = require("http-errors");
const { PrismaClient } = require('@prisma/client');
const { ListOfImagesFromRequest, getTime, audioSeconds } = require("../../utils/functions");
const path = require('path');
const prisma = new PrismaClient();
const MediaProcessor = require('../../generalServices/attachmentProcess');
const processor = new MediaProcessor();

class CreatePartOrderDTO {
    constructor(data) {
      this.publisherId = data.publisherId;
      this.clientId = data.clientId;
      this.garageId = data.garageId;
      this.suplierStoreId = data.suplierStoreId;
      this.title = data.title;
      this.isAvailable = data.isAvailable ?? true; // مقدار پیش‌فرض
      this.city = data.city;
      this.requirements = data.requirements;
      this.budget = data.budget;
      this.projectId = data.projectId;
      this.garageOilServiceProjectId = data.garageOilServiceProjectId;
      this.regionLatLng = data.regionLatLng;
      this.categories = data.categories;
      this.tags = data.tags;
      this.files = data.files;
      this.fileUploadPath = data.fileUploadPath;
  
    }
  } 
  
  class UpdatePartOrderReqDTO {
    constructor(data) {
      // فقط فیلدهایی که در بادی ریکوئست وجود دارند را می‌گیریم
      if (data.title) this.title = data.title;
      if (data.description) this.description = data.description;
      if (data.price) this.price = data.price;
      if (data.discount !== undefined) this.discount = data.discount;
      if (data.inventoryCount) this.inventoryCount = data.inventoryCount;
      if (data.minOrderQuantity) this.minOrderQuantity = data.minOrderQuantity;
      if (data.maxOrderQuantity !== undefined) this.maxOrderQuantity = data.maxOrderQuantity;
      if (data.warranty) this.warranty = data.warranty;
      if (data.warrantyPeriod !== undefined) this.warrantyPeriod = data.warrantyPeriod;
      if (data.status) this.status = data.status;
      if (data.sellsStatus) this.sellsStatus = data.sellsStatus;
      if (data.city) this.city = data.city;
      if (data.regionLatLng) this.regionLatLng = data.regionLatLng;
      if (data.categories) this.categories = data.categories;
      if (data.tags) this.tags = data.tags;
      if (data.files) this.files = data.files;
      if (data.fileUploadPath) this.fileUploadPath = data.fileUploadPath;
    }
  }
class GaragePartOrdersService {
    // Private helper methods
    constructor(prisma) {
        this.prisma = prisma;
    }
    async #validateTransactionOwnership(transactionId, userId, role) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                ordersApprentice: {
                    select: {
                        apprenticeId: true,
                        publisherId: true
                    }
                }
            }
        });

        if (!transaction) throw createError.NotFound("Transaction not found");

        const isOwner = role === 'apprentice' 
            ? transaction.ordersApprentice.apprenticeId === userId
            : transaction.ordersApprentice.publisherId === userId;

        if (!isOwner) throw createError.Unauthorized("Not authorized to perform this action");

        return transaction;
    }

    async #validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
            throw createError.Unauthorized("این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
    }

    // Public methods
    async createPartOrder(user, body, params, files) {
        const garageId = await this.#validateGarageOwnership(user);
        
        const data = await ordersApprenticeSchema.validateAsync(body);
        const attachments = await processor.processContentMedia(
            files, 
            body.fileUploadPath,
            process.env.DEFAULT_PARTORDERSREQUESTS_ID
        );

        return await prisma.$transaction(async (prisma) => {
            const orders = await this.prisma.garagePartOrder.create({
                data: {
                    ...data,
                    publisher: { connect: { id: user.id } },
                    requesterGarage: { connect: { id: garageId } },
                    project: { connect: { id: params.projectId } },
                    attachments: { create: attachments }
                },
                include: { attachments: true }
            });

            const shareUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${getLink(user)}`;
            const share = await prisma.share.create({
                data: {
                    shareUrl,
                    ordersApprentice: { connect: { id: orders.id } }
                }
            });

            return { orders, share };
        });
    }

    async sendSelectedRequestsToClient(data) {
        // Implementation for sending selected requests to client
        return await this.prisma.garagePartOrder.update({
            where: { id: data.orderId },
            data: { status: 'SENT_TO_CLIENT' }
        });
    }

    async notifyClientChoice(data) {
        return await this.prisma.garagePartOrder.update({
            where: { id: data.orderId },
            data: { status: 'CLIENT_SELECTED' }
        });
    }

    async getAllPartOrderReqs(query) {
        return await this.prisma.garagePartOrder.findMany({
            where: { city: query.city },
            include: {
                publisher: {
                    select: { name: true, avatar: true }
                },
                requesterGarage: {
                    select: { name: true, address: true }
                }
            }
        });
    }

    async getOnePartOrderReqById(partOrderId) {
        const order = await this.prisma.garagePartOrder.findUnique({
            where: { id: partOrderId },
            include: {
                publisher: true,
                requesterGarage: true,
                attachments: true,
                share: true
            }
        });

        if (!order) {
            throw createError.NotFound("سفارش قطعه مورد نظر یافت نشد");
        }

        return order;
    }

    async removePartOrderReqById(partOrderId, userId) {
        const order = await this.prisma.garagePartOrder.findUnique({
            where: { id: partOrderId },
            select: { publisherId: true }
        });

        if (!order) {
            throw createError.NotFound("سفارش قطعه مورد نظر یافت نشد");
        }

        if (order.publisherId !== userId) {
            throw createError.Forbidden("شما مجاز به حذف این سفارش قطعه نیستید");
        }

        return await this.prisma.garagePartOrder.delete({
            where: { id: partOrderId }
        });
    }

    async editPartOrderReqById(partOrderId, userId, data, files) {
        const order = await this.prisma.garagePartOrder.findUnique({
            where: { id: partOrderId },
            include: { attachments: true }
        });

        if (!order) {
            throw createError.NotFound("سفارش قطعه مورد نظر یافت نشد");
        }

        if (order.publisherId !== userId) {
            throw createError.Forbidden("شما مجاز به ویرایش این سفارش قطعه نیستید");
        }

        const newAttachments = await processor.processContentMedia(
            files,
            data.fileUploadPath,
            process.env.DEFAULT_PARTORDERSREQUESTS_ID
        );

        const updateData = copyObject(data);
        deleteInvalidPropertyInObject(updateData, [
            "id", "publisherId", "createdAt", "updatedAt",
            "bookmarks", "conversation", "transaction",
            "milestones", "reviews", "transactionsActivityLogs", "share"
        ]);

        return await this.prisma.garagePartOrder.update({
            where: { id: partOrderId },
            data: {
                ...updateData,
                attachments: {
                    deleteMany: data.attachmentsToDelete?.length > 0 
                        ? { id: { in: data.attachmentsToDelete } }
                        : undefined,
                    create: newAttachments
                }
            }
        });
    }

    async toggleBookmark(partOrderId, userId) {
        const bookmark = await prisma.bookmark.findFirst({
            where: {
                userId,
                garagePartOrderId: partOrderId
            }
        });

        if (bookmark) {
            await prisma.bookmark.delete({
                where: { id: bookmark.id }
            });
            return { message: "سفارش قطعه از علاقه‌مندی‌های شما حذف شد" };
        }

        await prisma.bookmark.create({
            data: {
                userId,
                garagePartOrderId: partOrderId
            }
        });
        return { message: "سفارش قطعه به علاقه‌مندی‌های شما اضافه شد" };
    }

    async getAllGaragePartOrderReqs(user, query) {
        const garageId = await this.#validateGarageOwnership(user);
        const { page = 1, limit = 10 } = query;

        const where = {
            publisherId: user.id,
            requesterGarageId: garageId
        };

        const [orders, total] = await prisma.$transaction([
            this.prisma.garagePartOrder.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    apprentice: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    },
                    project: {
                        select: {
                            title: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.garagePartOrder.count({ where })
        ]);

        return {
            orders,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                perPage: parseInt(limit)
            }
        };
    }

    async getAllSupplierStorePartOrderRequestsToItself(apprenticeId, query) {
        const { page = 1, limit = 10, status } = query;

        const where = { apprenticeId };
        if (status) where.status = status;

        const [requests, total] = await prisma.$transaction([
            prisma.shagerdReqsForApprenticeCoWork.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    garagePartOrder: {
                        include: {
                            requesterGarage: {
                                select: {
                                    name: true,
                                    address: true,
                                    rating: true
                                }
                            },
                            project: {
                                select: {
                                    title: true,
                                    status: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.shagerdReqsForApprenticeCoWork.count({ where })
        ]);

        return {
            requests,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                perPage: parseInt(limit)
            }
        };
    }

    async getGarageAllActivePartOrdersRequests(user, query) {
        const garageId = await this.#validateGarageOwnership(user);
        const { page = 1, limit = 10 } = query;

        const where = {
            publisherId: user.id,
            requesterGarageId: garageId,
            status: 'IN_PROGRESS',
            isAvailable: true
        };

        const [activeNotices, total] = await prisma.$transaction([
            this.prisma.garagePartOrder.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    apprentice: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                            phone: true,
                            rating: true
                        }
                    },
                    project: {
                        select: {
                            title: true,
                            status: true,
                            startedAt: true,
                            expectedDuration: true
                        }
                    },
                    milestones: {
                        where: { status: 'IN_PROGRESS' },
                        select: {
                            title: true,
                            dueDate: true
                        }
                    }
                },
                orderBy: { startedAt: 'desc' }
            }),
            this.prisma.garagePartOrder.count({ where })
        ]);

        return {
            activeNotices,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                perPage: parseInt(limit)
            }
        };
    }

    async getSupplierStoreAllActivePartOrderReqs(apprenticeId, query) {
        const { page = 1, limit = 10 } = query;

        const where = {
            apprenticeId,
            status: 'IN_PROGRESS',
            isAvailable: false
        };

        const [activeNotices, total] = await prisma.$transaction([
            this.prisma.garagePartOrder.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    requesterGarage: {
                        select: {
                            name: true,
                            address: true,
                            rating: true
                        }
                    },
                    project: {
                        select: {
                            title: true,
                            status: true,
                            startedAt: true,
                            expectedDuration: true
                        }
                    }
                },
                orderBy: { startedAt: 'desc' }
            }),
            this.prisma.garagePartOrder.count({ where })
        ]);

        return {
            activeNotices,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                perPage: parseInt(limit)
            }
        };
    }

    async sharePartOrderRequest(partOrderId, user) {
        const orders = await this.prisma.garagePartOrder.findUnique({
            where: { id: partOrderId },
            select: {
                share: {
                    select: {
                        id: true,
                        shareUrl: true,
                        createdAt: true
                    }
                },
                title: true,
                status: true,
                isAvailable: true
            }
        });

        if (!orders) {
            throw createError.NotFound("سفارش قطعه مورد نظر یافت نشد");
        }

        if (!orders.isAvailable) {
            throw createError.BadRequest("این سفارش قطعه در حال حاضر قابل اشتراک‌گذاری نیست");
        }

        if (!orders.share?.length) {
            const shareUrl = `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${getLink(user)}`;
            const share = await prisma.share.create({
                data: {
                    shareUrl,
                    ordersApprentice: { connect: { id: partOrderId } }
                }
            });

            orders.share = [share];
        }

        return { share: orders.share[0] };
    }

    async addCoworkReqForPartOrderReqFromSupplierStore(user, partOrderId, apprenticeId) {
        const isApprenticeRequest = !!user.apprenticeAt;
        const garageId = isApprenticeRequest ? user.apprenticeAt?.id : user.ownedGarage?.id;
        const finalApprenticeId = isApprenticeRequest ? user.id : apprenticeId;
        
        const prismaModel = isApprenticeRequest 
            ? prisma.shagerdReqsForApprenticeCoWork 
            : prisma.garageReqsForApprenticeCoWork;

        return await prismaModel.create({
            data: {
                garage: { connect: { id: garageId } },
                apprentice: { connect: { id: finalApprenticeId } },
                ordersApprentice: { connect: { id: partOrderId } }
            }
        });
    }

    async showSuplierStorePartOrderRequestsForRequesterGarage(garageId) {
        if (!garageId) throw createError.Unauthorized("Only garage owners can view requests");

        return await this.prisma.garagePartOrder.findMany({
            where: { requesterGarageId: garageId },
            select: {
                shagerdReqsForApprenticeCoWork: true,
                garageReqsForApprenticeCoWork: true
            }
        });
    }

    async addSupplierStoreToPartOrderRequest(user, params, body) {
        const { apprenticeId, partOrderId } = params;
        const { dueDate, description, amount } = body;
        const garageId = user?.ownedGarage?.id;

        if (!garageId) throw createError.Unauthorized("Only garage owners can add apprentices");

        return await prisma.$transaction(async (prisma) => {
            const orders = await this.prisma.garagePartOrder.update({
                where: { id: partOrderId },
                data: {
                    apprenticeId,
                    milestones: {
                        create: {
                            dueDate,
                            description,
                            payment: { create: { amount } }
                        }
                    }
                }
            });

            const transaction = await prisma.transaction.create({
                data: {
                    amount: orders.budget,
                    project: { connect: { id: orders.projectId } },
                    ordersApprentice: { connect: { id: partOrderId } },
                    transactionsActivityLog: {
                        create: {
                            action: "ترنزاکشن درخواست شاگرد ایجاد شد",
                            project: { connect: { id: orders.projectId } },
                            ordersApprentice: { connect: { id: partOrderId } }
                        }
                    }
                }
            });

            return { orders, transaction };
        });
    }

    async deleteSupplierStoreFromPartOrderRequest(garageId, partOrderId, apprenticeId) {
        if (!garageId) throw createError.Unauthorized("Only garage owners can remove apprentices");

        return await this.prisma.garagePartOrder.update({
            where: { id: partOrderId },
            data: {
                apprentice: {
                    disconnect: { id: apprenticeId }
                }
            }
        });
    }

    async supplierStoreRefusingFromPartOrderReq(apprenticeId, partOrderId) {
        const order = await this.findPartOrderById(partOrderId);
        
        if (!order.apprenticeId.equals(apprenticeId)) {
            throw createError.NotAcceptable("ویرایش ترنزاکشن فقط برای طرفین آن مجاز است");
        }

        return await this.prisma.garagePartOrder.update({
            where: { id: partOrderId },
            data: {
                apprentice: {
                    disconnect: { id: apprenticeId }
                }
            }
        });
    }

    async confirmTransactionCompletion(transactionId, userId, role) {
        await this.#validateTransactionOwnership(transactionId, userId, role);

        const updateData = role === 'apprentice' 
            ? { providerConfirmedCompletion: true, providerConfirmedPayment: true }
            : { requesterConfirmedCompletion: true, requesterConfirmedPayment: true };

        return await prisma.transaction.update({
            where: { id: transactionId },
            data: updateData
        });
    }

    async createComplaint(params, user, body, files) {
        const { transactionId } = params;
        const { id: authorId, role } = user;
        const { description, fileUploadPath } = body;
        
        const attachments = await this.#processAttachments(files, fileUploadPath, 'AUTHOR');

        const isGarage = role === 'GARAGE';
        
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                ordersApprentice: {
                    select: isGarage ? {
                        apprentice: {
                            select: { id: true }
                        }
                    } : {
                        requesterGarage: {
                            select: {
                                garageOwner: {
                                    select: { id: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const targetId = isGarage 
            ? transaction.ordersApprentice.apprentice.id
            : transaction.ordersApprentice.requesterGarage.garageOwner.id;

        return await prisma.complaint.create({
            data: {
                transaction: { connect: { id: transactionId } },
                author: { connect: { id: authorId } },
                target: { connect: { id: targetId } },
                description,
                evidence: { create: attachments }
            },
            include: { attachments: true }
        });
    }

    async removeAndRegretComplaint(complaintId, userId) {
        const complaint = await prisma.complaint.findUnique({
            where: { id: complaintId },
            include: { transaction: true }
        });

        if (!complaint) {
            throw createError.NotFound('شکایت مورد نظر یافت نشد');
        }

        if (complaint.authorId !== userId) {
            throw createError.Forbidden('شما مجاز به لغو این شکایت نیستید');
        }

        if (complaint.status !== 'PENDING') {
            throw createError.BadRequest('فقط شکایت‌های در حال بررسی قابل لغو هستند');
        }

        await prisma.transactionsActivityLog.create({
            data: {
                transaction: { connect: { id: complaint.transactionId } },
                complaint: { connect: { id: complaintId } },
                activityType: 'COMPLAINT_CANCELLED',
                description: 'شکایت توسط ثبت کننده لغو شد',
                performedById: userId
            }
        });

        return await prisma.complaint.delete({
            where: { id: complaintId }
        });
    }

    async respondToComplaint(complaintId, userId, response, files, fileUploadPath) {
        const complaint = await prisma.complaint.findUnique({
            where: { id: complaintId }
        });

        if (!complaint) throw createError.NotFound("Complaint not found");
        if (userId !== complaint.targetId) throw createError.Unauthorized("Only the complaint target can respond");

        const attachments = await this.#processAttachments(files, fileUploadPath, 'TARGET');

        return await prisma.complaint.update({
            where: { id: complaintId },
            data: {
                response,
                evidence: { create: attachments }
            },
            include: { evidence: true }
        });
    }

    async addReviewForApprenticeRequest(params, body, user) {
        const { partOrderId } = params;
        const { comment, rating, projectId, targetId, apprenticeId } = body;
        const { id: authorId, ownedGarage } = user;
        
        const isGarageOwner = !!ownedGarage;
        const garageId = ownedGarage?.id;
        const finalTargetId = isGarageOwner ? apprenticeId : targetId;

        const baseReviewData = {
            ordersApprentice: { connect: { id: partOrderId } },
            project: { connect: { id: projectId } },
            target: { connect: { id: finalTargetId } },
            author: { connect: { id: authorId } },
            response: comment,
            rating
        };

        if (isGarageOwner) {
            baseReviewData.garage = { connect: { id: garageId } };
        }

        return await prisma.review.upsert({
            where: { partOrderId },
            create: baseReviewData,
            update: {
                ...(isGarageOwner && {
                    garage: { connect: { id: garageId } }
                }),
                response: comment,
                rating
            }
        });
    }

    async findPartOrderById(partOrderId) {
        const { id } = await ObjectIdValidator.validateAsync({ id: partOrderId });
        const partOrder = await this.prisma.garagePartOrder.findUnique({
            where: { id }
        });
        
        if (!partOrder) throw createError.NotFound("سفارشی یافت نشد");
        return partOrder;
    }
}

module.exports = new GaragePartOrdersService();