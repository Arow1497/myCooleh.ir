const express = require('express');
const router = express.Router();
const { ApprenticeshipNoticeController } = require('../../controllers/apprenticeship/apprenticeship.controller');
const { checkLogin } = require('../../middlewares/auth');
const { uploadFile } = require('../../utils/multer');

// Create and manage apprenticeship notices
router.post('/create/:projectId', checkLogin, uploadFile.array('files'), ApprenticeshipNoticeController.createNewApprenticeRequest.bind(ApprenticeshipNoticeController));
router.get('/all', ApprenticeshipNoticeController.getAllNoticeApprentice.bind(ApprenticeshipNoticeController));
router.get('/:noticeApprenticeId', ApprenticeshipNoticeController.getOneNoticeApprenticeById.bind(ApprenticeshipNoticeController));
router.delete('/:noticeApprenticeId', checkLogin, ApprenticeshipNoticeController.removeApprenticeRequestById.bind(ApprenticeshipNoticeController));
router.patch('/:noticeApprenticeId', checkLogin, uploadFile.array('files'), ApprenticeshipNoticeController.editApprenticeRequestsById.bind(ApprenticeshipNoticeController));

// Bookmarks
router.post('/bookmark/:noticeApprenticeId', checkLogin, ApprenticeshipNoticeController.toggleBookmark.bind(ApprenticeshipNoticeController));

// Garage-specific routes
router.get('/garage/requests', checkLogin, ApprenticeshipNoticeController.getGarageApprenticeRequests.bind(ApprenticeshipNoticeController));
router.get('/garage/all-requests', checkLogin, ApprenticeshipNoticeController.getAllOfGarageApprenticeRequests.bind(ApprenticeshipNoticeController));
router.get('/garage/notices', checkLogin, ApprenticeshipNoticeController.getAllGarageNoticeApprentices.bind(ApprenticeshipNoticeController));
router.get('/garage/active', checkLogin, ApprenticeshipNoticeController.getGarageAllActiveApprenticeNoticeApps.bind(ApprenticeshipNoticeController));

// Apprentice-specific routes
router.get('/apprentice/requests', checkLogin, ApprenticeshipNoticeController.getAllApprenticeNoticeAppRequests.bind(ApprenticeshipNoticeController));
router.get('/apprentice/active', checkLogin, ApprenticeshipNoticeController.getApprenticeAllActiveApprenticeNoticeApps.bind(ApprenticeshipNoticeController));
router.post('/apprentice/refuse/:noticeApprenticeId', checkLogin, ApprenticeshipNoticeController.apprenticeRefusingFromThisNoticeApprenticeship.bind(ApprenticeshipNoticeController));

// Cowork requests
router.post('/cowork/:noticeApprenticeId', checkLogin, ApprenticeshipNoticeController.addCoworkReqForNoticeApprentice.bind(ApprenticeshipNoticeController));
router.get('/cowork/requests', checkLogin, ApprenticeshipNoticeController.showCoworkRequestsForRequesterGarage.bind(ApprenticeshipNoticeController));

// Managing apprentices
router.post('/apprentice/add/:noticeApprenticeId/:apprenticeId', checkLogin, ApprenticeshipNoticeController.addApprenticeToRequest.bind(ApprenticeshipNoticeController));
router.delete('/apprentice/remove/:noticeApprenticeId/:apprenticeId', checkLogin, ApprenticeshipNoticeController.deleteThisApprenticeFromApprenticeRequest.bind(ApprenticeshipNoticeController));

// Transaction management
router.post('/transaction/:transactionId/confirm', checkLogin, ApprenticeshipNoticeController.confirmTransactionCompletion.bind(ApprenticeshipNoticeController));

// Complaints
router.post('/complaint/:transactionId', checkLogin, uploadFile.array('files'), ApprenticeshipNoticeController.createComplaint.bind(ApprenticeshipNoticeController));
router.delete('/complaint/:complaintId', checkLogin, ApprenticeshipNoticeController.removeAndRegretComplaintByrequester.bind(ApprenticeshipNoticeController));
router.post('/complaint/:complaintId/respond', checkLogin, uploadFile.array('files'), ApprenticeshipNoticeController.respondToComplaint.bind(ApprenticeshipNoticeController));

// Reviews
router.post('/review/:noticeApprenticeId', checkLogin, ApprenticeshipNoticeController.addReviewForApprenticeRequest.bind(ApprenticeshipNoticeController));

// Chat/Conversation
router.post('/conversation/:transactionId', checkLogin, ApprenticeshipNoticeController.createTransactionRoom.bind(ApprenticeshipNoticeController));
router.post('/conversation/:conversationId/message', checkLogin, uploadFile.array('files'), ApprenticeshipNoticeController.sendMessage.bind(ApprenticeshipNoticeController));
router.get('/conversation/:conversationId/messages', checkLogin, ApprenticeshipNoticeController.getMessages.bind(ApprenticeshipNoticeController));
router.get('/conversations', checkLogin, ApprenticeshipNoticeController.getUserConversations.bind(ApprenticeshipNoticeController));
router.post('/conversation/:conversationId/read', checkLogin, ApprenticeshipNoticeController.markMessagesAsRead.bind(ApprenticeshipNoticeController));
router.get('/conversation/:conversationId', checkLogin, ApprenticeshipNoticeController.getConversationDetails.bind(ApprenticeshipNoticeController));

// Share functionality
router.post('/share/:noticeApprenticeId', checkLogin, ApprenticeshipNoticeController.shareApprenticeRequest.bind(ApprenticeshipNoticeController));

module.exports = router;