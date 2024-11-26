const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../../controller");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CourseController extends Controller {
    // Private helper methods
    async #validateGarageOwnership(user) {
        const garageId = user?.ownedGarage?.id;
        if (!garageId) {
            throw createError(HttpStatus.UNAUTHORIZED, "این عملیات فقط برای صاحبین گاراژ مجاز است");
        }
        return garageId;
    }

    async #validateCourseOwnership(courseId, garageId) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            throw createError(HttpStatus.NOT_FOUND, "دوره مورد نظر یافت نشد");
        }

        if (course.garageId !== garageId) {
            throw createError(HttpStatus.FORBIDDEN, "شما مجاز به انجام این عملیات نیستید");
        }

        return course;
    }

    // Course Management Methods
    async createCourse(req) {
        const garageId = await this.#validateGarageOwnership(req.user);
        
        const {
            title,
            description,
            startDate,
            capacity,
            price,
            location,
            prerequisites
        } = req.body;

        // Validate required fields
        if (!title || !startDate || !capacity || !price || !location) {
            throw createError(HttpStatus.BAD_REQUEST, "لطفا تمامی فیلدهای ضروری را تکمیل کنید");
        }

        const course = await prisma.course.create({
            data: {
                garageId,
                title,
                description,
                startDate: new Date(startDate),
                capacity: parseInt(capacity),
                price: parseFloat(price),
                location,
                prerequisites,
                registeredCount: 0,
                status: 'UPCOMING'
            }
        });

        return this.success(course);
    }

    async updateCourse(req) {
        const garageId = await this.#validateGarageOwnership(req.user);
        const { courseId } = req.params;
        
        await this.#validateCourseOwnership(courseId, garageId);

        const {
            title,
            description,
            startDate,
            capacity,
            price,
            location,
            prerequisites,
            status
        } = req.body;

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                title,
                description,
                startDate: startDate ? new Date(startDate) : undefined,
                capacity: capacity ? parseInt(capacity) : undefined,
                price: price ? parseFloat(price) : undefined,
                location,
                prerequisites,
                status
            }
        });

        return this.success(updatedCourse);
    }

    async deleteCourse(req) {
        const garageId = await this.#validateGarageOwnership(req.user);
        const { courseId } = req.params;
        
        await this.#validateCourseOwnership(courseId, garageId);

        // Check if there are any registrations
        const registrationsCount = await prisma.courseRegistration.count({
            where: { courseId }
        });

        if (registrationsCount > 0) {
            throw createError(
                HttpStatus.BAD_REQUEST,
                "دوره دارای ثبت نام کننده است و امکان حذف وجود ندارد"
            );
        }

        await prisma.course.delete({
            where: { id: courseId }
        });

        return this.success({ message: "دوره با موفقیت حذف شد" });
    }

    async registerForCourse(req) {
        const { courseId } = req.params;
        const userId = req.user.id;

        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course) {
            throw createError(HttpStatus.NOT_FOUND, "دوره مورد نظر یافت نشد");
        }

        if (course.registeredCount >= course.capacity) {
            throw createError(HttpStatus.BAD_REQUEST, "ظرفیت دوره تکمیل شده است");
        }

        // Check if user is already registered
        const existingRegistration = await prisma.courseRegistration.findFirst({
            where: {
                courseId,
                userId
            }
        });

        if (existingRegistration) {
            throw createError(HttpStatus.BAD_REQUEST, "شما قبلا در این دوره ثبت نام کرده‌اید");
        }

        // Calculate platform fee (e.g., 10%)
        const platformFeePercentage = 0.10;
        const platformFee = course.price * platformFeePercentage;

        // Create registration with transaction
        const registration = await prisma.$transaction(async (prisma) => {
            const registration = await prisma.courseRegistration.create({
                data: {
                    courseId,
                    userId,
                    registrationFee: course.price,
                    platformFee
                }
            });

            await prisma.course.update({
                where: { id: courseId },
                data: {
                    registeredCount: {
                        increment: 1
                    }
                }
            });

            return registration;
        });

        return this.success(registration);
    }

    async getCourseDetails(req) {
        const { courseId } = req.params;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                garage: {
                    select: {
                        garage_name: true,
                        address: true,
                        telephone: true
                    }
                },
                registrations: {
                    select: {
                        id: true,
                        createdAt: true,
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!course) {
            throw createError(HttpStatus.NOT_FOUND, "دوره مورد نظر یافت نشد");
        }

        return this.success(course);
    }

    async listGarageCourses(req) {
        const garageId = await this.#validateGarageOwnership(req.user);
        
        const courses = await prisma.course.findMany({
            where: { garageId },
            orderBy: { startDate: 'desc' },
            include: {
                _count: {
                    select: { registrations: true }
                }
            }
        });

        return this.success(courses);
    }

    async listAvailableCourses(req) {
        const { city, minPrice, maxPrice, startDate } = req.query;

        const filters = {
            status: 'UPCOMING',
            registeredCount: {
                lt: prisma.course.fields.capacity
            }
        };

        if (city) filters.garage = { city };
        if (minPrice) filters.price = { gte: parseFloat(minPrice) };
        if (maxPrice) filters.price = { ...filters.price, lte: parseFloat(maxPrice) };
        if (startDate) filters.startDate = { gte: new Date(startDate) };

        const courses = await prisma.course.findMany({
            where: filters,
            include: {
                garage: {
                    select: {
                        garage_name: true,
                        city: true
                    }
                }
            },
            orderBy: { startDate: 'asc' }
        });

        return this.success(courses);
    }

    async updateCourseStatus(req) {
        const garageId = await this.#validateGarageOwnership(req.user);
        const { courseId } = req.params;
        const { status } = req.body;
        
        await this.#validateCourseOwnership(courseId, garageId);

        if (!['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(status)) {
            throw createError(HttpStatus.BAD_REQUEST, "وضعیت دوره نامعتبر است");
        }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: { status }
        });

        return this.success(updatedCourse);
    }

    async getCourseRegistrationStats(req) {
        const garageId = await this.#validateGarageOwnership(req.user);
        const { courseId } = req.params;
        
        await this.#validateCourseOwnership(courseId, garageId);

        const stats = await prisma.courseRegistration.aggregate({
            where: { courseId },
            _sum: {
                registrationFee: true,
                platformFee: true
            },
            _count: true
        });

        const totalRevenue = stats._sum.registrationFee || 0;
        const totalPlatformFees = stats._sum.platformFee || 0;
        const netRevenue = totalRevenue - totalPlatformFees;

        return this.success({
            totalRegistrations: stats._count,
            totalRevenue,
            totalPlatformFees,
            netRevenue
        });
    }

    async getUserCourseHistory(req) {
        const userId = req.user.id;

        const registrations = await prisma.courseRegistration.findMany({
            where: { userId },
            include: {
                course: {
                    include: {
                        garage: {
                            select: {
                                garage_name: true,
                                city: true,
                                telephone: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return this.success(registrations);
    }

    async getGarageCoursesRevenue(req) {
        const garageId = await this.#validateGarageOwnership(req.user);
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        const courses = await prisma.course.findMany({
            where: {
                garageId,
                ...(startDate || endDate ? { startDate: dateFilter } : {})
            },
            include: {
                registrations: {
                    select: {
                        registrationFee: true,
                        platformFee: true,
                        createdAt: true
                    }
                }
            }
        });

        const revenueStats = courses.map(course => ({
            courseId: course.id,
            title: course.title,
            startDate: course.startDate,
            totalRegistrations: course.registrations.length,
            totalRevenue: course.registrations.reduce((sum, reg) => sum + reg.registrationFee, 0),
            totalPlatformFees: course.registrations.reduce((sum, reg) => sum + reg.platformFee, 0),
            netRevenue: course.registrations.reduce((sum, reg) => 
                sum + (reg.registrationFee - reg.platformFee), 0)
        }));

        const summary = {
            totalCourses: courses.length,
            totalRegistrations: revenueStats.reduce((sum, stat) => sum + stat.totalRegistrations, 0),
            totalRevenue: revenueStats.reduce((sum, stat) => sum + stat.totalRevenue, 0),
            totalPlatformFees: revenueStats.reduce((sum, stat) => sum + stat.totalPlatformFees, 0),
            netRevenue: revenueStats.reduce((sum, stat) => sum + stat.netRevenue, 0)
        };

        return this.success({
            courseStats: revenueStats,
            summary
        });
    }

    async searchCourses(req) {
        const {
            keyword,
            city,
            minPrice,
            maxPrice,
            startDateFrom,
            startDateTo,
            status
        } = req.query;

        const filters = {};

        if (keyword) {
            filters.OR = [
                { title: { contains: keyword, mode: 'insensitive' } },
                { description: { contains: keyword, mode: 'insensitive' } }
            ];
        }

        if (city) filters.garage = { city };
        if (minPrice) filters.price = { gte: parseFloat(minPrice) };
        if (maxPrice) filters.price = { ...filters.price, lte: parseFloat(maxPrice) };
        if (startDateFrom || startDateTo) {
            filters.startDate = {};
            if (startDateFrom) filters.startDate.gte = new Date(startDateFrom);
            if (startDateTo) filters.startDate.lte = new Date(startDateTo);
        }
        if (status) filters.status = status;

        const courses = await prisma.course.findMany({
            where: filters,
            include: {
                garage: {
                    select: {
                        garage_name: true,
                        city: true,
                        telephone: true
                    }
                },
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: [
                { startDate: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        return this.success(courses);
    }

    async getPopularCourses(req) {
        const { limit = 10 } = req.query;

        const courses = await prisma.course.findMany({
            where: {
                status: {
                    in: ['UPCOMING', 'ONGOING']
                }
            },
            include: {
                garage: {
                    select: {
                        garage_name: true,
                        city: true
                    }
                },
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: [
                { registeredCount: 'desc' },
                { startDate: 'asc' }
            ],
            take: parseInt(limit)
        });

        return this.success(courses);
    }

}

module.exports = {
    CourseController: new CourseController()
};