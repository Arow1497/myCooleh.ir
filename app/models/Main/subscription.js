const { default: mongoose } = require("mongoose");

const SubscriptionHistorySchema = new mongoose.Schema({
    user : {type: mongoose.Types.ObjectId, ref: "user", required: false},
    subscriptionType: {type: String, enum:["monthly", "threemounth", "sixmounth", "yearly", "free"], default: "free"}, // free/ monthly/ yearly/ etc     
    purchaseDate : {type: Date, default: Date.now},
    startDate : {type: Date, required: true},
    endDate : {type: Date, required: true},
    amountPaid : {type: Number, required: true},
    isActive: {type: Boolean, default: true},
    payment : {type: mongoose.Types.ObjectId, ref: "Payment", required: true}
}, {
    timestamps: true,
});


const SubscriptionSchema = new mongoose.Schema({
    user : {type: mongoose.Types.ObjectId, ref: "user", required: false},
    currentSubscription : {type: SubscriptionHistorySchema, default: undefined},
    subscriptionHistory : {type: [SubscriptionHistorySchema], default: [] },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});

SubscriptionSchema.index({first_name: "text", last_name: "text", username: "text", mobile: "text", email: "text"})

module.exports = {
    SubscriptionsModel: mongoose.model("subscription", SubscriptionSchema)
}



