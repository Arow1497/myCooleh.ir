const { default: mongoose } = require("mongoose");


const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    fileURL : {type: String},
    foleType: {type: String},
    readBy : {type: mongoose.Types.ObjectId, ref: 'User'},
    deleteBy : {type: mongoose.Types.ObjectId, ref: 'User'},
    deleted : {type: Boolean, default: false},
    location : {
        latitude: {type: Number},
        longitude:{type: Number},
        address: {type: String}
    }
}, {timestamps: true , 
    _id: true
});



const ConversationSchema = new mongoose.Schema({
    participants: [{ type: [mongoose.Types.ObjectId], ref: 'User', required: true}],
    messages: { type: [MessageSchema], default:[] },
})



module.exports = {
    ConversationModel : mongoose.model("conversation", ConversationSchema),
    ConversationSchema : ConversationSchema

}