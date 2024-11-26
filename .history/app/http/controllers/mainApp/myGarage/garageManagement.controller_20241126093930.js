const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class GarageManagementController extends Controller {
    // Private helper methods
    async #validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
            throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
    }

    // Garage Management Methods

    async updateGarage(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const updateData = req.body;

            const garage = await prisma.garage.update({
                where: { id: garageId },
                data: updateData
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "اطلاعات گاراژ با موفقیت بروزرسانی شد",
                    garage
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

   // Team Management
   async addApprentice(req) {
    try {
        const garageId = await this.#validateGarageOwnership(req.user);
        const { apprenticeId } = req.body;

        const garage = await prisma.garage.update({
            where: { id: garageId },
            data: {
                apprentices: {
                    connect: { id: apprenticeId }
                }
            },
            include: {
                apprentices: true
            }
        });

        return {
            statusCode: HttpStatus.OK,
            data: {
                message: "شاگرد با موفقیت به گاراژ اضافه شد",
                garage
            }
        };
    } catch (error) {
        throw createError.BadRequest(error.message);
    }
}

async addMechanicToGarage(req) {
    try {
        const garageId = await this.#validateGarageOwnership(req.user);
        const { mechanicId } = req.body;

        const garage = await prisma.garage.update({
            where: { id: garageId },
            data: {
                mechanics: {
                    connect: { id: mechanicId }
                }
            },
            include: {
                mechanics: true
            }
        });

        return {
            statusCode: HttpStatus.OK,
            data: {
                message: "مکانیک با موفقیت به گاراژ اضافه شد",
                garage
            }
        };
    } catch (error) {
        throw createError.BadRequest(error.message);
    }
}

    async removeMechanic(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { mechanicId } = req.params;

            const garage = await prisma.garage.update({
                where: { id: garageId },
                data: {
                    mechanics: {
                        disconnect: { id: mechanicId }
                    }
                }
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "مکانیک با موفقیت از گاراژ حذف شد",
                    garage
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async removeApprentice(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { apprenticeId } = req.params;

            const garage = await prisma.garage.update({
                where: { id: garageId },
                data: {
                    apprentices: {
                        disconnect: { id: apprenticeId }
                    }
                }
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "شاگرد با موفقیت از گاراژ حذف شد",
                    garage
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async updateProjectStatus(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { projectId, status } = req.body;

            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    garageId
                }
            });

            if (!project) {
                throw createError.NotFound("پروژه مورد نظر یافت نشد");
            }

            const updatedProject = await prisma.project.update({
                where: { id: projectId },
                data: { 
                    status,
                    completedAt: status === 'COMPLETED' ? new Date() : null
                }
            });

            // Update garage metrics based on status
            if (status === 'COMPLETED') {
                await prisma.garage.update({
                    where: { id: garageId },
                    data: {
                        completedProjects: {
                            increment: 1
                        },
                        successRate: {
                            set: prisma.raw(`(completedProjects::float / NULLIF(totalProjects, 0)) * 100`)
                        }
                    }
                });
            } else if (status === 'CANCELLED') {
                await prisma.garage.update({
                    where: { id: garageId },
                    data: {
                        cancelledProjects: {
                            increment: 1
                        }
                    }
                });
            }

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "وضعیت پروژه با موفقیت بروزرسانی شد",
                    project: updatedProject
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async getGarageProjects(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { status, page = 1, limit = 10 } = req.query;

            const skip = (page - 1) * limit;
            
            const where = {
                garageId,
                ...(status && { status })
            };

            const [projects, total] = await Promise.all([
                prisma.project.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    include: {
                        client: true,
                        mechanicsTeam: true,
                        apprenticesTeam: true,
                        reviews: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.project.count({ where })
            ]);

            return {
                statusCode: HttpStatus.OK,
                data: {
                    projects,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / limit)
                    }
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async getGarageMetrics(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);

            const garage = await prisma.garage.findUnique({
                where: { id: garageId },
                select: {
                    totalProjects: true,
                    completedProjects: true,
                    cancelledProjects: true,
                    rating: true,
                    totalReviews: true,
                    successRate: true,
                    averageResponseTime: true,
                    activeComplaints: true,
                    garageSquadeProfit: true,
                    totalActivityDays: true,
                    currentStreak: true,
                    longestStreak: true
                }
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    metrics: garage
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async handleComplaint(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { complaintId, resolution } = req.body;

            const complaint = await prisma.complaint.findFirst({
                where: {
                    id: complaintId,
                    transaction: {
                        project: {
                            garageId
                        }
                    }
                }
            });

            if (!complaint) {
                throw createError.NotFound("شکایت مورد نظر یافت نشد");
            }

            const updatedComplaint = await prisma.complaint.update({
                where: { id: complaintId },
                data: {
                    resolution,
                    status: 'RESOLVED'
                }
            });

            // Update garage metrics
            await prisma.garage.update({
                where: { id: garageId },
                data: {
                    activeComplaints: {
                        decrement: 1
                    }
                }
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "شکایت با موفقیت رسیدگی شد",
                    complaint: updatedComplaint
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

     // Milestone Management
     async createMilestone(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { 
                projectId, 
                title, 
                description, 
                dueDate,
                garagePartOrderId,
                metricId,
                couponId 
            } = req.body;

            const project = await prisma.project.findFirst({
                where: { 
                    id: projectId,
                    garageId 
                }
            });

            if (!project) throw createError.NotFound("پروژه مورد نظر یافت نشد");

            const milestone = await prisma.milestone.create({
                data: {
                    projectId,
                    title,
                    description,
                    dueDate: new Date(dueDate),
                    garagePartOrderId,
                    metricId,
                    couponId
                }
            });

            return {
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "مایلستون با موفقیت ایجاد شد",
                    milestone
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    async updateMilestoneStatus(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { milestoneId, status, completedAt } = req.body;

            const milestone = await prisma.milestone.findFirst({
                where: {
                    id: milestoneId,
                    project: {
                        garageId
                    }
                }
            });

            if (!milestone) throw createError.NotFound("مایلستون مورد نظر یافت نشد");

            const updatedMilestone = await prisma.milestone.update({
                where: { id: milestoneId },
                data: {
                    status,
                    completedAt: status === 'COMPLETED' ? completedAt || new Date() : null
                }
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "وضعیت مایلستون با موفقیت بروزرسانی شد",
                    milestone: updatedMilestone
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    // Review Management
    async handleReview(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { reviewId, response } = req.body;

            const review = await prisma.review.findFirst({
                where: {
                    id: reviewId,
                    garageId
                }
            });

            if (!review) throw createError.NotFound("نظر مورد نظر یافت نشد");

            const updatedReview = await prisma.review.update({
                where: { id: reviewId },
                data: { response }
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "پاسخ به نظر با موفقیت ثبت شد",
                    review: updatedReview
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    // Financial Management
    async handleTransaction(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { 
                transactionId, 
                status,
                requesterConfirmedPayment,
                providerConfirmedPayment
            } = req.body;

            const transaction = await prisma.transaction.findFirst({
                where: {
                    id: transactionId,
                    project: {
                        garageId
                    }
                }
            });

            if (!transaction) throw createError.NotFound("تراکنش مورد نظر یافت نشد");

            const updatedTransaction = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status,
                    requesterConfirmedPayment,
                    providerConfirmedPayment,
                    paymentConfirmedAt: (requesterConfirmedPayment && providerConfirmedPayment) ? new Date() : null
                }
            });

            // Log transaction activity
            await prisma.transactionsActivityLog.create({
                data: {
                    transactionId,
                    action: `Transaction status updated to ${status}`,
                    details: {
                        previousStatus: transaction.status,
                        newStatus: status,
                        updatedBy: req.user.id
                    }
                }
            });

            return {
                statusCode: HttpStatus.OK,
                data: {
                    message: "وضعیت تراکنش با موفقیت بروزرسانی شد",
                    transaction: updatedTransaction
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    // Activity and Analytics
    async getGarageActivityLogs(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { page = 1, limit = 10 } = req.query;

            const skip = (page - 1) * limit;

            const [logs, total] = await Promise.all([
                prisma.garageActivityLog.findMany({
                    where: { garageId },
                    skip,
                    take: Number(limit),
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.garageActivityLog.count({
                    where: { garageId }
                })
            ]);

            return {
                statusCode: HttpStatus.OK,
                data: {
                    logs,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / limit)
                    }
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    // Service Projects
    async createOilServiceProject(req) {
        try {
            const garageId = await this.#validateGarageOwnership(req.user);
            const { 
                clientId, 
                vehicleDetails,
                serviceType,
                scheduledDate
            } = req.body;

            const oilServiceProject = await prisma.garageOilServiceProjects.create({
                data: {
                    garageId,
                    clientId,
                    vehicleDetails,
                    serviceType,
                    scheduledDate: new Date(scheduledDate)
                }
            });

            return {
                statusCode: HttpStatus.CREATED,
                data: {
                    message: "پروژه سرویس روغن با موفقیت ایجاد شد",
                    project: oilServiceProject
                }
            };
        } catch (error) {
            throw createError.BadRequest(error.message);
        }
    }

    ////////////////////////////////////////////////////////////////////////

    
    async getGarageAwaitListRequests(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }
    async AcceptAwaitListRequest(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async deleteThisGarageByGarageOwner(req, res, next) {
        try {
            //حذف گاراژ توسط صاحب گاراژ
        } catch (error) {
            next(error);
        }
        }

    async garageMonthlyProjectsIncomeRevenue(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }

    async garageMonthlyServicesIncomeRevenue(req, res, next){
        try {
            
        } catch (error) {
            next(error);
        }
    }
    //مجموع درآمد ورودی از سرویس هایی مثل کوپن -متریک -تامین قطعه درصدی- برونسپاری-دیوار و غیره
    // دیتیل و جزییات هرکدوم ازین سرویسها توی بخش مربوط به خودشون در دسترسه

    async getGarageMechanicsList(req, res, next){
        try {
            const garageID = req.user.GarageID;
            if(!garageID) throw createError.NotAcceptable("هنوز گاراژی ثبت نکرده اید")
            // const findMechanicsList = await GaragesModel.findById(garageID)   
        garageID.populate({
                path: "mechanicsTeam",
                select: "mechanicsTeam",
            })
            .select("mechanicsTeam")
            .exec();

            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data : {
                    findMechanicsList
                }
            });
        } catch (error) {
            next(error)
        }
    } 

    async getGarageApprenticesList(req, res, next){
        try {
            const garageID = req.user.GarageID;
            if(!garageID) throw createError.NotAcceptable("هنوز گاراژی ثبت نکرده اید")
            // const findShagerdsList = await GaragesModel.findById(garageID)   
            garageID.populate({
                path: "shagerds",
                select: "shagerds",
            })
            .select("shagerds")
            .exec();

            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data : {
                    findShagerdsList
                }
            });
        } catch (error) {
            next(error)
        }
    } 

    async mechanicMonthlyPercentageCheckOut(req, res, next){
        try {
            const mechanicId = req.params.mechanicId;
            const { year, month } = req.query;
    
            // تبدیل تاریخ شروع و پایان ماه شمسی به میلادی
            const startOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').startOf('jMonth').toDate();
            const endOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').endOf('jMonth').toDate();
    
            // پیدا کردن پروژه‌هایی که مکانیک در آن‌ها مشارکت داشته و دستمزدش محاسبه نشده
            const projects = await ProjectsModel.find({
                mechanicsTeam: mongoose.Types.ObjectId(mechanicId),
                'mechanicsCalculatedSalaries.mechanicId': { $ne: mongoose.Types.ObjectId(mechanicId) }, // پروژه‌هایی که برای این مکانیک محاسبه نشده‌اند
                createdAt: { $gte: startOfMonth, $lte: endOfMonth } // پروژه‌هایی که در ماه انتخابی ایجاد شده‌اند
            });
    
            // محاسبه 20 درصد از مبلغ هر پروژه و جمع زدن آن
            const totalSalary = projects
                .map(project => parseFloat(project.price) * 0.2) // محاسبه 20 درصد
                .reduce((acc, salary) => acc + salary, 0); // جمع زدن تمام دستمزدها
    
            // به‌روزرسانی وضعیت محاسبه دستمزد برای این مکانیک در پروژه‌های محاسبه‌شده
            for (const project of projects) {
                await ProjectsModel.updateOne(
                    { _id: project._id },
                    { $push: { calculatedSalaries: { mechanicId, isCalculated: true } } }
                );
            }
    
            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data:{
                mechanicId,
                totalSalary: totalSalary.toFixed(2), // مقدار نهایی به صورت یک عدد با دو رقم اعشار
                year,
                month}
            });
        } catch (error) {
            next(error)
        }
    } 
    //نحوه استفاده
// در این رویکرد، صاحب گاراژ می‌تواند با ارسال پارامترهای year و month
//  از طریق کوئری استرینگ، ماه شمسی مورد نظر خود را برای محاسبه دستمزد مکانیک‌ها انتخاب کند
//  به‌عنوان مثال، اگر بخواهد دستمزد مکانیک‌ها برای ماه اردیبهشت 1403 محاسبه شود، می‌تواند چنین درخواستی ارسال کند:
// GET /mechanics/:mechanicId/salary?year=1403&month=2

    async apprenticeMonthlyPercentageCheckOut(req, res, next){
        try {
            const shagerdID = req.params.shagerdID;
            const { year, month } = req.query;
    
            // تبدیل تاریخ شروع و پایان ماه شمسی به میلادی
            const startOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').startOf('jMonth').toDate();
            const endOfMonth = moment(`${year}-${month}-01`, 'jYYYY-jMM-jDD').endOf('jMonth').toDate();
    
            // پیدا کردن پروژه‌هایی که مکانیک در آن‌ها مشارکت داشته و دستمزدش محاسبه نشده
            const projects = await ProjectsModel.find({
                shagerdsTeam: mongoose.Types.ObjectId(shagerdID),
                'shagerdsCalculatedSalaries.shagerdID': { $ne: mongoose.Types.ObjectId(shagerdID) }, // پروژه‌هایی که برای این مکانیک محاسبه نشده‌اند
                createdAt: { $gte: startOfMonth, $lte: endOfMonth } // پروژه‌هایی که در ماه انتخابی ایجاد شده‌اند
            });
    
            // محاسبه 5 درصد از مبلغ هر پروژه و جمع زدن آن
            const totalSalary = projects
                .map(project => parseFloat(project.price) * 0.05) // محاسبه 5 درصد
                .reduce((acc, salary) => acc + salary, 0); // جمع زدن تمام دستمزدها
    
            // به‌روزرسانی وضعیت محاسبه دستمزد برای این مکانیک در پروژه‌های محاسبه‌شده
            for (const project of projects) {
                await ProjectsModel.updateOne(
                    { _id: project._id },
                    { $push: { calculatedSalaries: { shagerdID, isCalculated: true } } }
                );
            }
    
            return res.status(HttpStatus.OK).json({
                statusCode : HttpStatus.OK,
                data:{
                shagerdID,
                totalSalary: totalSalary.toFixed(2), // مقدار نهایی به صورت یک عدد با دو رقم اعشار
                year,
                month}
            });
        } catch (error) {
            next(error)
        }
    }    
    //نحوه استفاده
    // در این رویکرد، صاحب گاراژ می‌تواند با ارسال پارامترهای year و month
    //  از طریق کوئری استرینگ، ماه شمسی مورد نظر خود را برای محاسبه دستمزد مکانیک‌ها انتخاب کند
    //  به‌عنوان مثال، اگر بخواهد دستمزد مکانیک‌ها برای ماه اردیبهشت 1403 محاسبه شود، می‌تواند چنین درخواستی ارسال کند:
    // GET /mechanics/:mechanicId/salary?year=1403&month=2


}

module.exports = {
    GarageManagementController: new GarageManagementController()
};




/*
برای پیاده‌سازی قابلیت نمایش فعالیت‌های روزانه گاراژها 
(مشابه نمودار فعالیت GitHub)، باید تغییراتی در
 مدل‌های موجود ایجاد کنیم و یک مدل جدید اضافه کنیم.
این تغییرات به شما امکان می‌دهد:

ثبت فعالیت‌های روزانه: هر نوع فعالیت گاراژ بصورت روزانه ثبت می‌شود.
سطوح فعالیت: مشابه GitHub، فعالیت‌ها در 5 سطح مختلف دسته‌بندی می‌شوند:

NONE: بدون فعالیت
LOW: فعالیت کم
MEDIUM: فعالیت متوسط
HIGH: فعالیت زیاد
VERY_HIGH: فعالیت خیلی زیاد


آمار فعالیت:

تعداد روزهای فعال
رکورد فعالیت متوالی فعلی
طولانی‌ترین رکورد فعالیت متوالی



برای پیاده‌سازی کامل این سیستم، باید:

تابعی بنویسید که هر فعالیت جدید را در GarageActivityLog ثبت کند
تابعی برای محاسبه سطح فعالیت روزانه بر اساس مجموع فعالیت‌ها
تابعی برای به‌روزرسانی آمار streak ها در مدل Garage

*/