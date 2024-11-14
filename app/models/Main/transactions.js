const { default: mongoose } = require("mongoose");
const { ConversationSchema } = require("./conversation");


const SmsDataSchema = new mongoose.Schema({
   time : {type: String, required: true},
   date : {type: String, required: true},
   miniBankAccountNum : {type: String, required: true},//4#
   //چهار شماره اول و چهار شماره اخر شماره حساب که توی پیامک میاد
   amount : {type: String, required: true},
}, {
    timestamps: true,
}); 


const TransactionSchema = new mongoose.Schema({
transactionAskerID : {type : mongoose.Types.ObjectId, ref: "user", required : true},
transactionAnswererID : {type : mongoose.Types.ObjectId, ref: "user", required : true},
transactionSerialNumber : {type: String, required: true},

outSourcingReqID : {type : mongoose.Types.ObjectId, ref: "agahiboronsepari", default : undefined},
dastyarReqID : {type : mongoose.Types.ObjectId, ref: "dastyarrequest", default : undefined},
apprenticeRequestID :  {type : mongoose.Types.ObjectId, ref: "apprenticerequest", default : undefined},
partOrderRequestID :  {type : mongoose.Types.ObjectId, ref: "garagepartorder", default : undefined},
couponID : {type : mongoose.Types.ObjectId, ref: "coupon", default : undefined},
metricID : {type : mongoose.Types.ObjectId, ref: "metric", default : undefined},

askerBankAccountNum : {type: String, required: true},
answererBankAccountNum : {type: String, required: true},
askerVarizSmsData : {type: [SmsDataSchema], default:[]},
answererBardashtSmsData : {type: [SmsDataSchema], default:[]},
isTransactionDoneAsker: {type: Boolean, required: true, default: false},
isTransactionDoneAnswerer: {type: Boolean, required: true, default: false},
cheatReportAsker : {type: Boolean, required: true, default: false},
cheatReportAnswerer : {type: Boolean, required: true, default: false},
isTransactionClosed : {type: Boolean, required: true, default: false},
transactionMessages : {type : mongoose.Types.ObjectId, ref: "conversation", required : false}
},
 {timestamps: true});

module.exports = {
    TransactionsModel : mongoose.model("transactions", TransactionSchema)
}