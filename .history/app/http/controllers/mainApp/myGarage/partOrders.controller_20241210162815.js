/*
*1.carInspectionSheetWithImagesForSendingToClient:
* بررسی و اینسپکشن مکانیک (از مشکلات مورد نظر و بخش های مربوطه نه اینسپکشن کلی خودرو اون برای 
*  بخش متریک هست) و ثبت موارد ایراد و قطعات خراب همراه باتصویر و وویس و اسم قطعه یدکی موردنیاز که در مدل 
* ProjectEarlyInspectionList ثبت میشن
* مکانیک اول این لیست ایرادات رو که همراه هست با لیست قطعات مورد نیاز برای مشتری میفرسته بعد
*  مشتری مواردی از اون لیست انتخاب میکنه و مراحل بعد برای ثبت پارت اوردر
______________________________________________________________________________
* 2.  گاهی اوقات یک لیستی از معایب و قطعاتی که نیاز هست تهیه میشه و کلاینت موادی رو تایید میده
* بعد توی کار میرن میبینن ایراد های جدیدی مشخص میشه اونموقع یکبار دیگه این رو یه 
* آپدیت میزنن و مشتری باز باید تایید کنه یا خیر
*/


const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const GaragePartOrdersService = require("../../../services/mainApp/myGarage/partOrders.service");

class GaragePartOrdersController extends Controller {
     // Controller methods
     //اگهی هایی که ثبت میشن باید لوکیشن داشته باشن و یدکی های محدوده ۱۰ ۲۰ کیلومتری 
     //بتونن ببینن اگر قطعات نایاب بود گزینه پیشنهاد به کل یدکی ها وجود داشته باشه


     //Controllers
   // 1. Car Insepction Sheet With Required Parts And Images For Sending To Client To Approval
     async carInspection(req, res, next){
        try {
          
        } catch (error) {
            
        }
     }

  // 2. Update Estimated Broken Sections With Required Parts For Client Approval By Garage
    async updateInspection(req, res, next){
        try {
           
        } catch (error) {
            
        }
    }

    async chooseAllowedPartsByClient(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async garageOwnerSuggestHisOwnBussinesPartOrderSupply(req, res, next){
        try {
            //صاحبان گاراژ میتونن قطعاتی که به انبار خودشون اضافه کردن از طریق 
            //خرید عمده کوپن های اسکواد به مشتری پیشنهاد تامین بدند
            // و فقط اون قطعاتی که موجود ندارند پارت اوردر ثبت کنن برای تامین خارجی
            //تازه اونم اولویت ساپلایر اسکواد
        } catch (error) {
            
        }
    }

    async createPartOrder(req, res, next) {
        try {
            const result = await GaragePartOrdersService.createPartOrder(
                req.user,
                req.body,
                req.params,
                req.files
            );

            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "درخواست تامین قطعه با موفقیت ثبت شد",
                    orders: result.orders,
                    share: result.share
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    async sendSelectedRequestsToClient(req, res, next) {
        try {
            await GaragePartOrdersService.sendSelectedRequestsToClient(req.body);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "درخواست‌های انتخاب شده به مشتری ارسال شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async notifyThatClientChooseOneSupplyReqs(req, res, next) {
        try {
            await GaragePartOrdersService.notifyClientChoice(req.body);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "انتخاب مشتری ثبت شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllPartOrderReqs(req, res, next) {
        try {
            const orders = await GaragePartOrdersService.getAllPartOrderReqs(req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { orders }
            });
        } catch (error) {
            next(error);
        }
    }

    async getOnePartOrderReqById(req, res, next) {
        try {
            const orders = await GaragePartOrdersService.getOnePartOrderReqById(req.params.partOrderId);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { orders }
            });
        } catch (error) {
            next(error);
        }
    }

    async removePartOrderReqById(req, res, next) {
        try {
            await GaragePartOrdersService.removePartOrderReqById(req.params.partOrderId, req.user.id);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "سفارش قطعه با موفقیت حذف شد" }
            });
        } catch (error) {
            next(error);
        }
    }

    async editPartOrderReqById(req, res, next) {
        try {
            const updatedOrder = await GaragePartOrdersService.editPartOrderReqById(
                req.params.partOrderId,
                req.user.id,
                req.body,
                req.files
            );

            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "سفارش قطعه با موفقیت بروزرسانی شد",
                    orders: updatedOrder
                }
            });
        } catch (error) {
            deleteFilesInPublicForOrders(req.files);
            next(error);
        }
    }

    async toggleBookmark(req, res, next) {
        try {
            const result = await GaragePartOrdersService.toggleBookmark(
                req.params.partOrderId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: result.message }
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllGaragePartOrderReqs(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getAllGaragePartOrderReqs(req.user, req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllSupplierStorePartOrderRequestsToItself(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getAllSupplierStorePartOrderRequestsToItself(
                req.user.id,
                req.query
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getGarageAllActivePartOrdersRequests(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getGarageAllActivePartOrdersRequests(req.user, req.query);
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getSupplierStoreAllActivePartOrderReqs(req, res, next) {
        try {
            const result = await GaragePartOrdersService.getSupplierStoreAllActivePartOrderReqs(
                req.user.id,
                req.query
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async sharePartOrderRequest(req, res, next) {
        try {
            const result = await GaragePartOrdersService.sharePartOrderRequest(
                req.params.partOrderId,
                req.user
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async addCoworkReqForPartOrderReqFromSupplierStore(req, res, next) {
        try {
            const result = await GaragePartOrdersService.addCoworkReqForPartOrderReqFromSupplierStore(
                req.user,
                req.params.partOrderId,
                req.params.apprenticeId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { ordersApprenticeAppReqs: result }
            });
        } catch (error) {
            next(error);
        }
    }

    async showSuplierStorePartOrderRequestsForRequesterGarage(req, res, next) {
        try {
            const requests = await GaragePartOrdersService.showSuplierStorePartOrderRequestsForRequesterGarage(
                req.user?.ownedGarage?.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { requests }
            });
        } catch (error) {
            next(error);
        }
    }

    async addSupplierStoreToPartOrderRequest(req, res, next) {
        try {
            const result = await GaragePartOrdersService.addSupplierStoreToPartOrderRequest(
                req.user,
                req.params,
                req.body
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شاگرد موردنظر به پروژه افزوده شد",
                    result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteThisSupplierStoreFromPartOrderRequest(req, res, next) {
        try {
            await GaragePartOrdersService.deleteSupplierStoreFromPartOrderRequest(
                req.user?.ownedGarage?.id,
                req.params.partOrderId,
                req.params.apprenticeId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شاگرد موردنظر از پروژه حذف شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteThisSupplierStoreFromPartOrderRequestByClient(req, res, next){
        try {
            
        } catch (error) {
            
        }
    }

    async supplierStoreRefusingFromThisPartOrderReq(req, res, next) {
        try {
            await GaragePartOrdersService.supplierStoreRefusingFromPartOrderReq(
                req.user.id,
                req.params.partOrderId
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شما از این همکاری با موفقیت استعفا دادید"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async confirmTransactionCompletion(req, res, next) {
        try {
            await GaragePartOrdersService.confirmTransactionCompletion(
                req.params.transactionId,
                req.user.id,
                req.user.apprenticeAt ? 'apprentice' : 'garageOwner'
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: { message: "این همکاری از سمت شما با موفقیت پایان یافت" }
            });
        } catch (error) {
            next(error);
        }
    }

    async createComplaint(req, res, next) {
        try {
            await GaragePartOrdersService.createComplaint(
                req.params,
                req.user,
                req.body,
                req.files
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شکایت شما از طرف همکاری ثبت شد برای بررسی و حصول نتیجه صبور باشید"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async removeAndRegretComplaintByrequester(req, res, next) {
        try {
            await GaragePartOrdersService.removeAndRegretComplaint(
                req.params.complaintId,
                req.user.id
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "شکایت شما با موفقیت لغو شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async respondToComplaint(req, res, next) {
        try {
            const updatedComplaint = await GaragePartOrdersService.respondToComplaint(
                req.params.complaintId,
                req.user.id,
                req.body.response,
                req.files,
                req.body.fileUploadPath
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ شما به شکایت ثبت شد",
                    complaint: updatedComplaint
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async addReviewForApprenticeRequest(req, res, next) {
        try {
            //نظر و امتیاز گاراژ و یدکی و مشتری هر سه با همین هندلر ثبت بشه
            // طبیعتا آپسرت و آپدیت و کریت باید باشه
            await GaragePartOrdersService.addReviewForApprenticeRequest(
                req.params,
                req.body,
                req.user
            );
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                data: {
                    message: "باتشکر...نظر و امتیاز شما برای این همکاری ثبت شد"
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // add General conversation service 
}

module.exports = {
    GaragePartOrdersController: new GaragePartOrdersController()
};


/*


حق با شماست، کوئری زدن به دیتابیس برای تک تک کاربران و محاسبه فاصله آن‌ها با منتشر کننده سفارش اصلا بهینه نیست، مخصوصا 
اگر تعداد کاربران زیاد باشد. این کار باعث بارگذاری بیش از حد روی دیتابیس و کند شدن سیستم می‌شود.

برای حل این مشکل، می‌توان از راهکارهای بهینه‌تری استفاده کرد:

1. استفاده از قابلیت‌های جغرافیایی پایگاه داده:

برخی از پایگاه‌های داده مانند PostgreSQL (با افزونه PostGIS) و MongoDB 
از قابلیت‌های جغرافیایی پشتیبانی می‌کنند. این قابلیت‌ها به شما اجازه می‌دهند تا کوئری‌هایی را بر اساس موقعیت مکانی اجرا کنید.

PostGIS: می‌توانید از توابع مکانی مانند ST_DWithin برای پیدا کردن نقاطی که در یک شعاع مشخص از یک نقطه دیگر قرار دارند استفاده کنید.

MongoDB: می‌توانید از عملگر $geoNear برای پیدا کردن نزدیک‌ترین نقاط به یک نقطه مشخص استفاده کنید.

با استفاده از این قابلیت‌ها، می‌توانید کوئری خود را
 به گونه‌ای بنویسید که فقط کاربرانی که در فاصله 20 کیلومتری از منتشر کننده سفارش قرار دارند
 را برگرداند. این کار باعث می‌شود که تعداد محاسبات فاصله به شدت کاهش یابد.

مثال با PostGIS:

SELECT u.*
FROM "User" u
JOIN "UserNotificationSettings" uns ON u.id = uns."userId"
WHERE ST_DWithin(
    u.location::geography, -- مختصات کاربر
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, -- مختصات منتشر کننده
    20000 -- شعاع 20 کیلومتر
)
AND uns."locationBasedNotifications" = true; -- اضافه کردن شرط برای فعال بودن نوتیفیکیشن بر اساس مکان
Use code with caution.
SQL
2. استفاده از GeoHashing:

GeoHash یک سیستم کدگذاری جغرافیایی است که مختصات جغرافیایی
 را به یک رشته کوتاه تبدیل می‌کند. نقاطی که به هم نزدیک هستند، GeoHash های مشابهی دارند.

می‌توانید GeoHash مربوط به موقعیت مکانی هر کاربر را در دیتابیس ذخیره کنید. سپس، در زمان پردازش سفارش جدید، GeoHash
 مربوط به موقعیت مکانی منتشر کننده را محاسبه کنید و کاربرانی که GeoHash مشابه (با دقت مشخص) دارند را پیدا کنید. این کار تعداد محاسبات فاصله را به شدت کاهش می‌دهد.

کتابخانه‌هایی مانند ngeohash در پایتون و geohash-tools در جاوااسکریپت می‌توانند در پیاده‌سازی GeoHashing به شما کمک کنند.

3. استفاده از حافظه پنهان (Cache):

می‌توانید لیستی از کاربران فعال و موقعیت مکانی آن‌ها را در حافظه پنهان (مانند Redis) ذخیره کنید. این کار باعث می‌شود که دیگر نیازی به کوئری زدن به دیتابیس برای هر بار محاسبه فاصله نباشد.
 البته باید مکانیزمی برای به‌روزرسانی اطلاعات حافظه پنهان در نظر بگیرید.

4. ترکیبی از روش‌ها:

می‌توانید از ترکیبی از روش‌های بالا برای بهینه‌سازی
 بیشتر استفاده کنید. به عنوان مثال، می‌توانید از قابلیت‌های جغرافیایی پایگاه داده برای فیلتر کردن اولیه کاربران استفاده کنید و سپس از GeoHashing یا حافظه پنهان برای کاهش بیشتر محاسبات فاصله استفاده کنید.

انتخاب بهترین روش به عوامل مختلفی مانند نوع پایگاه داده، تعداد کاربران، و میزان دقت مورد نیاز بستگی دارد.

با استفاده از این راهکارها، می‌توانید سیستم ارسال پوش نوتیفیکیشن خود را بهینه‌تر کنید و از بارگذاری بیش از حد روی دیتابیس جلوگیری کنید.


بله، این ایده بسیار خوبی است و می‌تواند بهینه‌سازی قابل توجهی در سیستم ایجاد کند. فیلتر کردن کاربرانی که در 10 دقیقه گذشته فعال بوده‌اند، منطقی به نظر می‌رسد زیرا احتمال اینکه این کاربران همچنان آنلاین باشند و به نوتیفیکیشن پاسخ دهند بیشتر است.

در اینجا چند روش برای پیاده‌سازی این فیلتر وجود دارد:

1. اضافه کردن فیلد lastActivityAt به مدل User:

می‌توانید یک فیلد lastActivityAt از نوع DateTime به مدل User اضافه کنید که زمان آخرین فعالیت کاربر را ذخیره می‌کند. سپس، در هر بار که کاربر فعالیتی انجام می‌دهد (مثلا وارد برنامه می‌شود، صفحه‌ای را مشاهده می‌کند، یا سفارشی را ثبت می‌کند)، این فیلد را به‌روزرسانی کنید.

با داشتن این فیلد، می‌توانید در کوئری خود کاربرانی که lastActivityAt آن‌ها در 10 دقیقه گذشته بوده است را فیلتر کنید.

مثال با Prisma:

const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

const nearbyActiveUsers = await prisma.user.findMany({
  where: {
    lastActivityAt: {
      gte: tenMinutesAgo, // بزرگتر یا مساوی 10 دقیقه پیش
    },
    ... سایر شرایط مانند فاصله جغرافیایی
  },
});
Use code with caution.
JavaScript
2. استفاده از Redis برای ذخیره وضعیت آنلاین/آفلاین کاربران:

می‌توانید از Redis به عنوان یک حافظه پنهان سریع برای ذخیره وضعیت آنلاین/آفلاین کاربران استفاده کنید. به ازای هر کاربر آنلاین، یک کلید در Redis با زمان انقضای 10 دقیقه‌ای ایجاد کنید. هر بار که کاربر فعالیتی انجام می‌دهد، زمان انقضای این کلید را دوباره تنظیم کنید.

سپس، می‌توانید به جای کوئری زدن به دیتابیس، از Redis برای پیدا کردن کاربرانی که در 10 دقیقه گذشته فعال بوده‌اند استفاده کنید.

3. ترکیبی از روش‌ها:

می‌توانید از ترکیبی از دو روش بالا استفاده کنید. به عنوان مثال، می‌توانید از فیلد lastActivityAt برای فیلتر کردن اولیه کاربران در دیتابیس استفاده کنید و سپس از Redis برای بررسی دقیق‌تر وضعیت آنلاین بودن آن‌ها استفاده کنید.

مزایای فیلتر کردن کاربران بر اساس آخرین فعالیت:

کاهش تعداد محاسبات: با فیلتر کردن کاربران غیرفعال، تعداد محاسبات فاصله به شدت کاهش می‌یابد.

افزایش کارایی: سیستم سریع‌تر پاسخ می‌دهد زیرا فقط با کاربرانی که احتمالا آنلاین هستند کار می‌کند.

کاهش مصرف منابع: منابع کمتری (مانند CPU و حافظه) مصرف می‌شود.

معایب:

پیچیدگی بیشتر: پیاده‌سازی این فیلتر نیازمند کدنویسی بیشتر و مدیریت وضعیت آنلاین/آفلاین کاربران است.

احتمال از دست دادن برخی کاربران: کاربرانی که دقیقا در لحظه ارسال نوتیفیکیشن آفلاین شده‌اند، نوتیفیکیشن را دریافت نخواهند کرد.

در نهایت، تصمیم‌گیری در مورد اینکه آیا این فیلتر را پیاده‌سازی کنید یا نه، به نیازهای پروژه شما و میزان پیچیدگی که حاضرید برای بهینه‌سازی سیستم متحمل شوید بستگی دارد.

اگر تعداد کاربران شما زیاد است و کارایی سیستم برای شما اهمیت زیادی دارد، فیلتر کردن کاربران بر اساس آخرین فعالیت می‌تواند یک راهکار بسیار موثر باشد.


بله، درسته. اگر صرفا یک فیلد lat/lng برای هر کاربر در دیتابیس ذخیره کنیم، بدون استفاده از قابلیت‌های جغرافیایی دیتابیس یا راهکارهای دیگر مانند GeoHashing، باز هم مجبوریم فاصله تک تک کاربران را با منتشر کننده سفارش محاسبه کنیم که اصلا بهینه نیست.

هدف من از پیشنهاد ذخیره لوکیشن کاربران در دیتابیس، استفاده از آن همراه با راهکارهای بهینه‌سازی بود که در پاسخ‌های قبلی توضیح دادم. در واقع، ذخیره لوکیشن، پیش‌نیاز استفاده از این راهکارهاست.

اجازه بدید یک بار دیگر به صورت خلاصه و واضح‌تر، راهکارهای بهینه‌سازی را با تاکید بر لزوم ذخیره لوکیشن مرور کنیم:

1. استفاده از قابلیت‌های جغرافیایی پایگاه داده (پیشنهاد اصلی):

پیش‌نیاز: ذخیره لوکیشن کاربران به صورت یک ستون Point یا Geometry (بسته به نوع دیتابیس) در دیتابیس.

راهکار: استفاده از توابع و عملگرهای جغرافیایی ارائه شده توسط دیتابیس (مانند ST_DWithin در PostGIS یا $geoNear در MongoDB) برای فیلتر کردن کاربران بر اساس فاصله.

مزیت: بهینه‌ترین راه حل، زیرا محاسبات فاصله توسط خود دیتابیس و به صورت بهینه انجام می‌شود.

مثال (PostGIS): در مثال قبلی، u.location همان ستون Point یا Geometry است که لوکیشن کاربر را ذخیره می‌کند.

2. استفاده از GeoHashing:

پیش‌نیاز: ذخیره لوکیشن کاربران (lat/lng) و محاسبه و ذخیره GeoHash متناظر با آن در دیتابیس.

راهکار: محاسبه GeoHash منتشر کننده سفارش و فیلتر کردن کاربران بر اساس GeoHash های مشابه.

مزیت: کاهش محاسبات فاصله با تبدیل مختصات جغرافیایی به رشته‌های قابل مقایسه.

3. استفاده از حافظه پنهان (Cache):

پیش‌نیاز: ذخیره لوکیشن کاربران فعال در حافظه پنهان (مانند Redis) همراه با اطلاعات دیگر مانند وضعیت آنلاین بودن.

راهکار: محاسبه فاصله فقط برای کاربرانی که در حافظه پنهان حضور دارند (کاربران فعال).

مزیت: کاهش بار دیتابیس و افزایش سرعت با ذخیره اطلاعات کاربران فعال در حافظه پنهان.

4. فیلتر بر اساس آخرین فعالیت:

پیش‌نیاز: ذخیره زمان آخرین فعالیت کاربران.

راهکار: ترکیب این فیلتر با یکی از روش‌های بالا (مثلا ابتدا کاربران فعال در 10 دقیقه اخیر را فیلتر کرده، سپس از قابلیت‌های جغرافیایی دیتابیس برای محاسبه فاصله بین آن‌ها استفاده کنیم).

مزیت: کاهش محاسبات با تمرکز بر کاربران فعال.

تاکید می‌کنم که صرف ذخیره لوکیشن کاربران بدون استفاده از این راهکارها، مشکل عدم بهینگی را حل نخواهد کرد.

امیدوارم این توضیحات واضح‌تر بوده باشد. هدف نهایی ما استفاده از ترکیبی از این روش‌ها برای رسیدن به بهترین کارایی و کمترین بار پردازشی است. انتخاب ترکیب مناسب به عوامل مختلفی مانند نوع دیتابیس، تعداد کاربران، و میزان دقت مورد نیاز بستگی دارد.
*/