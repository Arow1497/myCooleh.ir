const createHttpError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Controller = require('../../controller');
const { StatusCodes } = require('http-status-codes');

class TransactionController extends Controller {
    
  async confirmPayment(req, res) {
    try {
      const { id } = req.params;
      const { userType } = req.body;

      if (!userType) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'User type is required');
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          ...(userType === 'requester' 
            ? { requesterConfirmedPayment: true }
            : { providerConfirmedPayment: true }),
          ...(userType === 'requester' && { paymentConfirmedAt: new Date() })
        }
      });

      if (transaction.requesterConfirmedPayment && transaction.providerConfirmedPayment) {
        await prisma.transaction.update({
          where: { id },
          data: { status: 'COMPLETED' }
        });
      }

      this.success(res, transaction);
    } catch (error) {
      this.error(res, error);
    }
  }

  async confirmCompletion(req, res) {
    try {
      const { id } = req.params;
      const { userType } = req.body;

      if (!userType) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'User type is required');
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          ...(userType === 'requester' 
            ? { requesterConfirmedCompletion: true }
            : { providerConfirmedCompletion: true }),
          ...(userType === 'requester' && { completionConfirmedAt: new Date() })
        }
      });

      if (transaction.requesterConfirmedCompletion && transaction.providerConfirmedCompletion) {
        await prisma.transaction.update({
          where: { id },
          data: { status: 'COMPLETED' }
        });
      }

      this.success(res, transaction);
    } catch (error) {
      this.error(res, error);
    }
  }

  async getTransactionStatus(req, res) {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
        include: {
          project: true
        }
      });

      if (!transaction) {
        throw createHttpError(StatusCodes.NOT_FOUND, 'Transaction not found');
      }

      this.success(res, transaction);
    } catch (error) {
      this.error(res, error);
    }
  }

  async updateDepositAmount(req, res) {
    try {
      const { id } = req.params;
      const { depositAmount } = req.body;

      if (typeof depositAmount !== 'number' || depositAmount < 0) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'Invalid deposit amount');
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          depositAmount,
          remainingAmount: {
            set: prisma.transaction.findUnique({
              where: { id }
            }).then(t => t.amount - depositAmount)
          }
        }
      });

      this.success(res, transaction);
    } catch (error) {
      this.error(res, error);
    }
  }

  async getUserTransactions(req, res) {
    try {
      const { userId, role } = req.params;

      if (!userId || !role) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'User ID and role are required');
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          project: {
            ...(role === 'requester' 
              ? { garageId: parseInt(userId) }
              : { acceptedSuppleirStore: { id: parseInt(userId) } })
          }
        },
        include: {
          project: {
            include: {
              garage: true,
              acceptedSuppleirStore: true
            }
          }
        }
      });

      this.success(res, transactions);
    } catch (error) {
      this.error(res, error);
    }
  }

  async addDispute(req, res) {
    try {
      const { id } = req.params;
      const { disputeReason } = req.body;

      if (!disputeReason) {
        throw createHttpError(StatusCodes.BAD_REQUEST, 'Dispute reason is required');
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          hasDispute: true,
          disputeReason,
          status: 'DISPUTED'
        }
      });

      this.success(res, transaction);
    } catch (error) {
      this.error(res, error);
    }
  }

  async createTransaction(req, res, next) {
    try {
        const { projectId, amount, depositAmount } = req.body;
        const userId = req.user.id;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { garage: true, acceptedSuppleirStore: true }
        });

        if (!project) {
            throw createHttpError.NotFound('Project not found');
        }

        if (project.status !== 'PENDING') {
            throw createHttpError.BadRequest('Project is not in pending state');
        }

        const transaction = await prisma.transaction.create({
            data: {
                projectId,
                amount,
                status: 'PENDING',
                depositAmount: depositAmount || null,
                remainingAmount: depositAmount ? amount - depositAmount : amount
            }
        });

        await prisma.project.update({
            where: { id: projectId },
            data: { status: 'IN_PROGRESS' }
        });

        return res.status(201).json({
            statusCode: 201,
            data: { transaction }
        });
    } catch (error) {
        next(error);
    }
}

async confirmPaymentt(req, res, next) {
    try {
        const { transactionId } = req.params;
        const { paymentType, paymentEvidence } = req.body;
        const userId = req.user.id;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                project: {
                    include: {
                        garage: true,
                        acceptedSuppleirStore: true
                    }
                }
            }
        });

        if (!transaction) {
            throw createHttpError.NotFound('Transaction not found');
        }

        if (userId !== transaction.project.garage.userId) {
            throw createHttpError.Forbidden('Not authorized to confirm payment');
        }

        const updateData = {
            requesterConfirmedPayment: true,
            paymentConfirmedAt: new Date()
        };

        if (paymentType === 'DEPOSIT') {
            updateData.depositPaid = true;
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: updateData
        });

        return res.json({
            statusCode: 200,
            data: { transaction: updatedTransaction }
        });
    } catch (error) {
        next(error);
    }
}

async confirmReceipt(req, res, next) {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                project: {
                    include: {
                        garage: true,
                        acceptedSuppleirStore: true
                    }
                }
            }
        });

        if (!transaction) {
            throw createHttpError.NotFound('Transaction not found');
        }

        if (userId !== transaction.project.acceptedSuppleirStore.userId) {
            throw createHttpError.Forbidden('Not authorized to confirm receipt');
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                providerConfirmedPayment: true,
                paymentConfirmedAt: new Date(),
                status: transaction.requesterConfirmedPayment ? 'COMPLETED' : 'PENDING'
            }
        });

        if (updatedTransaction.status === 'COMPLETED') {
            await prisma.project.update({
                where: { id: transaction.projectId },
                data: { status: 'COMPLETED', completedAt: new Date() }
            });
        }

        return res.json({
            statusCode: 200,
            data: { transaction: updatedTransaction }
        });
    } catch (error) {
        next(error);
    }
}

async getTransactionDetails(req, res, next) {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                project: {
                    include: {
                        garage: true,
                        acceptedSuppleirStore: true,
                        mechanicsTeam: true,
                        apprenticesTeam: true
                    }
                },
                milestonePayments: true,
                complaint: {
                    include: {
                        filer: {
                            select: {
                                id: true,
                                mobile: true
                            }
                        },
                        receiver: {
                            select: {
                                id: true,
                                mobile: true
                            }
                        }
                    }
                }
            }
        });

        if (!transaction) {
            throw createHttpError.NotFound('Transaction not found');
        }

        // Verify user's authorization to view transaction
        if (userId !== transaction.project.garage.userId && 
            userId !== transaction.project.acceptedSuppleirStore.userId) {
            throw createHttpError.Forbidden('Not authorized to view this transaction');
        }

        return res.json({
            statusCode: 200,
            data: { transaction }
        });
    } catch (error) {
        next(error);
    }
}

async createMilestonePayment(req, res, next) {
    try {
        const { transactionId } = req.params;
        const { amount, description } = req.body;
        const userId = req.user.id;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                project: {
                    include: {
                        garage: true
                    }
                }
            }
        });

        if (!transaction) {
            throw createHttpError.NotFound('Transaction not found');
        }

        if (userId !== transaction.project.garage.userId) {
            throw createHttpError.Forbidden('Not authorized to create milestone payment');
        }

        const milestonePayment = await prisma.milestonePayment.create({
            data: {
                transactionId,
                amount,
                description,
                status: 'PENDING'
            }
        });

        return res.status(201).json({
            statusCode: 201,
            data: { milestonePayment }
        });
    } catch (error) {
        next(error);
    }
}

async getUserTransactions(req, res, next) {
    try {
        const userId = req.user.id;
        const { status, type, page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;

        const where = {
            OR: [
                {
                    project: {
                        garage: {
                            userId
                        }
                    }
                },
                {
                    project: {
                        acceptedSuppleirStore: {
                            userId
                        }
                    }
                }
            ]
        };

        if (status) {
            where.status = status;
        }

        if (type === 'requester') {
            where.OR = [where.OR[0]];
        } else if (type === 'provider') {
            where.OR = [where.OR[1]];
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    project: {
                        include: {
                            garage: true,
                            acceptedSuppleirStore: true
                        }
                    },
                    complaint: {
                        select: {
                            id: true,
                            status: true
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.transaction.count({ where })
        ]);

        return res.json({
            statusCode: 200,
            data: {
                transactions,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

async cancelTransaction(req, res, next) {
    try {
        const { transactionId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                project: {
                    include: {
                        garage: true,
                        acceptedSuppleirStore: true
                    }
                }
            }
        });

        if (!transaction) {
            throw createHttpError.NotFound('Transaction not found');
        }

        if (userId !== transaction.project.garage.userId && 
            userId !== transaction.project.acceptedSuppleirStore.userId) {
            throw createHttpError.Forbidden('Not authorized to cancel this transaction');
        }

        if (transaction.status === 'COMPLETED') {
            throw createHttpError.BadRequest('Cannot cancel completed transaction');
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'CANCELLED',
                disputeReason: reason
            }
        });

        await prisma.project.update({
            where: { id: transaction.projectId },
            data: { status: 'CANCELLED' }
        });

        return res.json({
            statusCode: 200,
            data: { transaction: updatedTransaction }
        });
    } catch (error) {
        next(error);
    }
}

}

module.exports = {
    TransactionController: new TransactionController()
    };

    
/*
    داخل تب دستیار کاربر ها دسترسی دارند به اگهی های مکانیک شاگرد برونسپاری  
و همچنین میتونند ببینن همکاری های در حال اجرا خودشون رو اما در تب های 
ترنزاکشن و کامپلینت در واقع تاریخچه همکاری ها و همچنین سوابق شکایات هست
*/