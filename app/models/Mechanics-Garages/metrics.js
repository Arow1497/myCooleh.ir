const { default: mongoose } = require("mongoose");
const { CommentSchema } = require("../Main/comments");

const MetricSchema = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    clientID : {type: mongoose.Types.ObjectId, ref:"client", required: true}, // کلاینتی که این متریک براش ثبت شده
    garageID : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, //گاراژی که این متریک رو ثبت کرده
    suplierStoreID: {type: mongoose.Types.ObjectId, ref:"suplierstore", required: true}, //لوارم یدکی که این متریک رو به کوله اضافه کرده
    successSellerID: {type: mongoose.Types.ObjectId, ref:"suplierstore", required: true}, //لوارم یدکی که با متریک موفق به فروش شده 
    title : {type: String, required: true},
    description : {type: String, required: true},
    views : {type: Number, default: 0},
    images : {type: [String], required: true},
    category : {type: mongoose.Types.ObjectId, required: true},
    bookmarks : {type: [mongoose.Types.ObjectId],ref: "user", default: []},
    comments : {type : [CommentSchema], default : []},
    likes : [{type : [mongoose.Types.ObjectId], ref: "user", default : []}],
    dislikes : [{type : [mongoose.Types.ObjectId], ref: "user", default : []}],
    shareLink : {type : String, required : true},
    nearBy : {type: {type: String, enum:["point"], required: false},
    cordinates: {type: Number, required: false}},
})


module.exports = {
    MetricsModel: mongoose.model("metric", MetricSchema)
}