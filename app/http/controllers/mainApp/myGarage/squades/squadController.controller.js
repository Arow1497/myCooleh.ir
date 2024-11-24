// createClan
//کلن ها تایپ های مختلف دارن مثل مکانیکی ها اتوسرویس ها صافکار نقاشی
// requestToJoinClan
// addMemberToClan
// roleDelegationToMember
// getAllCity_RegionClans
// supplierReqToJoinClan
// PartProvideGlobalCouponReqToClan
//تامین کننده ها درصد سود از فروش هر قطعه پیشنهاد بدن به اعضای کلن تا درصورت خواست دیل کنن
// clanConversationRoom

const { validationResult } = require('express-validator');
const { StatusCodes: HttpStatus } = require('http-status-codes');
const createError = require('http-errors');
const ClanService = require('../services/clanService');

class ClanController {
    // Clan Management
    async createClan(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw createError(HttpStatus.BAD_REQUEST, 'Invalid input data');
            }

            const clan = await ClanService.createClan(req.user.id, req.body);
            res.status(HttpStatus.CREATED).json(clan);
        } catch (error) {
            next(error);
        }
    }

    async updateClan(req, res, next) {
        try {
            const { clanId } = req.params;
            const clan = await ClanService.updateClan(req.user.id, clanId, req.body);
            res.json(clan);
        } catch (error) {
            next(error);
        }
    }

    // Membership Management
    async inviteMember(req, res, next) {
        try {
            const { clanId, targetUserId, message } = req.body;
            const invite = await ClanService.inviteMember(req.user.id, clanId, targetUserId, message);
            res.status(HttpStatus.CREATED).json(invite);
        } catch (error) {
            next(error);
        }
    }

    async handleInviteResponse(req, res, next) {
        try {
            const { inviteId } = req.params;
            const { accept } = req.body;
            await ClanService.handleInviteResponse(req.user.id, inviteId, accept);
            res.status(HttpStatus.OK).json({ message: accept ? 'Invite accepted' : 'Invite rejected' });
        } catch (error) {
            next(error);
        }
    }

    // Communication
    async createCommunication(req, res, next) {
        try {
            const { clanId } = req.params;
            const communication = await ClanService.createCommunication(req.user.id, clanId, req.body);
            res.status(HttpStatus.CREATED).json(communication);
        } catch (error) {
            next(error);
        }
    }

    async addCommunicationReaction(req, res, next) {
        try {
            const { communicationId } = req.params;
            const { reaction } = req.body;
            const result = await ClanService.addCommunicationReaction(req.user.id, communicationId, reaction);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Polls and Challenges
    async createPoll(req, res, next) {
        try {
            const { clanId } = req.params;
            const poll = await ClanService.createPoll(req.user.id, clanId, req.body);
            res.status(HttpStatus.CREATED).json(poll);
        } catch (error) {
            next(error);
        }
    }

    async votePoll(req, res, next) {
        try {
            const { communicationId } = req.params;
            const { optionIndexes } = req.body;
            const vote = await ClanService.votePoll(req.user.id, communicationId, optionIndexes);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    }

    async createClanChallenge(req, res, next) {
        try {
            const { clanId } = req.params;
            const challenge = await ClanService.createClanChallenge(req.user.id, clanId, req.body);
            res.status(HttpStatus.CREATED).json(challenge);
        } catch (error) {
            next(error);
        }
    }

    async participateInChallenge(req, res, next) {
        try {
            const { communicationId } = req.params;
            await ClanService.participateInChallenge(req.user.id, communicationId);
            res.status(HttpStatus.OK).json({ message: 'Successfully joined the challenge' });
        } catch (error) {
            next(error);
        }
    }

    // Supplier Management
    async createCollaborativeOffer(req, res, next) {
        try {
            const { clanId } = req.params;
            const offer = await ClanService.createCollaborativeOffer(req.user.id, clanId, req.body);
            res.status(HttpStatus.CREATED).json(offer);
        } catch (error) {
            next(error);
        }
    }

    async updateSupplierProfile(req, res, next) {
        try {
            const { clanId } = req.params;
            const profile = await ClanService.updateSupplierProfile(req.user.id, clanId, req.body);
            res.json(profile);
        } catch (error) {
            next(error);
        }
    }

    async evaluateSupplierPerformance(req, res, next) {
        try {
            const { clanId, supplierId } = req.params;
            const result = await ClanService.evaluateSupplierPerformance(clanId, supplierId, req.body);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Analytics and Reports
    async getClanAnalytics(req, res, next) {
        try {
            const { clanId } = req.params;
            const { period } = req.query;
            const analytics = await ClanService.getClanAnalytics(clanId, period);
            res.json(analytics);
        } catch (error) {
            next(error);
        }
    }

    async generateSupplierReport(req, res, next) {
        try {
            const { clanId, supplierId } = req.params;
            const { period } = req.query;
            const report = await ClanService.generateSupplierReport(clanId, supplierId, period);
            res.json(report);
        } catch (error) {
            next(error);
        }
    }

    // Clan Mergers
    async proposeClanMerger(req, res, next) {
        try {
            const { sourceClanId, targetClanId } = req.params;
            const proposal = await ClanService.proposeClanMerger(req.user.id, sourceClanId, targetClanId, req.body);
            res.status(HttpStatus.CREATED).json(proposal);
        } catch (error) {
            next(error);
        }
    }

    // Resource Management
    async manageClanResources(req, res, next) {
        try {
            const { clanId } = req.params;
            const { action, ...resourceData } = req.body;
            const result = await ClanService.manageClanResources(req.user.id, clanId, action, resourceData);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Queries
    async getClanDetails(req, res, next) {
        try {
            const { clanId } = req.params;
            const details = await ClanService.getClanDetails(clanId);
            res.json(details);
        } catch (error) {
            next(error);
        }
    }

    async searchClans(req, res, next) {
        try {
            const { query, page, limit } = req.query;
            const clans = await ClanService.searchClans(query, parseInt(page), parseInt(limit));
            res.json(clans);
        } catch (error) {
            next(error);
        }
    }

    // Additional Clan Challenge Handlers
    async getClanChallenges(req, res, next) {
      try {
          const { clanId } = req.params;
          const { status } = req.query;
          const challenges = await ClanService.getClanChallenges(clanId, status);
          res.json(challenges);
      } catch (error) {
          next(error);
      }
    }

    async updateChallengeProgress(req, res, next) {
        try {
            const { communicationId } = req.params;
            const { progress } = req.body;
            const result = await ClanService.updateChallengeProgress(req.user.id, communicationId, progress);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Additional Supplier Management Handlers
    async getSupplierDeals(req, res, next) {
        try {
            const { clanId, supplierId } = req.params;
            const { status, period } = req.query;
            const deals = await ClanService.getSupplierDeals(clanId, supplierId, status, period);
            res.json(deals);
        } catch (error) {
            next(error);
        }
    }

    async updateSupplierTier(req, res, next) {
        try {
            const { clanId, supplierId } = req.params;
            const { newTier } = req.body;
            const result = await ClanService.updateSupplierTier(req.user.id, clanId, supplierId, newTier);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Additional Resource Management Handler
    async getClanResourceHistory(req, res, next) {
        try {
            const { clanId } = req.params;
            const { resourceType, period } = req.query;
            const history = await ClanService.getClanResourceHistory(clanId, resourceType, period);
            res.json(history);
        } catch (error) {
            next(error);
        }
    }

    
    async createJoinRequest(req, res) {
        try {
        const { clanId, message } = req.body;
        const userId = req.user.id;  // از میدلور احراز هویت

        const request = await ClanService.createJoinRequest(
            userId,
            clanId,
            message
        );

        res.status(201).json({
            success: true,
            data: request,
        });
        } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
        }
    }

    async approveJoinRequest(req, res) {
        try {
        const { requestId } = req.params;
        const { response } = req.body;
        const { clanId } = req.params;
        const userId = req.user.id;

        // چک کردن دسترسی کاربر
        await ClanService.validateClanRole(userId, clanId, ['OWNER', 'COLEADER']);

        const request = await ClanService.approveJoinRequest(
            requestId,
            response
        );

        res.json({
            success: true,
            data: request,
        });
        } catch (error) {
        res.status(error.name === 'UnauthorizedError' ? 403 : 400).json({
            success: false,
            error: error.message,
        });
        }
    }

    async rejectJoinRequest(req, res) {
        try {
        const { requestId } = req.params;
        const { response } = req.body;
        const { clanId } = req.params;
        const userId = req.user.id;

        // چک کردن دسترسی کاربر
        await ClanService.validateClanRole(userId, clanId, ['OWNER', 'COLEADER']);

        const request = await ClanService.rejectJoinRequest(
            requestId,
            response
        );

        res.json({
            success: true,
            data: request,
        });
        } catch (error) {
        res.status(error.name === 'UnauthorizedError' ? 403 : 400).json({
            success: false,
            error: error.message,
        });
        }
    }

    async cancelJoinRequest(req, res) {
        try {
        const { requestId } = req.params;
        const userId = req.user.id;

        const request = await ClanService.cancelJoinRequest(
            requestId,
            userId
        );

        res.json({
            success: true,
            data: request,
        });
        } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
        }
    }

    async getPendingRequestsForClan(req, res) {
        try {
        const { clanId } = req.params;
        const { page, limit } = req.query;
        const userId = req.user.id;

        // چک کردن دسترسی کاربر
        await ClanService.validateClanRole(userId, clanId, ['OWNER', 'COLEADER', 'ELDER']);

        const result = await ClanService.getPendingRequestsForClan(
            clanId,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            success: true,
            data: result.requests,
            pagination: result.pagination,
        });
        } catch (error) {
        res.status(error.name === 'UnauthorizedError' ? 403 : 400).json({
            success: false,
            error: error.message,
        });
        }
    }

    async getUserJoinRequests(req, res) {
        try {
        const userId = req.user.id;
        const { status } = req.query;

        const requests = await ClanService.getUserJoinRequests(
            userId,
            status
        );

        res.json({
            success: true,
            data: requests,
        });
        } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
        }
    }
}

module.exports = new ClanController();