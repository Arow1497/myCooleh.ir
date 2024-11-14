const { default: mongoose } = require("mongoose");

const garageAwaitListRequestSchema = new mongoose.Schema({
    clientID : {type: mongoose.Types.ObjectId, ref:"client", required: true},
    garageID : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, 
    carPlateNumber : {type: String, required: true},
    carModel : {type: String, required: true},
    carChassisNumber : {type: String, required: true},
    carBuildYear : {type: String, required: true},
    images : {type: [String], default: []}, // عکس هایی از ماشین مثل بدنه قبل صافکاری از کیلومتر برای عدم سو استفاده از هرچی گه مشتری فک کنه ممکنه از ماشین کم شه
    clientIssueExplainVoice : {type: [String], default: []}
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});

garageAwaitListRequestSchema.index({first_name: "text", last_name: "text", username: "text", mobile: "text", email: "text"})

module.exports = {
    GarageAwaitListsModel: mongoose.model("garageAwaitList", garageAwaitListRequestSchema)
}

// یک سازوکاری بیاندیش که بعد ار 6 ماه مثلا این درخواست پذیرش حذف شه