const { default: mongoose } = require("mongoose");
const { CommentSchema } = require("../Main/comments");


const GarageReqsForOutSourcingCoWork = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    garageID : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, //برای اینکه راحت دسترسی داشته باشیم سوابق همکاری گاراژ ها با هم
    garageOutSourcingReqsID : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, // گاراژی که این درخواست رو ثبت کرده 
    outSourcingReqsID : {type: mongoose.Types.ObjectId, ref:"agahiboronsepari", required: true}, // گاراژی که این درخواست رو ثبت کرده 
    supplyHistoryWithThisGarage : {},
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


const AgahiBoronsepariSchema = new mongoose.Schema({
    publisher: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    garageID : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, //گاراژی که این کوپن رو به کوله اضافه کرده
    status : {type: String, enum: ["pending", "accepted"]},
    title : {type: String, required: true},
    price : {type: String, required: true},
    message : {type: String, required: true},
    images : {type: [String], required: true},
    category : {type: mongoose.Types.ObjectId, required: true},
    garagesRequestsForThisReqs: [{type: [GarageReqsForOutSourcingCoWork], default: []}], // مکانیک هایی که درخواست رو قبول میکنند
    acceptedGarageID : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, 
    bookmarks : [{type: [mongoose.Types.ObjectId],ref: "user", default: []}],
}, {
    timestamps : true, 
    versionKey : false,
    toJSON : {
        virtuals: true
    }
});


module.exports = {
    AgahiBoronseparisModel: mongoose.model("agahiboronsepari", AgahiBoronsepariSchema),
    GarageReqsForOutSourcingCoWorkSchema: GarageReqsForOutSourcingCoWork
}