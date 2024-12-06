const express = require('express');
const router = express.Router();
const { ApprenticeshipNoticeController } = require('../../../http/controllers/mainApp/dastyar/agahiApprentice.controller');

// Create a new notice
router.post('/create/:projectId', ApprenticeshipNoticeController.create);

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
router.get('/garage', ApprenticeshipNoticeController.getAllToGarage);

// Get all notices to itself
router.get('/to-itself', ApprenticeshipNoticeController.getAllToItself);

// Get all active apprentice notices for an apprentice
router.get('/apprentice/active', ApprenticeshipNoticeController.getActiveToItSelf);

// Get all active apprentice notices for a garage
router.get('/garage/active', ApprenticeshipNoticeController.getActiveToGarage);

// Share a notice
router.post('/:noticeApprenticeId/share', ApprenticeshipNoticeController.share);

// Add cowork request for a notice
router.post('/:noticeApprenticeId/cowork/:apprenticeId', ApprenticeshipNoticeController.addCollaborationRequest);

// Show cowork requests for a requester garage
router.get('/cowork/requests', ApprenticeshipNoticeController.showCollabRequests);

// Add apprentice to a request
router.post('/cowork/:apprenticeId/:noticeApprenticeId', ApprenticeshipNoticeController.addCollaborator);

// Delete an apprentice from a notice
router.delete('/cowork/:noticeApprenticeId/:apprenticeId', ApprenticeshipNoticeController.deleteCollaborator);

// Apprentice refusing from a notice
router.post('/:noticeApprenticeId/refuse', ApprenticeshipNoticeController.refusing);

// Confirm transaction completion
router.post('/transaction/:transactionId/confirm', ApprenticeshipNoticeController.confirmTransaction);

// Create a complaint
router.post('/transaction/:transactionId/complaint', ApprenticeshipNoticeController.createComplaint);

// Remove and regret a complaint by requester
router.delete('/complaint/:complaintId', ApprenticeshipNoticeController.regretComplaint);

// Respond to a complaint
router.post('/complaint/:complaintId/respond', ApprenticeshipNoticeController.respondToComplaint);

// Add review for a notice
router.post('/:noticeApprenticeId/review', ApprenticeshipNoticeController.addReview);

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