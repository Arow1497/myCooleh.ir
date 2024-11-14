const { default: mongoose } = require("mongoose");
const { CommentSchema } = require("../Main/comments");

const CouponsSchema = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    title : {type: String, required: true},
    description : {type: String, required: true},
    couponPrice : {type: String, required: true},
    price: {type: String, required: true},
    views : {type: Number, default: 0},
    images : {type: [String], required: true},
    category : {type: mongoose.Types.ObjectId, required: true},
    supplierStoreID: {type: mongoose.Types.ObjectId, ref:"suplierstore", required: true}, //لوارم یدکی که این کوپن رو ثبت کرده
    clientID : {type: mongoose.Types.ObjectId, ref:"client", required: true}, // کلاینتی که این کوپن رو میخره
    garageID : {type: [mongoose.Types.ObjectId], ref:"garage", default: []}, //گاراژی که این کوپن رو به کوله اضافه کرده
    successSellerID : [{type: [mongoose.Types.ObjectId], ref:"garage", default: []}], //گاراژی که با این کوپن موفق به فروش شده  
    bookmarks : [{type: [mongoose.Types.ObjectId],ref: "user", default: []}],
    comments : {type : [CommentSchema], default : []},
    likes : {type : [mongoose.Types.ObjectId], ref: "user", default : []},
    dislikes : {type : [mongoose.Types.ObjectId], ref: "user", default : []},
    shareLink : {type : String, required : true},
    nearBy : {type: {type: String, enum:["point"], required: false},
    cordinates: {type: Number, required: false}},
})


module.exports = {
    CouponsModel: mongoose.model("coupon", CouponsSchema)
}