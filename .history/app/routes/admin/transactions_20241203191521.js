const { TransactionController } = require("../../http/controllers/mainApp/transactions/transaction.controller");

const router = require("express").Router();

// router.get("/list", TransactionController.getAllTransactions)


module.exports = {
    AdminApiTransactionRouter: router
}