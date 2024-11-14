const { default: mongoose } = require("mongoose");

// یک سازو کاری برای حذف شدن خودکار این رکورد ها که در مدل های تودرتو ثبت میشن پیاده کن چون زیاد شدنش باعث کندی جستجو میشه



const GarageSchema = new mongoose.Schema({
    garageOwner : {type: mongoose.Types.ObjectId, ref:"user", required: true},
    garage_name : {type: String, required: true},
    garageSerialNumber : {type: String}, // برای رفرال و دعوت از گاراژ هم ازین سریال استفاده کن
    sign : {type: String}, // تصویر امضا یا برند یا مهر گاراژ
    telephone : {type: String},
    addres: {type: String},
    lat_lng : {type: String},
    profit: {type: String, required: false}, // امتیاز یا پرافیت گاراژ
    garageMainField: {type: String, enum: ["oilService", "mechanic", "bodyshop"], required: true}, //فیلد گاراژ اتوسرویس |باطری سازی |جلوبندی صافکاری و غیره
    garageField: {type: String, enum: ["oilService", "bodyShop", "batterysaz", "joloBandi", "mechaniki"], required: false}, //فیلد گاراژ اتوسرویس |باطری سازی |جلوبندی صافکاری و غیره
    mechanicsTeam : [{type: [mongoose.Types.ObjectId], ref:"user", default:[]}],
    shagerds : [{type: [mongoose.Types.ObjectId], ref:"user", default:[]}],
    images : {type: [String], default:[]},
    partOrderGarages: [{type: mongoose.Types.ObjectId, ref: "suplierstore", default: []}], //ایدی یدکی هایی که تابحال تامین قطعه درصدی کردن برای تععین رسیدن به 5 همکاری
    // basket: {type: BasketSchema, default:{}},
    referals : {type: [mongoose.Types.ObjectId],ref: "garage", default: []}, //ایدی یارفرال اون گاراژی که این گاراژ با دعوت اون اومده 
    
    // oilServicesProjects : {type: [mongoose.Types.ObjectId], ref: "project", default: []}
  }, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});

GarageSchema.virtual("imagesURL").get(function(){
    return this.images.map(image =>`${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${image}`)
})

GarageSchema.index({first_name: "text", last_name: "text", username: "text", mobile: "text", email: "text"})

module.exports = {
    GaragesModel: mongoose.model("garage", GarageSchema)
}
// coworkedGaragesHistory: {type: [CoworkedGarageHistory], default: []}, // پروژه های برونسپاری که گاراژ انجام داده
// CoworkedMechanicHistory: {type: [CoworkedMechanicHistory], default: []},  // پروژه های مکانیک درصدی که گاراژ انجام داده
// CoworkedSupplierHistory: {type: [CoworkedSupplierHistory], default: []}, // همکاری هایی که گاراژ با تامین کننده انجام داده
// partOrderSuppliers: {type: [mongoose.Types.ObjectId], ref: "suplierstore", default: []}, //ایدی یدکی هایی که تابحال تامین قطعه درصدی کردن برای تععین رسیدن به 5 همکاری
// garagePartsOrderSupply: {type: [GaragePartsOrderSupply], default: []}, //ایدی اوردر های تامین قطعه درصدی که تابحال گاراژ ثبت کرده
// projects_resume : {type: [mongoose.Types.ObjectId], ref: "project", default: []}, // ایدی پروژه هایی که انجام داده
// inWorkStayusProjects : {type: [mongoose.Types.ObjectId], ref: "project", default: []}, // پروژه هایی که وضعیت در حال تعمیر دارن برای نمایش در صفحه اصلی گاراژ من


    // راه حل اینه اطلاعات همه سوابق داخل خود داکیومنت های اون مورد مثلا اگهی همکاری هست ...اونجا ریکورد ها ایجاد میشن 
    //بعد از مدتی اونهایی که اجرا شدن و تامین کننده و مشتری و گاراژ مشخص دارن میمونن باقی ا/هی ها یعنی انجام نشدن و حذف میشن


    // وقتی میخاد توی اپلیکیشن لیست کوپن هایی که گاراژ ثبت کرده بارگذاری بشن یکبار کویری میزنه و این دیتا در کش لوکال
    // استوریج اپلیکیشن ذخیره میشن تا هی کویری نزنه دیگه

        // sellFromSupplier : {type: [SellFromSupplier], default: []}, //ایدی محصولاتی که گاراژ از تامین کننده ها خریده برای مشخص شدن تعداد خرید و سود دهی  
// مثلا یه همچین چیزی نباید ایدی محصولاتی که خرید اینجا ذخیره بشن چون ما با داشتن فقط ایدی محصولات نمیتونیم که اونهارو 
// نمایش بدیم مجبوریم یه بار دیگه به لیست محصولات کویری بزنیم اونیکه ایدیش با این یکیه پیدا کنیم
//خوب این چه کاریه یه بار کویری میزنیم و توی کش لوکال استوریج اپلیکیشن کاربر ذخیره میکیم تا دفعه بعد نیاز به کویری نباشه