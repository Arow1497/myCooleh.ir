const createError = require("http-errors");
const Controller = require("../controller");
const { UsersModel } = require("../../../models/Main/user");


class UserProfileController extends Controller{


   async userProfile(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async showUserResume(req, res, next){
    try {
      //اگر صاحب گاراژه پروژه های گاراژ اگر مکانیک فریلنسه پروژه هایی که به اسمشه
    } catch (error) {
        next(error)
    }
   }

   async showUserBookmarks(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async showUserPosts(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async ShowUserComments(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async ShowUserDastyarCoWorks(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async ShowUsersGarageProfile(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }


   async ShowGarageComments(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async ShowGarageProjects(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async ShowGarageDastyarReqs(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async ShowGarageOutsourcingReqs(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

   async ShowUsersSupplierStoreProfile(req, res, next){
    try {
      
    } catch (error) {
        next(error)
    }
   }

}

module.exports = {
    UserProfileController: new UserProfileController()
}