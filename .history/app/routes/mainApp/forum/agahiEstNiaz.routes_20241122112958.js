const express = require('express');
const router = express.Router();
const { AgahiEstNiazController } = require('../../../http/controllers/mainApp/forums/agahiEstNiaz.controller');

// Create a new notice
router.post('/create', AgahiEstNiazController.createNoticeEstNiaz);

// Get all notices
router.get('/', AgahiEstNiazController.getAllNoticeEstNiazs);

// Get a notice by ID
router.get('/:id', AgahiEstNiazController.getOneNoticeEstNiazById);

// Edit a notice by ID
router.put('/:id', AgahiEstNiazController.editNoticeEstNiazById);

// Remove a notice by ID
router.delete('/:id', AgahiEstNiazController.removeNoticeEstNiazById);

// Get bookmarked notices by user ID
router.get('/bookmarks/:userId/:noticeId', AgahiEstNiazController.getBookmarkedNoticesByUserId);

// Search notices
router.get('/search', AgahiEstNiazController.searchNoticeEstNiazs);

// Report a notice
router.post('/:noticeEstNiazId/report', AgahiEstNiazController.reportNoticeEstNiaz);

// Bookmark a notice
router.post('/:noticeEstNiazId/bookmark', AgahiEstNiazController.bookmarkNoticeEstNiaz);

// Share a notice
router.post('/:noticeEstNiazId/share', AgahiEstNiazController.shareNoticeEstNiaz);

module.exports = router;
