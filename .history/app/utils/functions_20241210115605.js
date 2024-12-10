const crypto = require("crypto");
const {v4: uuidv4} = require("uuid");
const fs = require("fs");
const path = require("path");
const createError = require("http-errors");
const ffmpeg = require("fluent-ffmpeg");


function RandomNumberGenerator(){
    return Math.floor((Math.random() * 90000) + 10000)
}

        function refferalAndSerialNumGenerator(){
           const generateRandomString = (length) => {
            return crypto.randomBytes(length).toString("hex");
           };
           const timestamp = Date.now().toString();
           const randomString = generateRandomString(4);
           const uuid = uuidv4();
           const combinedString = `${timestamp}-${randomString}-${uuid}`;
           const hash = crypto.createHash("sha256").update(combinedString).digest("hex");
           const serialNumber = hash.substring(0,10);
           return serialNumber;
    }

    function getLink(ObjectId){
    const randomString = Math.random().toString(36).substring(2,10);
    const currentTime = new Date().toISOString();
    const combine = `${ObjectId}${randomString}${currentTime}`;
    const hash = crypto.createHash("sha256").update(combine).digest("hex");
    return hash;
    }


    function getTime(seconds) {
      // گرد کردن مقدار ورودی به نزدیک‌ترین عدد صحیح
      seconds = Math.round(seconds);
  
      // محاسبه‌ی ساعت، دقیقه و ثانیه
      let hours = Math.floor(seconds / 3600);
      seconds %= 3600;
      let minutes = Math.floor(seconds / 60);
      seconds %= 60;
  
      // اضافه کردن 0 برای اعداد تک‌رقمی
      hours = String(hours).padStart(2, '0');
      minutes = String(minutes).padStart(2, '0');
      seconds = String(seconds).padStart(2, '0');
  
      // بازگرداندن زمان به قالب "hh:mm:ss"
      return `${hours}:${minutes}:${seconds}`;
  }
  

       function deleteFileInPublic(fileAddress){
        if(fileAddress){
        const pathFile = path.join(__dirname, "..", "..", "public", fileAddress)
        if(fs.existsSync(pathFile)) fs.unlinkSync(pathFile)
    }
    }

    function deleteFilesInPublicForPosts(files) {
        if (!files) return;
        // حذف تصاویر
        if (files.images && Array.isArray(files.images)) {
          files.images.forEach((file) => {
            const filePath = path.join(file.destination, file.filename);
            console.log('Deleting image file at:', filePath); // اضافه کردن log برای بررسی مسیر
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            } else {
              console.log('File does not exist:', filePath);
            }
          });
        }
        // حذف ویدئو
        if (files.video && Array.isArray(files.video)) {
          files.video.forEach((file) => {
            const filePath = path.join( file.destination, file.filename);
            console.log('Deleting video file at:', filePath); // اضافه کردن log برای بررسی مسیر
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            } else {
              console.log('File does not exist:', filePath);
            }
          });
        }
      }

      function deleteFilesInPublicForOrders(files) {
        if (!files) return;
        // حذف تصاویر
        if (files.images && Array.isArray(files.images)) {
          files.images.forEach((file) => {
            const filePath = path.join(file.destination, file.filename);
            console.log('Deleting image file at:', filePath); // اضافه کردن log برای بررسی مسیر
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            } else {
              console.log('File does not exist:', filePath);
            }
          });
        }
        // حذف ویدئو
        if (files.audio && Array.isArray(files.audio)) {
          files.audio.forEach((file) => {
            const filePath = path.join( file.destination, file.filename);
            console.log('Deleting audio file at:', filePath); // اضافه کردن log برای بررسی مسیر
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            } else {
              console.log('File does not exist:', filePath);
            }
          });
        }
      }

    function copyObjet(object){
        return JSON.parse(JSON.stringify(object))
       }
    
       function deleteInvalidPropertyInObject(data = {}, blackListFields = []){
        let nullishData = ["", " ", "0", 0, null, undefined]
        Object.keys(data).forEach(key => {
            if(blackListFields.includes(key)) delete data[key]
            if(typeof data[key] == "string") data[key] = data[key].trim();
            if(Array.isArray(data[key]) && data[key].length > 0 ) data[key] = data[key].map(item => item.trim()) 
            if(Array.isArray(data[key]) && data[key].length == 0 ) delete data[key];
            if(nullishData.includes(data[key])) delete data[key];
        })
        return data;
       }

       function ListOfImagesFromRequest(files, fileUploadPath){
        if(files?.images?.length > 0){
         return files.images
         .map(file => path.join(fileUploadPath, file.filename))
         .map(item => item.replace(/\\/gi, "/"));
        }else{
         return [];
        }
         }

         const stringToArray = function(...args) {
            return function(req, res, next){
               const fields = args;
               fields.forEach(field => {
               if(req.body[field]){
                if(typeof req.body[field] == "string"){
                   if(req.body[field].indexOf("#") >= 0){
                       req.body[field] = (req.body[field].split("#")).map(item => item.trim())
                   } else if(req.body[field].indexOf(",") >= 0){
                       req.body[field] = (req.body[field].split(",")).map(item => item.trim())
                   }else {
                       req.body[field] = [req.body[field]]
                   }
                }
                if(Array.isArray(req.body[field])){
                   req.body[field] = req.body[field].map(item => item.trim())
                      req.body[field] = [...new Set(req.body[field])]
                }
               }else{
                   req.body[field] = []
               }
               })
               next();
            }
       } 

       async function findNearby(model, ObjectId, userLocation){
        try {
          const findedNearby = await model.findById(ObjectId);
          if(!findedNearby || findedNearby.location)throw createError.BadRequest("سند مورد نظر پیدا نشد یا موقعیت مکانی ثبت شده ندارد");
          const nearby = await model.find({
            location: {
              $geoWithin: {
                $centreSphere: [
                  [userLocation.coordinates[0], userLocation.coordinates[1]],
                  10 / 6378.1
                ]
              }
            }
          });
          return nearby;
        } catch (error) {
          console.error("خطا در پردازش اسناد نزدیک", error)
          throw error;
          }
       }
       async function audioSeconds(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    console.error("Error in ffprobe:", err);
                    return reject(err);
                }
                const duration = parseFloat(metadata.format.duration);
                resolve(duration);
            });
        });
    }
    

    module.exports = {
        RandomNumberGenerator,
        refferalAndSerialNumGenerator,
        getTime,
        deleteFileInPublic,
        copyObjet,
        deleteInvalidPropertyInObject,
        ListOfImagesFromRequest,
        stringToArray,
        deleteFilesInPublicForPosts,
        getLink,
        findNearby,
        audioSeconds,
        deleteFilesInPublicForOrders
    }