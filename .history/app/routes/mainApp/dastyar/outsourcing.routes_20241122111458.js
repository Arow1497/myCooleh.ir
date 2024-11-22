const express = require('express');
const router = express.Router();
const { OutSourcingNoticeController } = require('../../../http/controllers/mainApp/dastyar/agahiOutSourcing.controller');

// Create a new notice
router.post('/create', OutSourcingNoticeController.createNewNoticeOutSourcing);

// Get all notices
router.get('/', OutSourcingNoticeController.getAllNoticeOutSourcing);

// Get a notice by ID
router.get('/:noticeOutSourcingId', OutSourcingNoticeController.getOneNoticeOutSourcingById);

// Remove a notice by ID
router.delete('/:noticeOutSourcingId', OutSourcingNoticeController.removeNoticeOutSourcingById);

// Edit a notice by ID
router.put('/:noticeOutSourcingId', OutSourcingNoticeController.editNoticeOutSourcingsById);

// Toggle bookmark for a notice
router.post('/:noticeOutSourcingId/bookmark', OutSourcingNoticeController.toggleBookmark);

// Get all garage notices
router.get('/garage', OutSourcingNoticeController.getAllGarageNoticeOutSourcings);

// Get all notices to itself
router.get('/to-itself', OutSourcingNoticeController.getAllNoticeOutSourcingsToItself);

// Get all active apprentice notices for an apprentice
router.get('/apprentice/active', OutSourcingNoticeController.getApprenticeAllActiveApprenticeNoticeApps);

// Get all active apprentice notices for a garage
router.get('/garage/active', OutSourcingNoticeController.getGarageAllActiveApprenticeNoticeApps);

// Share a notice
router.post('/:noticeOutSourcingId/share', OutSourcingNoticeController.shareNoticeOutSourcing);

// Add cowork request for a notice
router.post('/:noticeOutSourcingId/cowork/:apprenticeId', OutSourcingNoticeController.addCoworkReqForNoticeOutSourcing);

// Show cowork requests for a requester garage
router.get('/cowork/requests', OutSourcingNoticeController.showCoworkRequestsForRequesterGarage);

// Add apprentice to a request
router.post('/cowork/:apprenticeId/:noticeOutSourcingId', OutSourcingNoticeController.addApprenticeToRequest);

// Delete an apprentice from a notice
router.delete('/cowork/:noticeOutSourcingId/:apprenticeId', OutSourcingNoticeController.deleteThisApprenticeFromNoticeOutSourcing);

// Apprentice refusing from a notice
router.post('/:noticeOutSourcingId/refuse', OutSourcingNoticeController.apprenticeRefusingFromThisNoticeOutSourcingship);

// Confirm transaction completion
router.post('/transaction/:transactionId/confirm', OutSourcingNoticeController.confirmTransactionCompletion);

// Create a complaint
router.post('/transaction/:transactionId/complaint', OutSourcingNoticeController.createComplaint);

// Remove and regret a complaint by requester
router.delete('/complaint/:complaintId', OutSourcingNoticeController.removeAndRegretComplaintByrequester);

// Respond to a complaint
router.post('/complaint/:complaintId/respond', OutSourcingNoticeController.respondToComplaint);

// Add review for a notice
router.post('/:noticeOutSourcingId/review', OutSourcingNoticeController.addReviewForNoticeOutSourcing);

// Create a transaction room
router.post('/transaction/:transactionId/room', OutSourcingNoticeController.createTransactionRoom);

// Send a message
router.post('/conversation/:conversationId/message', OutSourcingNoticeController.sendMessage);

// Get messages
router.get('/conversation/:conversationId/messages', OutSourcingNoticeController.getMessages);

// Get user conversations
router.get('/conversations', OutSourcingNoticeController.getUserConversations);

// Mark messages as read
router.post('/conversation/:conversationId/mark-read', OutSourcingNoticeController.markMessagesAsRead);

// Get conversation details
router.get('/conversation/:conversationId/details', OutSourcingNoticeController.getConversationDetails);

module.exports = router;
