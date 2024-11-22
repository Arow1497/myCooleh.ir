const express = require('express');
const router = express.Router();
const { ApprenticeshipNoticeController } = require('../../http/controllers/mainApp/dastyar/agahiOutSourcing.controller');

// Create a new notice
router.post('/create', ApprenticeshipNoticeController.createNewNoticeOutSourcing);

// Get all notices
router.get('/', ApprenticeshipNoticeController.getAllNoticeOutSourcing);

// Get a notice by ID
router.get('/:noticeOutSourcingId', ApprenticeshipNoticeController.getOneNoticeOutSourcingById);

// Remove a notice by ID
router.delete('/:noticeOutSourcingId', ApprenticeshipNoticeController.removeNoticeOutSourcingById);

// Edit a notice by ID
router.put('/:noticeOutSourcingId', ApprenticeshipNoticeController.editNoticeOutSourcingsById);

// Toggle bookmark for a notice
router.post('/:noticeOutSourcingId/bookmark', ApprenticeshipNoticeController.toggleBookmark);

// Get all garage notices
router.get('/garage', ApprenticeshipNoticeController.getAllGarageNoticeOutSourcings);

// Get all notices to itself
router.get('/to-itself', ApprenticeshipNoticeController.getAllNoticeOutSourcingsToItself);

// Get all active apprentice notices for an apprentice
router.get('/apprentice/active', ApprenticeshipNoticeController.getApprenticeAllActiveApprenticeNoticeApps);

// Get all active apprentice notices for a garage
router.get('/garage/active', ApprenticeshipNoticeController.getGarageAllActiveApprenticeNoticeApps);

// Share a notice
router.post('/:noticeOutSourcingId/share', ApprenticeshipNoticeController.shareNoticeOutSourcing);

// Add cowork request for a notice
router.post('/:noticeOutSourcingId/cowork/:apprenticeId', ApprenticeshipNoticeController.addCoworkReqForNoticeOutSourcing);

// Show cowork requests for a requester garage
router.get('/cowork/requests', ApprenticeshipNoticeController.showCoworkRequestsForRequesterGarage);

// Add apprentice to a request
router.post('/cowork/:apprenticeId/:noticeOutSourcingId', ApprenticeshipNoticeController.addApprenticeToRequest);

// Delete an apprentice from a notice
router.delete('/cowork/:noticeOutSourcingId/:apprenticeId', ApprenticeshipNoticeController.deleteThisApprenticeFromNoticeOutSourcing);

// Apprentice refusing from a notice
router.post('/:noticeOutSourcingId/refuse', ApprenticeshipNoticeController.apprenticeRefusingFromThisNoticeOutSourcingship);

// Confirm transaction completion
router.post('/transaction/:transactionId/confirm', ApprenticeshipNoticeController.confirmTransactionCompletion);

// Create a complaint
router.post('/transaction/:transactionId/complaint', ApprenticeshipNoticeController.createComplaint);

// Remove and regret a complaint by requester
router.delete('/complaint/:complaintId', ApprenticeshipNoticeController.removeAndRegretComplaintByrequester);

// Respond to a complaint
router.post('/complaint/:complaintId/respond', ApprenticeshipNoticeController.respondToComplaint);

// Add review for a notice
router.post('/:noticeOutSourcingId/review', ApprenticeshipNoticeController.addReviewForNoticeOutSourcing);

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
