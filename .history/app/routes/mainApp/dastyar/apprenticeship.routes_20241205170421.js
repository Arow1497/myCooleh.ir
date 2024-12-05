const express = require('express');
const router = express.Router();
const { ApprenticeshipNoticeController } = require('../../../http/controllers/mainApp/dastyar/agahiApprentice.controller');

// Create a new notice
router.post('/create', ApprenticeshipNoticeController.create);

// Get all notices
router.get('/', ApprenticeshipNoticeController.getAll);

// Get a notice by ID
router.get('/:noticeApprenticeId', ApprenticeshipNoticeController.getOne);

// Remove a notice by ID
router.delete('/:noticeApprenticeId', ApprenticeshipNoticeController.remove);

// Edit a notice by ID
router.put('/:noticeApprenticeId', ApprenticeshipNoticeController.edit);

// Toggle bookmark for a notice
router.post('/:noticeApprenticeId/bookmark', ApprenticeshipNoticeController.toggleBookmark);

// Get all garage notices
router.get('/garage', ApprenticeshipNoticeController.getAllGarageNoticeApprentices);

// Get all notices to itself
router.get('/to-itself', ApprenticeshipNoticeController.getAllNoticeApprenticesToItself);

// Get all active apprentice notices for an apprentice
router.get('/apprentice/active', ApprenticeshipNoticeController.getApprenticeAllActiveApprenticeNoticeApps);

// Get all active apprentice notices for a garage
router.get('/garage/active', ApprenticeshipNoticeController.getGarageAllActiveApprenticeNoticeApps);

// Share a notice
router.post('/:noticeApprenticeId/share', ApprenticeshipNoticeController.shareNoticeApprentice);

// Add cowork request for a notice
router.post('/:noticeApprenticeId/cowork/:apprenticeId', ApprenticeshipNoticeController.addCoworkReqForNoticeApprentice);

// Show cowork requests for a requester garage
router.get('/cowork/requests', ApprenticeshipNoticeController.showCoworkRequestsForRequesterGarage);

// Add apprentice to a request
router.post('/cowork/:apprenticeId/:noticeApprenticeId', ApprenticeshipNoticeController.addApprenticeToRequest);

// Delete an apprentice from a notice
router.delete('/cowork/:noticeApprenticeId/:apprenticeId', ApprenticeshipNoticeController.deleteThisApprenticeFromNoticeApprentice);

// Apprentice refusing from a notice
router.post('/:noticeApprenticeId/refuse', ApprenticeshipNoticeController.apprenticeRefusingFromThisNoticeApprenticeship);

// Confirm transaction completion
router.post('/transaction/:transactionId/confirm', ApprenticeshipNoticeController.confirmTransactionCompletion);

// Create a complaint
router.post('/transaction/:transactionId/complaint', ApprenticeshipNoticeController.createComplaint);

// Remove and regret a complaint by requester
router.delete('/complaint/:complaintId', ApprenticeshipNoticeController.removeAndRegretComplaintByrequester);

// Respond to a complaint
router.post('/complaint/:complaintId/respond', ApprenticeshipNoticeController.respondToComplaint);

// Add review for a notice
router.post('/:noticeApprenticeId/review', ApprenticeshipNoticeController.addReviewForNoticeApprentice);

// Create a transaction room
router.post('/transaction/:transactionId/room', ApprenticeshipNoticeController.createTransactionRoom);

// Send a message
router.post('/conversation/:conversationId/message', ApprenticeshipNoticeController.sendMessage);

// Get messages
router.get('/conversation/:conversationId/messages', ApprenticeshipNoticeController.getMessages);

// Get user conversations
router.get('/conversations', ApprenticeshipNoticeController.getUserConversations);

// Mark messages as read
router.post('/conversation/:conversationId/mark-read', ApprenticeshipNoticeController.markMessagesAsRead);

// Get conversation details
router.get('/conversation/:conversationId/details', ApprenticeshipNoticeController.getConversationDetails);

module.exports = {
    ApprenticeshipRoutes : router
}