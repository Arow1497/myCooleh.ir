const { default: mongoose } = require("mongoose");

const ProductSuppliersSchema = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    supplierStore : {type: mongoose.Types.ObjectId, ref:"supplierstore", required: true}, //گاراژی که این درخواست  برونسپاری رو ثبت کرده
    price : {},
    usersBookmarks : {},
    type: {type: String, enum: ["clients", "technicians"]}, //دسته بندی اگهی ها که تو پنل مکانیک ها نمایش داده بشه یا کلاینت ها
    clientsBookmarks : {},
    images : {},
    title : {},
    views : {type: Number, default: 0},
    supplierStoreLat_Lng :{type: {type: String, enum:["point"], required: false},
    cordinates: {type: Number, required: false}},
    
    description : {},
    category : {},
    
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});


module.exports = {
    ProductSuppliersModel: mongoose.model("agahisupplier", ProductSuppliersSchema)
}