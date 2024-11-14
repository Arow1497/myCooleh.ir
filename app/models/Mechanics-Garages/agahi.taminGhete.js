const { default: mongoose } = require("mongoose");

const AgahiTaminSchema = new mongoose.Schema({
    publisher : {type : mongoose.Types.ObjectId, ref: "user", required : true},
    requestedGarage : {type: mongoose.Types.ObjectId, ref:"garage", required: true}, //گاراژی که این درخواست  برونسپاری رو ثبت کرده
    views : {type: Number, default: 0},

})


module.exports = {
    AgahiTaminsModel: mongoose.model("agahitamin", AgahiTaminSchema)
}