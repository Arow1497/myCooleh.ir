const express = require('express');
const router = express.Router();
const { ApprenticeshipNoticeController } = require('../../http/controllers/mainApp/dastyar/agahiDastyar.controller');

// Create a new notice
router.post('/create', ApprenticeshipNoticeController.createNewNoticeDastyar);

// Get all notices
router.get('/', ApprenticeshipNoticeController.getAllNoticeDastyar);

// Get a notice by ID
router.get('/:noticeDastyarId', ApprenticeshipNoticeController.getOneNoticeDastyarById);

// Remove a notice by ID
router.delete('/:noticeDastyarId', ApprenticeshipNoticeController.removeNoticeDastyarById);

// Edit a notice by ID
router.put('/:noticeDastyarId', ApprenticeshipNoticeController.editNoticeDastyarsById);

// Toggle bookmark for a notice
router.post('/:noticeDastyarId/bookmark', ApprenticeshipNoticeController.toggleBookmark);

// Get all garage notices
router.get('/garage', ApprenticeshipNoticeController.getAllGarageNoticeDastyars);

// Get all notices to itself
router.get('/to-itself', ApprenticeshipNoticeController.getAllNoticeDastyarsToItself);

// Get all active apprentice notices for an apprentice
router.get('/apprentice/active', ApprenticeshipNoticeController.getApprenticeAllActiveApprenticeNoticeApps);

// Get all active apprentice notices for a garage
router.get('/garage/active', ApprenticeshipNoticeController.getGarageAllActiveApprenticeNoticeApps);

// Share a notice
router.post('/:noticeDastyarId/share', ApprenticeshipNoticeController.shareNoticeDastyar);

// Add cowork request for a notice
router.post('/:noticeDastyarId/cowork/:apprenticeId', ApprenticeshipNoticeController.addCoworkReqForNoticeDastyar);

// Show cowork requests for a requester garage
router.get('/cowork/requests', ApprenticeshipNoticeController.showCoworkRequestsForRequesterGarage);

// Add apprentice to a request
router.post('/cowork/:apprenticeId/:noticeDastyarId', ApprenticeshipNoticeController.addApprenticeToRequest);

// Delete an apprentice from a notice
router.delete('/cowork/:noticeDastyarId/:apprenticeId', ApprenticeshipNoticeController.deleteThisApprenticeFromNoticeDastyar);

// Apprentice refusing from a notice
router.post('/:noticeDastyarId/refuse', ApprenticeshipNoticeController.apprenticeRefusingFromThisNoticeDastyarship);

// Confirm transaction completion
router.post('/transaction/:transactionId/confirm', ApprenticeshipNoticeController.confirmTransactionCompletion);

// Create a complaint
router.post('/transaction/:transactionId/complaint', ApprenticeshipNoticeController.createComplaint);

// Remove and regret a complaint by requester
router.delete('/complaint/:complaintId', ApprenticeshipNoticeController.removeAndRegretComplaintByrequester);

// Respond to a complaint
router.post('/complaint/:complaintId/respond', ApprenticeshipNoticeController.respondToComplaint);

// Add review for a notice
router.post('/:noticeDastyarId/review', ApprenticeshipNoticeController.addReviewForNoticeDastyar);

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

module.exports = router;
