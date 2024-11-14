const createError = require("http-errors");
const { ProductSuppliersModel } = require("../../../models/PartSupplier.js/agahi.shop.supplier");
const Controller = require("../../controller");


class ShopNearByProductController extends Controller{



   async getAllProducts(req, res, next){
    try {
        const {search} = req.query;
        const {category} = req.query;
        userLocation = req.user.garageLat_Lng;
        let product;
        let query;
        if(search) {
            query.$text = {$search: search};
        }
        if(category){
            query.category = category;
        }
         query.location = {
            $geoWithin: {
                $centreSphere: [
                  [userLocation.coordinates[0], userLocation.coordinates[1]],
                  10 / 6378.1
                ]
              }
         }
        product = await ProductSuppliersModel.find(query)
        .populate([
            {path: "category", select: {title: 1}},
            {path: "publisher", select: {first_name: 1, last_name:1, mobile:1}},
            {path: "comments.from_user"},
            {path: "likes"},
            {path: "dislikes"},
            {path: "bookmarks"},
        ])
        .sort({_id : -1})
    
        return res.status(HttpStatus.OK).json({
            statusCode : HttpStatus.OK,
            data : {
                product
            }
        });
    } catch (error) {
        next(error)
    }
   }


}

module.exports = {
    ShopNearByProductController: new ShopNearByProductController()
}