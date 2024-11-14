const { default: mongoose } = require("mongoose");

const AgahiDivarSchema = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    garageID : {type: mongoose.Types.ObjectId, ref:"garage", default: undefined}, //گاراژی که این درخواست  برونسپاری رو ثبت کرده
    title : {type: String, required: true},
    price: {type: String, required: true},
    status : {type: String, enum: ["brandNew", "stock"]},
    views : {type: Number, default: 0},
    description : {type: String, required: true},
    images : {type: [String], required: true},
    category : {type: mongoose.Types.ObjectId, required: true},
    bookmarks : [{type: [mongoose.Types.ObjectId],ref: "user", default: []}],
    shareLink : {type: String, required: true}

},{
    timestamps : true, 
    versionKey : false,
    toJSON : {
        virtuals: true
    }
});

AgahiDivarSchema.virtual("user", {
    ref : "user",
    localField : "_id",
    foreignField: "publisher"
})
AgahiDivarSchema.virtual("category_detail", {
    ref : "category",
    localField : "_id",
    foreignField: "category"
})
AgahiDivarSchema.virtual("imageURL").get(function(){
    return `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${this.images}`
})

module.exports = {
    AgahiDivarsModel: mongoose.model("agahidivar", AgahiDivarSchema)
}