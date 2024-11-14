const createError = require("http-errors");
const Controller = require("../../controller");


class SubscriptionController extends Controller{

  async  buySubscription (req, res) {
    const userId = req.user.id;
    const subscriptionType = req.body.subscriptionType; // نوع اشتراک: ماهانه یا سالانه

    let subscriptionDuration;
    if (subscriptionType === 'monthly') {
        subscriptionDuration = 1; // 1 ماه
    } else if (subscriptionType === 'yearly') {
        subscriptionDuration = 12; // 12 ماه
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + subscriptionDuration);

    // غیرفعال کردن اشتراک‌های قبلی
    await Subscription.updateMany({ user: userId, isActive: true }, { isActive: false });

    const newSubscription = new Subscription({
        user: userId,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        isActive: true,
        subscriptionType: subscriptionType,
    });

    await newSubscription.save();

    res.send('Subscription purchased successfully!');
}

async getUserSubscriptionHistory(req, res, next){
    try {
        const { userId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId." });
        }
        const conversations = await ConversationModel.find({ participants: userId });
        if (!conversations.length) {
            return res.status(404).json({ message: "No conversations found." });
        }
        return res.status(200).json({ 
            conversations 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error." });
    }
}
}

module.exports = {
    SubscriptionController: new SubscriptionController()
}