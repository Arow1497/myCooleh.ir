const express = require('express');
const router = express.Router();
const { AgahiTaminController } = require('../../../http/controllers/mainApp/shop/taminGhete.controller');

// Create a new notice
router.post('/create', AgahiTaminController.createNoticeTaminGhete);

// Get all notices
router.get('/', AgahiTaminController.getAllNoticeTaminGhetes);

// Get a notice by ID
router.get('/:id', AgahiTaminController.getOneNoticeTaminGheteById);

// Edit a notice by ID
router.put('/:id', AgahiTaminController.editNoticeTaminGheteById);

// Remove a notice by ID
router.delete('/:id', AgahiTaminController.removeNoticeTaminGheteById);

// Get bookmarked posts by user ID
router.get('/bookmarks/:userId/:noticeId', AgahiTaminController.getBookmarkedNoticesByUserId);

// Search notices
router.get('/search', AgahiTaminController.searchNoticeTaminGhetes);

// Report a notice
router.post('/:noticeDivarId/report', AgahiTaminController.reportNoticeTaminGhete);

// Bookmark a notice
router.post('/:noticeDivarId/bookmark', AgahiTaminController.bookmarkNoticeTaminGhete);

// Share a notice
router.post('/:noticeDivarId/share', AgahiTaminController.shareNoticeTaminGhete);

module.exports = router;
