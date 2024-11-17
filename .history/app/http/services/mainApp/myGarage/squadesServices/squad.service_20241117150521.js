const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ClanService {
    // Validation Helpers
    async validateUserClanRole(userId, clanId, requiredRoles) {
        const membership = await prisma.clanMembership.findUnique({
            where: { 
                clanId_userId: {
                    clanId,
                    userId
                }
            }
        });

        if (!membership || !requiredRoles.includes(membership.role)) {
            throw createError(HttpStatus.FORBIDDEN, "شما دسترسی لازم برای این عملیات را ندارید");
        }

        return membership;
    }

    async validateSupplierTier(userId, requiredTier) {
        const supplier = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                memberships: {
                    where: { supplierTier: { not: null } }
                }
            }
        });

        if (!supplier || !supplier.memberships.some(m => m.supplierTier >= requiredTier)) {
            throw createError(HttpStatus.FORBIDDEN, "سطح تامین‌کننده برای این عملیات کافی نیست");
        }
    }

    // Clan Management
    async createClan(userId, data) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { ownedClan: true }
        });

        if (user.ownedClan) {
            throw createError(HttpStatus.CONFLICT, "شما قبلاً یک کلن ایجاد کرده‌اید");
        }

        return await prisma.clan.create({
            data: {
                ...data,
                owner: { connect: { id: userId } },
                members: {
                    create: {
                        userId,
                        role: 'OWNER'
                    }
                }
            },
            include: {
                owner: true,
                members: true
            }
        });
    }

    async updateClan(userId, clanId, data) {
        await this.validateUserClanRole(userId, clanId, ['OWNER', 'COLEADER']);

        return await prisma.clan.update({
            where: { id: clanId },
            data,
            include: {
                owner: true,
                members: {
                    include: { user: true }
                }
            }
        });
    }

    // Membership Management
    async inviteMember(userId, clanId, targetUserId, message) {
        await this.validateUserClanRole(userId, clanId, ['OWNER', 'COLEADER', 'ELDER']);

        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });

        if (clan.members.length >= clan.maxMembers) {
            throw createError(HttpStatus.CONFLICT, "ظرفیت کلن تکمیل است");
        }

        return await prisma.clanInvite.create({
            data: {
                clanId,
                fromUserId: userId,
                toUserId: targetUserId,
                status: 'PENDING',
                message
            }
        });
    }

    async handleInviteResponse(userId, inviteId, accept) {
        const invite = await prisma.clanInvite.findUnique({
            where: { id: inviteId },
            include: { clan: true }
        });

        if (!invite || invite.toUserId !== userId) {
            throw createError(HttpStatus.NOT_FOUND, "دعوت‌نامه معتبر نیست");
        }

        if (accept) {
            await prisma.$transaction([
                prisma.clanMembership.create({
                    data: {
                        clanId: invite.clanId,
                        userId,
                        role: 'MEMBER'
                    }
                }),
                prisma.clanActivity.create({
                    data: {
                        clanId: invite.clanId,
                        userId,
                        activityType: 'MEMBER_JOIN',
                        description: 'عضو جدید به کلن پیوست',
                        points: 10
                    }
                }),
                prisma.clanInvite.update({
                    where: { id: inviteId },
                    data: { status: 'ACCEPTED' }
                })
            ]);
        } else {
            await prisma.clanInvite.update({
                where: { id: inviteId },
                data: { status: 'REJECTED' }
            });
        }
    }

    // Communication
    async createCommunication(userId, clanId, data) {
        const membership = await prisma.clanMembership.findUnique({
            where: { 
                clanId_userId: {
                    clanId,
                    userId
                }
            }
        });

        if (!membership) {
            throw createError(HttpStatus.FORBIDDEN, "شما عضو این کلن نیستید");
        }

        // Handle specific communication types
        if (data.type === 'DEAL_OFFER') {
            await this.validateSupplierTier(userId, 'SILVER');
        }

        return await prisma.clanCommunication.create({
            data: {
                ...data,
                clanId,
                senderId: membership.id
            },
            include: {
                sender: {
                    include: { user: true }
                }
            }
        });
    }

    async addCommunicationReaction(userId, communicationId, reaction) {
        return await prisma.clanCommunicationReaction.create({
            data: {
                communicationId,
                userId,
                reaction
            }
        });
    }

    // Rewards & Rankings
    async calculateClanRanking(clanId) {
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: {
                members: true,
                activities: {
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }
            }
        });

        const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

        const rankingData = {
            transactionVolume: clan.totalTransactions,
            memberActivity: clan.activities.reduce((sum, act) => sum + act.points, 0),
            supplierRating: clan.members
                .filter(m => m.supplierTier)
                .reduce((avg, m) => avg + m.qualityRating, 0) / 
                clan.members.filter(m => m.supplierTier).length || 0
        };

        const score = (
            rankingData.transactionVolume * 0.4 +
            rankingData.memberActivity * 0.3 +
            rankingData.supplierRating * 0.3
        );

        return await prisma.clanRanking.create({
            data: {
                clanId,
                season: Math.floor(weekNumber / 13),
                weekNumber,
                score,
                ...rankingData
            }
        });
    }

    async distributeRewards(clanId) {
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: {
                members: {
                    include: {
                        activities: {
                            where: {
                                createdAt: {
                                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                }
                            }
                        }
                    }
                }
            }
        });

        const rewards = [];
        for (const member of clan.members) {
            const activityPoints = member.activities.reduce((sum, act) => sum + act.points, 0);
            
            if (activityPoints > 100) {
                rewards.push(
                    prisma.clanReward.create({
                        data: {
                            clanId,
                            memberId: member.id,
                            type: 'ACTIVITY_POINTS',
                            amount: Math.floor(activityPoints / 100),
                            description: 'پاداش فعالیت هفتگی'
                        }
                    })
                );
            }
        }

        await prisma.$transaction(rewards);
    }

    // Queries
    async getClanDetails(clanId) {
        return await prisma.clan.findUnique({
            where: { id: clanId },
            include: {
                owner: true,
                members: {
                    include: { user: true }
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                rankings: {
                    orderBy: { calculatedAt: 'desc' },
                    take: 1
                }
            }
        });
    }

    async searchClans(query, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        
        return await prisma.clan.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { description: { contains: query } }
                ]
            },
            include: {
                _count: {
                    select: { members: true }
                },
                rankings: {
                    orderBy: { calculatedAt: 'desc' },
                    take: 1
                }
            },
            skip,
            take: limit,
            orderBy: { rankingScore: 'desc' }
        });
    }

    async updateSupplierProfile(userId, clanId, data) {
        const membership = await prisma.clanMembership.findUnique({
            where: { 
                clanId_userId: {
                    clanId,
                    userId
                }
            }
        });
    
        if (!membership || membership.supplierTier === null) {
            throw createError(HttpStatus.FORBIDDEN, "این عملیات فقط برای تامین‌کنندگان مجاز است");
        }
    
        return await prisma.clanMembership.update({
            where: { id: membership.id },
            data: {
                dealSuccessRate: data.dealSuccessRate,
                responseRate: data.responseRate,
                qualityRating: data.qualityRating
            }
        });
    }
    
    async updateSupplierTier(userId, clanId, targetUserId, newTier) {
        await this.validateUserClanRole(userId, clanId, ['OWNER', 'COLEADER']);
    
        const targetMembership = await prisma.clanMembership.findUnique({
            where: { 
                clanId_userId: {
                    clanId,
                    targetUserId
                }
            }
        });
    
        if (!targetMembership.supplierTier) {
            throw createError(HttpStatus.BAD_REQUEST, "کاربر مورد نظر تامین‌کننده نیست");
        }
    
        return await prisma.clanMembership.update({
            where: { id: targetMembership.id },
            data: { supplierTier: newTier }
        });
    }
    
    // Additional methods for clan activity tracking
    async trackTransaction(clanId, userId, transactionData) {
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });
    
        await prisma.$transaction([
            // Update clan metrics
            prisma.clan.update({
                where: { id: clanId },
                data: {
                    totalTransactions: { increment: 1 },
                    successfulDeals: transactionData.success ? { increment: 1 } : undefined,
                    rankingScore: { increment: transactionData.amount * 0.01 }
                }
            }),
            
            // Update member metrics
            prisma.clanMembership.update({
                where: {
                    clanId_userId: {
                        clanId,
                        userId
                    }
                },
                data: {
                    transactionCount: { increment: 1 },
                    contributionScore: { increment: transactionData.amount * 0.02 }
                }
            }),
    
            // Create activity record
            prisma.clanActivity.create({
                data: {
                    clanId,
                    userId,
                    activityType: 'TRANSACTION',
                    description: `معامله جدید به ارزش ${transactionData.amount}`,
                    points: Math.floor(transactionData.amount * 0.05),
                    metadata: transactionData
                }
            })
        ]);
    }
    
    // Additional methods for clan analytics
    async getClanAnalytics(clanId, period = 'week') {
        const startDate = new Date();
        switch(period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
        }
    
        const [
            transactions,
            activities,
            membershipStats,
            supplierStats
        ] = await Promise.all([
            // Transaction analytics
            prisma.clanActivity.groupBy({
                by: ['activityType'],
                where: {
                    clanId,
                    activityType: 'TRANSACTION',
                    createdAt: { gte: startDate }
                },
                _sum: {
                    points: true
                },
                _count: true
            }),
    
            // Activity analytics
            prisma.clanActivity.groupBy({
                by: ['activityType'],
                where: {
                    clanId,
                    createdAt: { gte: startDate }
                },
                _count: true,
                _sum: {
                    points: true
                }
            }),
    
            // Membership analytics
            prisma.clanMembership.aggregate({
                where: { clanId },
                _count: true,
                _avg: {
                    contributionScore: true,
                    transactionCount: true,
                    reputationPoints: true
                }
            }),
    
            // Supplier analytics
            prisma.clanMembership.aggregate({
                where: {
                    clanId,
                    supplierTier: { not: null }
                },
                _count: true,
                _avg: {
                    dealSuccessRate: true,
                    responseRate: true,
                    qualityRating: true
                }
            })
        ]);
    
        return {
            transactions,
            activities,
            membershipStats,
            supplierStats,
            period
        };
    }
    
    // Additional methods for clan communication features
    async createPoll(userId, clanId, pollData) {
        await this.validateUserClanRole(userId, clanId, ['OWNER', 'COLEADER', 'ELDER']);
    
        return await prisma.clanCommunication.create({
            data: {
                clanId,
                senderId: userId,
                type: 'POLL',
                title: pollData.title,
                content: pollData.description,
                metadata: {
                    options: pollData.options,
                    endDate: pollData.endDate,
                    allowMultiple: pollData.allowMultiple
                }
            }
        });
    }
    
    async votePoll(userId, communicationId, optionIndexes) {
        const poll = await prisma.clanCommunication.findUnique({
            where: { id: communicationId }
        });
    
        if (!poll || poll.type !== 'POLL') {
            throw createError(HttpStatus.NOT_FOUND, "نظرسنجی یافت نشد");
        }
    
        if (new Date() > new Date(poll.metadata.endDate)) {
            throw createError(HttpStatus.BAD_REQUEST, "نظرسنجی به پایان رسیده است");
        }
    
        // Create or update vote
        return await prisma.clanCommunicationReaction.create({
            data: {
                communicationId,
                userId,
                reaction: JSON.stringify(optionIndexes)
            }
        });
    }
    
    // Additional methods for clan rewards and achievements
    async checkAndAwardAchievements(clanId) {
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: {
                members: {
                    include: {
                        activities: true
                    }
                },
                rankings: {
                    orderBy: { calculatedAt: 'desc' },
                    take: 10
                }
            }
        });
    
        const achievements = [];
    
        // Check for clan-wide achievements
        if (clan.totalTransactions >= 1000) {
            achievements.push({
                type: 'MILESTONE',
                title: 'معاملات طلایی',
                description: '۱۰۰۰ معامله موفق'
            });
        }
    
        // Check for ranking achievements
        const consistentTopRank = clan.rankings.every(r => r.rank <= 10);
        if (consistentTopRank && clan.rankings.length >= 10) {
            achievements.push({
                type: 'RANKING',
                title: 'نخبه پایدار',
                description: '۱۰ هفته متوالی در بین ۱۰ کلن برتر'
            });
        }
    
        // Create achievement records and rewards
        for (const achievement of achievements) {
            await prisma.$transaction([
                prisma.clanActivity.create({
                    data: {
                        clanId,
                        userId: clan.ownerId,
                        activityType: 'ACHIEVEMENT',
                        description: `دستاورد جدید: ${achievement.title}`,
                        points: 100,
                        metadata: achievement
                    }
                }),
                prisma.clanReward.create({
                    data: {
                        clanId,
                        memberId: clan.ownerId,
                        type: 'ACHIEVEMENT',
                        amount: 1000,
                        description: `پاداش دستاورد: ${achievement.title}`
                    }
                })
            ]);
        }
    
        return achievements;
    }
    
    // Additional methods for supplier management
    async generateSupplierReport(clanId, supplierId, period = 'month') {
        const startDate = new Date();
        if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === 'quarter') {
            startDate.setMonth(startDate.getMonth() - 3);
        }
    
        const [
            supplierActivities,
            transactionStats,
            ratings,
            responseMetrics
        ] = await Promise.all([
            prisma.clanActivity.findMany({
                where: {
                    clanId,
                    userId: supplierId,
                    createdAt: { gte: startDate }
                },
                orderBy: { createdAt: 'desc' }
            }),
            
            prisma.clanActivity.aggregate({
                where: {
                    clanId,
                    userId: supplierId,
                    activityType: 'TRANSACTION',
                    createdAt: { gte: startDate }
                },
                _count: true,
                _sum: {
                    points: true
                }
            }),
    
            prisma.clanMembership.findUnique({
                where: {
                    clanId_userId: {
                        clanId,
                        userId: supplierId
                    }
                },
                select: {
                    qualityRating: true,
                    dealSuccessRate: true,
                    responseRate: true
                }
            }),
    
            // Calculate response time metrics
            prisma.clanCommunication.aggregate({
                where: {
                    clanId,
                    sender: {
                        userId: supplierId
                    },
                    type: 'DEAL_OFFER',
                    createdAt: { gte: startDate }
                },
                _avg: {
                    responseTime: true
                },
                _count: true
            })
        ]);
    
        return {
            period,
            activities: supplierActivities,
            transactions: transactionStats,
            performance: {
                qualityRating: ratings.qualityRating,
                successRate: ratings.dealSuccessRate,
                responseRate: ratings.responseRate,
                averageResponseTime: responseMetrics._avg.responseTime
            },
            recommendedActions: this.generateSupplierRecommendations(ratings)
        };
    }
    
    // Helper method for supplier recommendations
    generateSupplierRecommendations(ratings) {
        const recommendations = [];
    
        if (ratings.qualityRating < 4.0) {
            recommendations.push({
                area: 'quality',
                description: 'بهبود کیفیت محصولات و خدمات',
                suggestions: [
                    'بررسی بازخوردهای منفی مشتریان',
                    'استانداردسازی فرآیندهای کنترل کیفیت',
                    'آموزش پرسنل'
                ]
            });
        }
    
        if (ratings.responseRate < 0.8) {
            recommendations.push({
                area: 'response',
                description: 'افزایش نرخ پاسخ‌گویی',
                suggestions: [
                    'تنظیم اعلان‌های درخواست',
                    'بهبود فرآیند مدیریت درخواست‌ها',
                    'افزایش ساعات پاسخ‌گویی'
                ]
            });
        }
    
        return recommendations;
    }

        // Additional methods for clan engagement and gamification
    async createClanChallenge(userId, clanId, challengeData) {
        await this.validateUserClanRole(userId, clanId, ['OWNER', 'COLEADER']);

        return await prisma.clanCommunication.create({
            data: {
                clanId,
                senderId: userId,
                type: 'CHALLENGE',
                title: challengeData.title,
                content: challengeData.description,
                metadata: {
                    type: challengeData.type,
                    goal: challengeData.goal,
                    reward: challengeData.reward,
                    startDate: challengeData.startDate,
                    endDate: challengeData.endDate,
                    participantCount: 0,
                    completedCount: 0
                }
            }
        });
    }

    async participateInChallenge(userId, communicationId) {
        const challenge = await prisma.clanCommunication.findFirst({
            where: {
                id: communicationId,
                type: 'CHALLENGE'
            }
        });

        if (!challenge || new Date() > new Date(challenge.metadata.endDate)) {
            throw createError(HttpStatus.BAD_REQUEST, "چالش معتبر نیست یا به پایان رسیده است");
        }

        await prisma.clanCommunicationReaction.create({
            data: {
                communicationId,
                userId,
                reaction: 'PARTICIPATING'
            }
        });

        await prisma.clanCommunication.update({
            where: { id: communicationId },
            data: {
                metadata: {
                    ...challenge.metadata,
                    participantCount: challenge.metadata.participantCount + 1
                }
            }
        });
    }

    // Methods for supplier collaboration and deals
    async createCollaborativeOffer(userId, clanId, offerData) {
        await this.validateSupplierTier(userId, 'SILVER');
        
        const suppliers = await prisma.clanMembership.findMany({
            where: {
                clanId,
                supplierTier: { not: null },
                userId: { not: userId }
            }
        });

        const collaborationId = await prisma.clanCommunication.create({
            data: {
                clanId,
                senderId: userId,
                type: 'COLLABORATIVE_OFFER',
                title: offerData.title,
                content: offerData.description,
                metadata: {
                    requiredSuppliers: offerData.requiredSuppliers,
                    totalValue: offerData.totalValue,
                    deadline: offerData.deadline,
                    requirements: offerData.requirements,
                    participants: []
                }
            }
        });

        // Notify other suppliers
        for (const supplier of suppliers) {
            await prisma.clanActivity.create({
                data: {
                    clanId,
                    userId: supplier.userId,
                    activityType: 'COLLABORATION_INVITE',
                    description: `دعوت به همکاری در پروژه: ${offerData.title}`,
                    metadata: { collaborationId }
                }
            });
        }

        return collaborationId;
    }

    // Methods for clan mergers and alliances
    async proposeClanMerger(userId, sourceClanId, targetClanId, proposal) {
        await this.validateUserClanRole(userId, sourceClanId, ['OWNER']);
        
        const [sourceClan, targetClan] = await Promise.all([
            prisma.clan.findUnique({ 
                where: { id: sourceClanId },
                include: { members: true }
            }),
            prisma.clan.findUnique({
                where: { id: targetClanId },
                include: { members: true }
            })
        ]);

        // Validate merger possibility
        if (sourceClan.members.length + targetClan.members.length > targetClan.maxMembers) {
            throw createError(HttpStatus.BAD_REQUEST, "ظرفیت کلن مقصد برای ادغام کافی نیست");
        }

        return await prisma.clanCommunication.create({
            data: {
                clanId: targetClanId,
                senderId: userId,
                type: 'MERGER_PROPOSAL',
                title: 'پیشنهاد ادغام کلن',
                content: proposal.reason,
                metadata: {
                    sourceClanId,
                    targetClanId,
                    memberCount: sourceClan.members.length,
                    totalScore: sourceClan.rankingScore,
                    terms: proposal.terms
                }
            }
        });
    }

    // Methods for clan resource management
    async manageClanResources(userId, clanId, action, resourceData) {
        await this.validateUserClanRole(userId, clanId, ['OWNER', 'COLEADER']);

        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: {
                resources: true,
                members: {
                    where: { role: { in: ['OWNER', 'COLEADER'] } }
                }
            }
        });

        switch (action) {
            case 'ALLOCATE':
                await prisma.$transaction([
                    prisma.clanResource.create({
                        data: {
                            clanId,
                            type: resourceData.type,
                            amount: resourceData.amount,
                            allocation: resourceData.allocation
                        }
                    }),
                    prisma.clanActivity.create({
                        data: {
                            clanId,
                            userId,
                            activityType: 'RESOURCE_ALLOCATION',
                            description: `تخصیص منابع جدید: ${resourceData.type}`,
                            points: 10
                        }
                    })
                ]);
                break;

            case 'DISTRIBUTE':
                // Implementation for resource distribution
                break;
        }
    }

    // Methods for supplier quality management
    async evaluateSupplierPerformance(clanId, supplierId, evaluationData) {
        const membership = await prisma.clanMembership.findUnique({
            where: {
                clanId_userId: {
                    clanId,
                    userId: supplierId
                }
            }
        });

        if (!membership.supplierTier) {
            throw createError(HttpStatus.BAD_REQUEST, "کاربر مورد نظر تامین‌کننده نیست");
        }

        const updatedMembership = await prisma.clanMembership.update({
            where: { id: membership.id },
            data: {
                qualityRating: evaluationData.quality,
                dealSuccessRate: evaluationData.successRate,
                responseRate: evaluationData.responseRate
            }
        });

        // Check for tier promotion/demotion
        const totalScore = (
            evaluationData.quality * 0.4 +
            evaluationData.successRate * 0.3 +
            evaluationData.responseRate * 0.3
        );

        let newTier = membership.supplierTier;
        if (totalScore >= 4.5 && membership.supplierTier !== 'PLATINUM') {
            newTier = this.getNextSupplierTier(membership.supplierTier);
        } else if (totalScore < 3.0 && membership.supplierTier !== 'BRONZE') {
            newTier = this.getPreviousSupplierTier(membership.supplierTier);
        }

        if (newTier !== membership.supplierTier) {
            await prisma.clanMembership.update({
                where: { id: membership.id },
                data: { supplierTier: newTier }
            });

            await prisma.clanActivity.create({
                data: {
                    clanId,
                    userId: supplierId,
                    activityType: 'SUPPLIER_TIER_CHANGE',
                    description: `تغییر سطح تامین‌کننده به ${newTier}`,
                    points: 50
                }
            });
        }

        return { updatedMembership, newTier };
    }

    // Helper methods
    getNextSupplierTier(currentTier) {
        const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
        const currentIndex = tiers.indexOf(currentTier);
        return tiers[Math.min(currentIndex + 1, tiers.length - 1)];
    }

    getPreviousSupplierTier(currentTier) {
        const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
        const currentIndex = tiers.indexOf(currentTier);
        return tiers[Math.max(currentIndex - 1, 0)];
    }
 }

module.exports = new ClanService();