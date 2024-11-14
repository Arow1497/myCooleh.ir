const createHttpError = require('http-errors');
const {CategoryModel} = require("../../../../models/Main/categories");
const Controller = require('../../controller');
const {addCategorySchema, updateCategorySchama} = require("../../../validators/admin/category.schema");
const mongoose = require("mongoose");

class CategoryController extends Controller {

    async addCategory(req, res, next) {
        try {
          await addCategorySchema.validateAsync(req.body);
          const { title, parent } = req.body;
          const category = await CategoryModel.create({ title, parent });
          if (!category) throw createHttpError.InternalServerError("خطای داخلی");
          return res.status(201).json({
            statusCode: 201,
            data: {
              message: "دسته بندی با موفقیت افزوده شد",
            },
          });
        } catch (error) {
          next(error);
        }
      }

    async getAllParents(req, res, next) {
        try {
            const parents = await CategoryModel.find({parent: undefined},{__v: 0});
            return res.status(200).json({
                data: {
                    parents
                }
            })
        } catch (error) {
            
        }
    }
    async getChildOfParents(req, res, next) {
        try {
            const {parent} = req.params;
            const children = await CategoryModel.find({parent},{__v: 0, parent: 0});
            return res.status(200).json({
                data:{
                    children
                }
            })
        } catch (error) {
            next(error);
        }
    }

    async getAllCategory(req, res, next) {
        try {
        //    const category = await CategoryModel.aggregate([
        //     {
        //         $lookup: {
        //             from: "categories",
        //             localField: "_id",
        //             foreignField: "parent",
        //             as: "children"
        //         }
        //     },
        //     {
        //         $project: {
        //             __v: 0,
        //             "children.__v": 0
        //         }
        //     },
        //     {
        //         $match: {
        //             parent: undefined
        //         }
        //     }
        //    ])
        const category = await CategoryModel.find({parent: undefined},{__v: 0})
        return res.status(200).json({
            data: {
                statusCode: 200,
                category
            }
        })
            
        } catch (error) {
            next(error);
        }
    }

 async removeCategory(req, res, next) {
    try {
     const {id} = req.params;
     const category = await this.checkExistCategory(id)
     const deleteResult = await CategoryModel.deleteMany({
        $or : [
        {_id: category._id},
        {parent: category._id}
     ]});
     if(deleteResult.deletedCount == 0) throw createHttpError.InternalServerError("حذف دسته بندی انجام نشد");
    return res.status(200).json({
    data: {
    statuscode:200,
        message: "حذف دسته بندی و زیر مجموعه هاش با موفقیت انجام شد"
            }
          })
        } catch (error) {
            next(error);
        }
    }

    async updateCategoryTitle(req, res, next) {
        try {
         const {id} = req.params;
         const {title} = req.body;
         console.log(req.body);
         const category = await this.checkExistCategory(id);
         await updateCategorySchama.validateAsync(req.body);
         const resultUpdate = await CategoryModel.updateOne({_id: id}, {$set: {title}});
         if(resultUpdate.modifiedCount == 0) throw createHttpError.InternalServerError("بروزرسانی انجام نشد");
         return res.status(200).json({
            data: {
                statusCode: 200,
                message: "بروزرسانی با موفقیت انجام شد"
            }
         })
            } catch (error) {
                next(error);
            }
        }
    async getAllCategoryWithoutPopulate(req, res, next) {
    try {
        const category = await CategoryModel.aggregate([
            {
                $match: {}
            }
        ]);
            return res.status(200).json({
                data: {
                    category
                }
            })
       
    } catch (error) {
        next(error)
    }
    }
    
    async getCategoryById(req, res, next) {
        try {
            const {id: _id} = req.params;
            console.log(mongoose.Types.ObjectId.isValid(_id));
         const category = await CategoryModel.aggregate([
            {
              $match: { _id: new mongoose.Types.ObjectId(_id) },
            },
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "parent",
                as: "children",
              },
            },
            {
              $project: {
                __v: 0,
                "children.__v": 0,
                "children.parent": 0,
              },
            },
          ]);
                  return res.status(200).json({
            data: {
              category  
            }
         })
        } catch (error) {
            next(error);
        }
    }
    
    async checkExistCategory(id){
         const category =  await CategoryModel.findById(id);
         if(!category) throw createHttpError.NotFound("دسته بندی یافت نشد");
         return category;
    }
}

module.exports = {
    CategoryController: new CategoryController()
}