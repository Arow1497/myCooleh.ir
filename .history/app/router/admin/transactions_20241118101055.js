const { TransactionController } = require("../../http/controllers/admin/transactions/transactionController");

const router = require("express").Router();

// router.get("/list", TransactionController.getAllTransactions)


module.exports = {
    AdminApiTransactionRouter: router
}