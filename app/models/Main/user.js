const { default: mongoose } = require("mongoose");

const ProductSchema = new mongoose.Schema({
    productID: {type: mongoose.Types.ObjectId, ref: "product"},
    count: {type: Number, defaut: 1}
})

const CourseSchema = new mongoose.Schema({
    courseID: {type: mongoose.Types.ObjectId, ref: "course"},
    count: {type: Number, defaut: 1}
})

const BasketSchema = new mongoose.Schema({
    courses: {type: [CourseSchema], default: []},
    products: {type: [ProductSchema], default: []},
})


const UserSchema = new mongoose.Schema({
    first_name : {type: String},
    last_name : {type: String},
    mobile : {type: String, required: true},
    otp : {type: Object, default: {
        code: 0,
        expires: 0
    }},
    registrationDate : {type: Date, default: Date.now},
    profilePicture: {type: String, required: false},
    profit: {type: String, required: false}, // امتیاز یا پرافیت مکانیک
    userReferalNumber : {type: String},
    expertices: {type: String, default: undefined}, //تخصص مکانیک
    supplierStoreID: [{type: [mongoose.Types.ObjectId], ref : "supplierStore", default : []}], // ایدی یدکی که این یوزر صاحبشه
    garageID:{type: mongoose.Types.ObjectId, ref : "garage", default : undefined}, // ایدی گاراژی که این یوزر صاحبشه
    
    bankAccountNumber : {type: String},
    
    garageLat_Lng :{type: {type: String, enum:["point"], required: false},
     cordinates: {type: Number, required: false}},
    supplierStoreLat_Lng :{type: {type: String, enum:["point"], required: false},
    cordinates: {type: Number, required: false}},

    readyToWork:{type: String, default: false},
    otherBussinesesBookmarks : {type: [mongoose.Types.ObjectId],ref: "user", default: []},// افزودن سک گاراژ یک مکانیک یا یک یدکی به لیست علاقه مندی 
    inWorkGarage:[{type: [mongoose.Types.ObjectId], ref : "garage", default : []}], //گاراژی که در حال حاضر مکانیک درش شاغله
    resumeGarage:[{type: [mongoose.Types.ObjectId], ref : "garage", default : []}],// گاراژ هایی که تابحال مکانیک درشون کار کرده
    Bookmarks : [{type: [mongoose.Types.ObjectId],ref: "user", default: []}],// پست ها یا انواع اگهی ها یا محصولاتی یا دوره هایی که بوکمارک کرده
    Role : {type: String, enum: ["Mechanic", "shagerd", "garageOwner", "client", "supplier"], default: "shagerd"},
    Courses : [{type: [mongoose.Types.ObjectId], ref: "course", default: []}],
    Products : [{type: [mongoose.Types.ObjectId], ref : "product", default : []}],
    basket: {type: BasketSchema, default: undefined},
    
    referals : [{type: [mongoose.Types.ObjectId],ref: "user", default: []}], //گاراژ هایی که با لینک دعوت این مکانیک اضافه شدن برای مبحث پاداش دهی
    
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});
UserSchema.index({first_name: "text", last_name: "text", username: "text", mobile: "text", email: "text"})

module.exports = {
    UsersModel: mongoose.model("user", UserSchema)
}



//اینجور اطلاعاتی زمانی که بخواد استعلام گرفته بشه از رزومه یه مکانیک مستقیما به مثلا مدل گاراژ یا پروژه ها کویری میزنیم
//اما نکته مهم اینه که وقتی توی اپلیکیشن یکبار کوعری زد این دیتا رو تو حافظش کش میکنیم که هی درخواستش نیاد سمت سرور
// ا/ر نیاز به بروز رسانی داشت اونوقت دکمه بروز رسانی بزنه