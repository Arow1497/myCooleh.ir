const createError = require("http-errors");
const { ConversationModel } = require("../../../../models/Main/conversation");
const { TransactionsModel } = require("../../../../models/Main/transactions");
const { ObjectIdValidator } = require("../../../validators/public.validator");
const Controller = require("../../controller");
const { StatusCodes:  HttpStatus} = require("http-status-codes");

class TransactionController extends Controller{

    async createNewTransaction(req, res, next){
        try {
   
        } catch (error) {
            next(error)
        }
    } //باید در زمانی که اگهی مثلا برون سپاری میده و یک گاراژ قبول میکنه
    //وقتی میخاد فیلد اکسپتد گاراژ پر بشه همین مرحله تو یک تراکنش هم ایجاد کنی 
    // برای این معامله

    async getUserListOfUserTransactions(req, res, next){
        try {
            const transactions = await TransactionsModel.find({}, {basket: 0}).sort({_id: -1})
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    transactions
                }
            })
        } catch (error) {
            next(error)
        }
    }

    async verifyTransaction(req, res, next){
        try {

            const transactions = await TransactionsModel.find({}, {basket: 0}).sort({_id: -1})
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    transactions
                }
            })
        } catch (error) {
            next(error)
        }
    }

    async requestingForDoingTransactionByAsker(req, res, next){
        try {
          const garageID = req.user.garageID;
          const {boronnoticeID} = req.params;
          const findNotice = await AgahiBoronseparisModel.findById(boronnoticeID)
          const acceptedGarageID = findNotice.acceptedGarageID;
        } catch (error) {
            next(error)
        }
    }

    async doneTransactionByAsker(req, res, next){
        try {
            const transactions = await TransactionsModel.find({}, {basket: 0}).sort({_id: -1})
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    transactions
                }
            })
        } catch (error) {
            next(error)
        }
    } //asker: یعنی گاراژ اگهی دهنده

    async doneTransactionByAnswerer(req, res, next){
        try {
            const transactions = await TransactionsModel.find({}, {basket: 0}).sort({_id: -1})
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    transactions
                }
            })
        } catch (error) {
            next(error)
        }
    } //answerer: یعنی گاراژ پذیرنده اگهی 

    async transactionCheatNotifyByAsker(req, res, next){
        try {
          const garageID = req.user.garageID;
          const {boronnoticeID} = req.params;
          const findNotice = await AgahiBoronseparisModel.findById(boronnoticeID)
          const acceptedGarageID = findNotice.acceptedGarageID;
        } catch (error) {
            next(error)
        }
    }

    async transactionCheatRemoveByAsker(req, res, next){
        try {
          const garageID = req.user.garageID;
          const {boronnoticeID} = req.params;
          const findNotice = await AgahiBoronseparisModel.findById(boronnoticeID)
          const acceptedGarageID = findNotice.acceptedGarageID;
        } catch (error) {
            next(error)
        }
    }

    async transactionCheatNotifyByAnswerer(req, res, next){
        try {
          const garageID = req.user.garageID;
          const {boronnoticeID} = req.params;
          const findNotice = await AgahiBoronseparisModel.findById(boronnoticeID)
          const acceptedGarageID = findNotice.acceptedGarageID;
        } catch (error) {
            next(error)
        }
    }

    async transactionCheatRemoveByAnswerer(req, res, next){
        try {
          const garageID = req.user.garageID;
          const {boronnoticeID} = req.params;
          const findNotice = await AgahiBoronseparisModel.findById(boronnoticeID)
          const acceptedGarageID = findNotice.acceptedGarageID;
        } catch (error) {
            next(error)
        }
    }

    async createTransactionConversationRoom(req, res, next){
        try {
        const {transactionID} = req.params;
        const findTransaction = await this.findTransactionById(transactionID);
        const transactionAsker = findTransaction.transactionAskerID;
        const transactionAnswerer = findTransaction.transactionAnswererID;
        const participants = [transactionAsker, transactionAnswerer];
        if (!participants || participants.length < 2) throw createError.BadRequest("تعداد حاضران در اتاق به حد نساب 2 نفر نرسید");
        if (!participants.every(id => mongoose.Types.ObjectId.isValid(id))) throw  createError.BadRequest("Invalid participent IDs...");

        const createTransactionConv = await ConversationModel.create({
            participants,
        });

        return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data : {
              message: "اتاق گفتگوی تراکنش با موفقیت ایجاد شد"
            }
          });
        } catch (error) {
            next(error)
        }
    }

    async sendMessage(req, res, next){
        try {
            await TransactionSendMessageSchema.validateAsync(req.body);
            const{text, fileURL, fileType, location} = req.body;
        const {transactionID} = req.params;
        const findTransaction = await this.findTransactionById(transactionID);
        const transactionAskerID = findTransaction.transactionAskerID;
        const transactionAnswererID = findTransaction.transactionAnswererID;
        const conversationID = findTransaction.transactionMessages;
        const sender = req.user._id;
        if (!sender.equals([transactionAskerID || transactionAnswererID])) {
            throw createError.NotAcceptable(" ثبت پیام فقط برای درخواست دهنده یا متقاضی آن درخواست مجاز است");
          }
        const Message = {
            sender,
            text,
            fileURL,
            fileType,
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address
            } : undefined
        };
        const createTransactionConv = await ConversationModel.updateOne({_id: conversationID},
           { $push : {"messages": Message}
            });

        return res.status(HttpStatus.CREATED).json({
            statusCode: HttpStatus.CREATED,
            data : {
              message: "پیام شما با موفقیت ارسال شد"
            }
          });
        } catch (error) {
            next(error)
        }
    }

    async getMessage(req, res, next){
        try {
    const {transactionID} = req.params;
    const userId = req.user._id;
    const findTransaction = await this.findTransactionById(transactionID);
    const conversationID = findTransaction.transactionMessages;
    const conversation = await ConversationModel.findById(conversationID);
    if (!conversation) throw createError.
    NotFound("مکالمه ای وجود ندارد ممکن است توسط متقاضی یا درخواست دهنده حذف شده یاشد");
  
    // Mark all messages as read
  let hasUnreadMessages = false;
  conversation.messages.forEach(message => {
      if (!message.readBy || !message.readBy.equals(userId)) {
          message.readBy = userId;
          hasUnreadMessages = true;
      }
  });

  // اگر پیام‌های خوانده نشده وجود داشت، مکالمه را به‌روزرسانی کنیم
  if (hasUnreadMessages) {
      await conversation.save();
  }
    return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        data : conversation.messages
      });
    } catch (error) {
        next(error)
    }
}// توی فرانت مسج ها همه کش میشن تو حافظه و اگه توی صفحه اتاق مکالمه 
// حضور داره و 3 دقیقه از اخرین دریافت اطلاعات میگذره یه بار گت بفرسته

async getAllUserConversations(req, res, next){
    try {
        const { userId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId." });
        }
        const conversations = await ConversationModel.find({ participants: userId });
        if (!conversations.length) {
            return res.status(404).json({ message: "No conversations found." });
        }
        return res.status(200).json({ 
            conversations 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


////////////////////////////////////////////////////////////////////////////////
async findTransactionById(transactionID) {
    const { id } = await ObjectIdValidator.validateAsync({ id: transactionID });
    const transaction = await TransactionsModel.findById(id);
    if (!transaction) throw new createError.NotFound("چنین تراکنشی یافت نشد")
    return transaction
  }


}


module.exports = {
    TransactionController: new TransactionController()
}