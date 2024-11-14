const { default: mongoose } = require("mongoose");
const { CommentSchema } = require("../Main/comments");
const PostSchema = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    title : {type : String, required : true},
    description : {type : String, required : true},
    images : {type : [String], required : false},
    time: {type: String, required: true},
    videoAddress: {type: String, required: true},
    price: {type: String, required: true},
    views : {type: Number, default: 0},
    tags : {type : [String], default : []},
    field : {type: String, enum : ["mechanici", "bodyShop", "oilService", "allKinds"], required: true},
    type : {type: String, enum : ["technicians", "public"]},
    category : {type : mongoose.Types.ObjectId, ref: "category", required :true},
    comments : {type : [CommentSchema], default : []},
    likes : [{type : [mongoose.Types.ObjectId], ref: "user", default : []}],
    dislikes : [{type : [mongoose.Types.ObjectId], ref: "user", default : []}],
    bookmarks : [{type : [mongoose.Types.ObjectId], ref: "user", default : []}],
    showOnField: {type: Boolean, required: true, default: true},
    shareLink : {type : String, required : true},
}, {
    timestamps : true, 
    versionKey : false,
    toJSON : {
        virtuals: true
    }
});
PostSchema.virtual("user", {
    ref : "user",
    localField : "_id",
    foreignField: "publisher"
})
PostSchema.virtual("category_detail", {
    ref : "category",
    localField : "_id",
    foreignField: "category"
})
PostSchema.virtual("imageURL").get(function(){
    return `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${this.images}`
})
PostSchema.virtual("videoURL").get(function(){
    return `${process.env.BASE_URL}:${process.env.APPLICATION_PORT}/${this.videoAddress}`
})

module.exports = {
    PostsModel : mongoose.model("post", PostSchema)
} 




