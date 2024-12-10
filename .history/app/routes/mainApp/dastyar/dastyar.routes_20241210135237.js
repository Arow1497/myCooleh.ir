const express = require('express');
const router = express.Router();
const { DivarNoticeController } = require('../../../http/controllers/mainApp/dastyar/agahiDastyar.controller');

// Create a new notice
router.post('/create', DivarNoticeController.create);

// Get all notices
router.get('/', DivarNoticeController.getAll);

// Get a notice by ID
router.get('/:noticeDastyarId', DivarNoticeController.getOne);

// Remove a notice by ID
router.delete('/:noticeDastyarId', DivarNoticeController.remove);

// Edit a notice by ID
router.put('/:noticeDastyarId', DivarNoticeController.edit);

// Toggle bookmark for a notice
router.post('/:noticeDastyarId/bookmark', DivarNoticeController.toggleBookmark);

// Get all garage notices
router.get('/garage', DivarNoticeController.getAllToGarage);

// Get all notices to itself
router.get('/to-itself', DivarNoticeController.getAllToItself);

// Get all active apprentice notices for an apprentice
router.get('/apprentice/active', DivarNoticeController.getActiveToItSelf);

// Get all active apprentice notices for a garage
router.get('/garage/active', DivarNoticeController.getActiveToGarage);

// Share a notice
router.post('/:noticeDastyarId/share', DivarNoticeController.share);

// Add cowork request for a notice
router.post('/:noticeDastyarId/cowork/:apprenticeId', DivarNoticeController.addCollaborationRequest);

// Show cowork requests for a requester garage
router.get('/cowork/requests', DivarNoticeController.showCollabRequests);

// Add apprentice to a request
router.post('/cowork/:apprenticeId/:noticeDastyarId', DivarNoticeController.addCollaborator);

// Delete an apprentice from a notice
router.delete('/cowork/:noticeDastyarId/:apprenticeId', DivarNoticeController.deleteCollaborator);

// Apprentice refusing from a notice
router.post('/:noticeDastyarId/refuse', DivarNoticeController.refusing);

// Confirm transaction completion
router.post('/transaction/:transactionId/confirm', DivarNoticeController.confirmTransaction);

// Create a complaint
router.post('/transaction/:transactionId/complaint', DivarNoticeController.createComplaint);

// Remove and regret a complaint by requester
router.delete('/complaint/:complaintId', DivarNoticeController.regretComplaint);

// Respond to a complaint
router.post('/complaint/:complaintId/respond', DivarNoticeController.respondToComplaint);

// Add review for a notice
router.post('/:noticeDastyarId/review', DivarNoticeController.addReview);

// Create a transaction room
router.post('/transaction/:transactionId/room', DivarNoticeController.createTransactionRoom);

// Send a message
router.post('/conversation/:conversationId/message', DivarNoticeController.sendMessage);

// Get messages
router.get('/conversation/:conversationId/messages', DivarNoticeController.getMessages);

// Get user conversations
router.get('/conversations', DivarNoticeController.getUserConversations);

// Mark messages as read
router.post('/conversation/:conversationId/mark-read', DivarNoticeController.markMessagesAsRead);

// Get conversation details
router.get('/conversation/:conversationId/details', DivarNoticeController.getConversationDetails);

module.exports = router;
