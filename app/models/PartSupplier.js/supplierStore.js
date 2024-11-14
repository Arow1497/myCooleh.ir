const { default: mongoose } = require("mongoose");

const sellFromSupplier = new mongoose.Schema({
    supplierstoreID : {type: mongoose.Types.ObjectId, ref:"client", required: true}, //برای اینکه راحت دسترسی داشته باشیم سوابق خرید گاراژ و مکانیک از تامین کننده رو برای دادن سود    
    agahiShopID : {type: mongoose.Types.ObjectId, ref:"agahishopsupplier", required: true}, 

}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});

const SupplierStoresSchema = new mongoose.Schema({
    supplierstore_name: {type: String},
    supplierstoreOwner : {type: mongoose.Types.ObjectId, ref:"user", required: true},
    telephone : {type: String},
    addres: {type: String},
    supplierStoreSerialNumber : {type: String},
    profit: {type: String, required: false}, // امتیاز یا پرافیت یدکی
    supplierstoreField: {type: String, required: true}, // فیلد تامین کننده یدکی | تزیینات |لاستیک و 
    images : {type: [String], required: false},
    partOrderGarages: [{type: [mongoose.Types.ObjectId], ref: "suplierstore", default: []}], //ایدی یدکی هایی که تابحال تامین قطعه درصدی کردن برای تععین رسیدن به 5 همکاری
    
    referals : {type: [mongoose.Types.ObjectId],ref: "supplierstore", default: []}, //یدکی هایی که با لینک دعوت این یدکی اضافه شدن برای مبحث پاداش دهی
    
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});


module.exports = {
    SupplierStoresModel: mongoose.model("supplierstore", SupplierStoresSchema)
}

// sellToGarage : {type: [sellToGarage], default: []}, //ایدی محصولاتی که گاراژ از تامین کننده خریده برای مشخص شدن تعداد خرید و سود دهی  
// sellToMechanic : {type: [sellToMechanic], default: []}, //ایدی محصولاتی که مکانیک از تامین کننده خریده برای مشخص شدن تعداد خرید و سود دهی 
// addedMetrics : {type: [mongoose.Types.ObjectId], ref:"metric", required: true}, //ایدی متریک هایی که به کوله اضافه کرده
// shopAgahi : {type: [mongoose.Types.ObjectId], ref:"metric", required: true}, // اگهی های فروشی که ثبت کرده و هنوز حذف نشدن  
// CoworkedGarageHistory: {type: [CoworkedGarageHistory],  default: []}, //همکاری کوپن ها و متریک ها بین یدکی و گاراژ
// CoworkedMechanicHistory: {type: [CoworkedMechanicHistory], default: []}, //همکاری کوپن ها و متریک ها بین یدکی و مشتری
// CoworkedClientHistory: {type: [CoworkedClientHistory], default: []}, //همکاری کوپن ها و متریک ها بین یدکی و مشتری
// garagePartsOrderSupply: {type: [GaragePartsOrderSupply], default: []}, //ایدی اوردر های تامین قطعه درصدی که تابحال گاراژ ثبت کرده