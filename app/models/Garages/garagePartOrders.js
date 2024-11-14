const { default: mongoose } = require("mongoose");
const { CommentSchema } = require("../Main/comments");


const SupplyParts = new mongoose.Schema({
    garagePartsOrderID : {type: mongoose.Types.ObjectId, ref:"garagepartsorder", required: true}, //برای اینکه راحت دسترسی داشته باشیم سوابق همکاری گاراژ ها با هم
    title : {},
    description : {},
    images : {type : [String], required : false},// عکس هر قطعه یدکی
    time: {type: String, required: true},
    voiceAddress: {type: String, required: true}, // توضیحات جنس هر قطعه اصالتش توی ویس
    price : {type: String},
    category : {type : mongoose.Types.ObjectId, ref: "category", required :true},
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
}); // اسکیمای قطعات یدکی که مورد نیاز هستند


const RequestedForSupply = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    supplierstoreID : {type: mongoose.Types.ObjectId, ref:"supplierstore", required: true}, //برای اینکه راحت دسترسی داشته باشیم سوابق همکاری گاراژ ها با هم
    garagePartsOrderID : {type: mongoose.Types.ObjectId, ref:"garagepartsorder", required: true}, //برای اینکه راحت دسترسی داشته باشیم سوابق همکاری گاراژ ها با هم
    supplyHistoryWithThisGarage : {},
    parts : {type: [SupplyParts], default: []},//یک ارایه از چندین فیلد قطعه مثلا فیلد تسمه تایم با عکسش و وویس توضیح فیلد پولی گیربکس و فلان
    title : {},
    parts : {},
    message : {},
    images : {type : [String], required : false},
    time: {type: String, required: true},
    voiceAddress: {type: String, required: true},
    price : {type: String},
    coWorkingRate:{type: String},
    coWorkingComments:{type: [CommentSchema], default: []}
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});  //درخواست تامین قطعه یدکی در جواب به گاراژ 

const GaragePartsOrderSchema = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    clientID : {type: mongoose.Types.ObjectId, ref:"client", required: false}, // کلاینتی که این درخواست تامین قطعه براش ثبت شده
    garageId : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, //گاراژی که این درخواست تامین قطعه رو ثبت کرده
    acceptedSuplierStoreID: {type: mongoose.Types.ObjectId, ref:"suplierstore", required: true}, //لوارم یدکی که انتخاب شده تا درخواست تامین قطعه رو انجام بده
    title : {},
    parts : {},
    message : {},
    time: {type: String, required: true},
    voiceAddress: {type: String, required: true},
    images : {},  
    projectID : {type: mongoose.Types.ObjectId, ref: "project", required: true}, //پروژه مربوز به کلاینتی که گاراژ بخاطرش مکانیک ساعتی میگیرد
    SupplyRequestsForThisOrder : {type: [RequestedForSupply], default:[]}, // درخواست های تامین قطعه انتخاب شده توسط گاراژ که اینها ارسال میشن به مشتری تا انتخاب کنه
    coWorkingRate:{type: String},
    coWorkingComments:{type: [CommentSchema], default: []},
    invoice_factor : {type: String} // فاکتور جنریت شده بصورت تصویر اینجا ذخیره میشه
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
}) // درخواست تامین قطعه گاراژ
GaragePartsOrderSchema.index({clientID: "1", garageId: "1", suplierStoreID: "1"})


module.exports = {
    GaragePartsOrdersModel: mongoose.model("garagepartorder", GaragePartsOrderSchema),
    RequestedForSupplySchema: RequestedForSupply
}

//دقت کن که گذاشتن کامنت گاراژ و یدکی برای همدیگه در واقه ذیل همون پروجکت مدل تعریف میشه
//که این پروژه تامین کننده ش کی بوده و چه نطری گاراژ راجب تامین کننده داشته یا برعکس