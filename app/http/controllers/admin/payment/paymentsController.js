const { PaymentModel } = require("../../../../models/Main/payments");
const Controller = require("../../controller");
const { StatusCodes:  HttpStatus} = require("http-status-codes");

class PaymentsController extends Controller{

    async getListOfSubscriptionPayments(req, res, next){
        try {
            const transactions = await PaymentModel.find({}, {basket: 0}).sort({_id: -1})
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    transactions
                }
            })
        } catch (error) {
            next(error)
        }
    } // this is for Admin And Management For users subscribtion payments


}
module.exports = {
    PaymentsController: new PaymentsController()
}