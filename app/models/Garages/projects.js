const { default: mongoose } = require("mongoose");
const { RequestedForSupplySchema } = require("./garagePartOrders");
const { CommentSchema } = require("../Main/comments");

const GarageOilServiceProjects = new mongoose.Schema({
    title : {},
    parts : {}, // اگر قطعه ای فیلتری هم تعویض بشه اینجا میاد
    message : {},
    lastServiceMilage : {}, // فیلد های مربوط به تعویض روغن
    lastServiceOil : {},
    thisServiceMilage : {},
    thisServiceOil : {},
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});  



const ProjectSchema = new mongoose.Schema({
    clientID : {type: mongoose.Types.ObjectId, ref:"client", required: true},
    garageID : {type: mongoose.Types.ObjectId, ref:"garage", required: true},
    supplierStoreID : [{type: [mongoose.Types.ObjectId], ref:"supplierstore", dafault: []}],
    mechanicsTeam: [{type: [mongoose.Types.ObjectId], ref:"user", required: true}],
    shagerdsTeam: [{type: [mongoose.Types.ObjectId], ref:"user", required: true}],
    mechanicsCalculatedSalaries : [{
        mechanicID : {type: mongoose.Types.ObjectId, ref:"user"},
        isCalculated : {type: Boolean, default: false}
    }],
    shagerdsCalculatedSalaries : [{
        shagerdID : {type: mongoose.Types.ObjectId, ref:"user"},
        isCalculated : {type: Boolean, default: false}
    }],
    status : {type: String, enum:["accepted", "inProgress", "fixed"]}, // پذیرش شده -در حال تعمیر - فاکتور شده
    partSupplyStatus : {type: String, enum: ["notAdd", "inProgress", "supplied"]}, //  ثبت نشده -در انتظار تایید - تامین شده
    car : {type: String, require: true},
    plateNumber : {type: String, required: true},
    chassisNumber : {type: String, default: undefined},
    buildYear : {type: String},
    time: {type: String, required: true},
    voiceAddress: {type: String, required: true}, // وویس توضیحات مشکل خودرو و نکات تکمیلی
    images : {type: [String], default:[]},
    brokeReportDetails: {type: String},
    fixReportDetails: {type: String},
    clientComments : {type: [CommentSchema], default: []},
    clientRate : {type: [CommentSchema], default: []},
    price : {type: String, default: undefined},
    discount: {},
    dastyarMechanicID : {type: mongoose.Types.ObjectId, ref:"user", default: undefined},// مکانیک فریلنسی که به پروزه اضافه شده
    outsourcingGarageID : {type: mongoose.Types.ObjectId, ref:"garage", default: undefined},// گاراژی که این پروژه برای همکاری بهش معرفی شده
    suggestionSupplyRequests: {type: [RequestedForSupplySchema], default:[]},
    suppliedParts: {type: mongoose.Types.ObjectId, ref:"garagepartorder", required: true},
    invoice_factor : {type: String}, // فاکتور جنریت شده بصورت تصویر اینجا ذخیره میشه
    appoinmentForm : {type: String}, // گزارش پذیرش جنریت شده بصورت تصویر اینجا ذخیره میشه

    oilServiceModule : {type: [GarageOilServiceProjects], default:[]},
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});


module.exports = {
    ProjectsModel: mongoose.model("project", ProjectSchema),
    GarageOilServiceProjectsSchema : GarageOilServiceProjects
}