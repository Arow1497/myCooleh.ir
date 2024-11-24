const createError = require("http-errors");
const Controller = require("../controller");


class GarageProfileController extends Controller{

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
GarageProfileController: new GarageProfileController()
}