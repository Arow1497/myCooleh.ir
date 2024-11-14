const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
    from_user: {type: mongoose.Types.ObjectId, ref: "user", required: false},
    from_client: {type: mongoose.Types.ObjectId, ref: "client", required: false},
    comment: {type: String, required: true},
    show: {type: Boolean, required: true, default: true},
    openToComment: {type: Boolean, default: false},
    answers : {type: [this], default: []},
},{
    timestamps: {createdAt: true}
}) 


const CommentSchema = new mongoose.Schema({
    from_user: {type: mongoose.Types.ObjectId, ref: "user", required: false},
    from_client: {type: mongoose.Types.ObjectId, ref: "client", required: false},
    to_garage: {type: mongoose.Types.ObjectId, ref: "garge", required: false},// برای نمایش تمام کامنت هایی که خطابشون این گاراژ یا یدکی یا مکانیک بوده
    to_mechanic: {type: mongoose.Types.ObjectId, ref: "user", required: false},// برای نمایش تمام کامنت هایی که خطابشون این گاراژ یا یدکی یا مکانیک بوده
    to_supplierStore: {type: mongoose.Types.ObjectId, ref: "supplierstore", required: false},// برای نمایش تمام کامنت هایی که خطابشون این گاراژ یا یدکی یا مکانیک بوده
    comment: {type: String, required: true},
    show: {type: Boolean, required: true, default: true},
    openToComment: {type: Boolean, default: true},
    answers: {type: [AnswerSchema], default: []},
},{
    timestamps: {createdAt: true}
}) 

module.exports = {
    CommentSchema,
}