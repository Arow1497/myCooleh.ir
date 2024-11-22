const express = require('express');
const router = express.Router();
const { AgahiDivarController } = require('../../../http/controllers/mainApp/forums/agahiDivar.controller');

// Create a new notice
router.post('/create', AgahiDivarController.createNoticeDivar);

// Get all notices
router.get('/', AgahiDivarController.getAllNoticeDivars);

// Get a notice by ID
router.get('/:id', AgahiDivarController.getOneNoticeDivarById);

// Edit a notice by ID
router.put('/:id', AgahiDivarController.editNoticeDivarById);

// Remove a notice by ID
router.delete('/:id', AgahiDivarController.removeNoticeDivarById);

// Get bookmarked posts by user ID
router.get('/bookmarks/:userId/:noticeId', AgahiDivarController.getBookmarkedPostsByUserId);

// Search notices
router.get('/search', AgahiDivarController.searchNoticeDivars);

// Report a notice
router.post('/:noticeDivarId/report', AgahiDivarController.reportNoticeDivar);

// Bookmark a notice
router.post('/:noticeDivarId/bookmark', AgahiDivarController.bookmarkNoticeDivar);

// Share a notice
router.post('/:noticeDivarId/share', AgahiDivarController.shareNoticeDivar);

module.exports = router;
