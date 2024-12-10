const express = require('express');
const router = express.Router();
const { OutSourcingNoticeController } = require('../../../http/controllers/mainApp/dastyar/agahiOutSourcing.controller');

// Create a new notice
router.post('/create', OutSourcingNoticeController.create);

// Get all notices
router.get('/', OutSourcingNoticeController.getAll);

// Get a notice by ID
router.get('/:noticeOutSourcingId', OutSourcingNoticeController.getOne);

// Remove a notice by ID
router.delete('/:noticeOutSourcingId', OutSourcingNoticeController.remove);

// Edit a notice by ID
router.put('/:noticeOutSourcingId', OutSourcingNoticeController.edit);

// Toggle bookmark for a notice
router.post('/:noticeOutSourcingId/bookmark', OutSourcingNoticeController.toggleBookmark);

// Get all garage notices
router.get('/garage', OutSourcingNoticeController.getAllToGarage);

// Get all notices to itself
router.get('/to-itself', OutSourcingNoticeController.getAllToItself);

// Get all active apprentice notices for an apprentice
router.get('/apprentice/active', OutSourcingNoticeController.getActiveToItSelf);

// Get all active apprentice notices for a garage
router.get('/garage/active', OutSourcingNoticeController.getActiveToGarage);

// Share a notice
router.post('/:noticeOutSourcingId/share', OutSourcingNoticeController.share);

// Add cowork request for a notice
router.post('/:noticeOutSourcingId/cowork/:apprenticeId', OutSourcingNoticeController.addCollaborationRequest);

// Show cowork requests for a requester garage
router.get('/cowork/requests', OutSourcingNoticeController.showCollabRequests);

// Add apprentice to a request
router.post('/cowork/:apprenticeId/:noticeOutSourcingId', OutSourcingNoticeController.addCollaborator);

// Delete an apprentice from a notice
router.delete('/cowork/:noticeOutSourcingId/:apprenticeId', OutSourcingNoticeController.deleteCollaborator);

// Apprentice refusing from a notice
router.post('/:noticeOutSourcingId/refuse', OutSourcingNoticeController.refusing);

// Confirm transaction completion
router.post('/transaction/:transactionId/confirm', OutSourcingNoticeController.confirmTransaction);

// Create a complaint
router.post('/transaction/:transactionId/complaint', OutSourcingNoticeController.createComplaint);

// Remove and regret a complaint by requester
router.delete('/complaint/:complaintId', OutSourcingNoticeController.regretComplaint);

// Respond to a complaint
router.post('/complaint/:complaintId/respond', OutSourcingNoticeController.respondToComplaint);

// Add review for a notice
router.post('/:noticeOutSourcingId/review', OutSourcingNoticeController.addReview);

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
