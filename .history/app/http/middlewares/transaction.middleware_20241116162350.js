const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware for handling database transactions
 * @param {Function} operation - Database operation to be executed within transaction
 */
const withTransaction = (operation) => {
  return async (req, res, next) => {
    try {
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Add transaction client to request object
        req.prisma = tx;
        
        // Execute the database operation
        return await operation(req, res, tx);
      }, {
        // Transaction options
        maxWait: 5000, // Maximum time to wait for transaction to start
        timeout: 10000, // Maximum time transaction can run
        isolationLevel: 'Serializable' // Highest isolation level
      });

      // If operation returns a result, send it
      if (result) {
        res.json({
          status: 'success',
          data: result
        });
      }
    } catch (error) {
      // Log the error but don't expose internal details
      console.error('Transaction Error:', error);

      // Handle specific Prisma errors
      if (error.code) {
        switch (error.code) {
          case 'P2002':
            return res.status(409).json({
              status: 'error',
              message: 'Unique constraint violation'
            });
          case 'P2014':
            return res.status(409).json({
              status: 'error',
              message: 'Invalid ID or reference constraint violation'
            });
          case 'P2025':
            return res.status(404).json({
              status: 'error',
              message: 'Record not found'
            });
          default:
            return res.status(500).json({
              status: 'error',
              message: 'Database operation failed'
            });
        }
      }

      // Generic error response
      res.status(500).json({
        status: 'error',
        message: 'Transaction failed'
      });
    }
  };
};

/**
 * Helper function to create a transaction-safe operation
 * @param {Function} operation - Database operation function
 */
const createTransactionOperation = (operation) => {
  return async (req, res, tx) => {
    return await operation(req, res, tx);
  };
};

// Example usage functions
const exampleOperations = {
  // Create operation with transaction
  create: (model) => createTransactionOperation(async (req, res, tx) => {
    return await tx[model].create({
      data: req.body
    });
  }),

  // Update operation with transaction
  update: (model) => createTransactionOperation(async (req, res, tx) => {
    const { id } = req.params;
    return await tx[model].update({
      where: { id: parseInt(id) },
      data: req.body
    });
  }),

  // Delete operation with transaction
  delete: (model) => createTransactionOperation(async (req, res, tx) => {
    const { id } = req.params;
    return await tx[model].delete({
      where: { id: parseInt(id) }
    });
  }),

  // Custom operation with multiple steps
  transferMoney: createTransactionOperation(async (req, res, tx) => {
    const { fromAccountId, toAccountId, amount } = req.body;

    // Deduct from source account
    await tx.account.update({
      where: { id: fromAccountId },
      data: {
        balance: {
          decrement: amount
        }
      }
    });

    // Add to destination account
    await tx.account.update({
      where: { id: toAccountId },
      data: {
        balance: {
          increment: amount
        }
      }
    });

    // Create transaction record
    return await tx.transaction.create({
      data: {
        fromAccountId,
        toAccountId,
        amount,
        status: 'COMPLETED'
      }
    });
  })
};

module.exports = {
  withTransaction,
  createTransactionOperation,
  exampleOperations
};


// این middleware قابلیت‌های زیر را فراهم می‌کند:

// مدیریت تراکنش‌های Prisma با تنظیمات پیشرفته:

// تنظیم timeout
// تنظیم isolation level
// مدیریت خطاها
// Helper function برای ایجاد عملیات‌های transaction-safe

// نمونه عملیات‌های آماده برای استفاده:

// Create
// Update
// Delete
// انتقال پول (به عنوان مثالی از عملیات پیچیده)
// نحوه استفاده در routes:
const { withTransaction, exampleOperations } = require('../middleware/transaction.middleware');

// مثال ساده
app.post('/users', withTransaction(exampleOperations.create('user')));

// مثال انتقال پول
app.post('/transfer', withTransaction(exampleOperations.transferMoney));

// مثال عملیات سفارشی
app.post('/custom', withTransaction(async (req, res, tx) => {
  // عملیات دلخواه شما
  const result = await tx.user.create({
    data: req.body
  });
  return result;
}));
// این middleware:
// از تراکنش‌های atomic اطمینان حاصل می‌کند
// خطاها را به درستی مدیریت می‌کند
// قابل استفاده مجدد در تمام عملیات‌های دیتابیس است
// امکان rollback خودکار در صورت بروز خطا را فراهم می‌کند