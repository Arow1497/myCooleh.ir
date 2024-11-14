const { default: mongoose } = require("mongoose");


const ProductSchema = new mongoose.Schema({
    productID: {type: mongoose.Types.ObjectId, ref: "product"},
    count: {type: Number, defaut: 1}
})

const CourseSchema = new mongoose.Schema({
    courseID: {type: mongoose.Types.ObjectId, ref: "course"},
    count: {type: Number, defaut: 1}
})

const BasketSchema = new mongoose.Schema({
    courses: {type: [CourseSchema], default: []},
    products: {type: [ProductSchema], default: []},
})



const ClientSchema = new mongoose.Schema({
    first_name : {type: String},
    last_name : {type: String},
    mobile : {type: String, required: true},
    otp : {type: Object, default: {
        code: 0,
        expires: 0
    }},
    carPlateNumber : {type: String, required: false},// این چند مورد وقتی بخواد درخواست پذیرش به گاراژ بده ازونجا گرفته میشن اینجا هم پر میشن
    carModel : {},
    carChassisNumber : {},
    carBuildYear : {},
    province: {type: String},
    city: {ttype: String},
    Role : {type: String, required: true},
    basket: {type: BasketSchema, default:{}}
  }, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});
ClientSchema.index({first_name: "text", last_name: "text", username: "text", mobile: "text", email: "text"})

module.exports = {
    ClientsModel: mongoose.model("client", ClientSchema)
}