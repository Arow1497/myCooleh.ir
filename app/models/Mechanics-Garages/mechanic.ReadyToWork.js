const { default: mongoose } = require("mongoose");

const ImReadyToWorkSchema = new mongoose.Schema({
    mechanic : {type: mongoose.Types.ObjectId, ref:"user", required: true},

})


module.exports = {
    ImReadyModel: mongoose.model("imreadytowork", ImReadyToWorkSchema)
}