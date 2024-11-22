const express = require('express');
const router = express.Router();
const { AgahiGarageRequirementsController } = require('../../../http/controllers/mainApp/forums/agahiGarageRequirements.controller');

// Create a new notice
router.post('/create', AgahiGarageRequirementsController.createNoticeGarageRequirments);

// Get all notices
router.get('/', AgahiGarageRequirementsController.getAllNoticeGarageRequirmentss);

// Get a notice by ID
router.get('/:id', AgahiGarageRequirementsController.getOneNoticeGarageRequirmentsById);

// Edit a notice by ID
router.put('/:id', AgahiGarageRequirementsController.editNoticeGarageRequirmentsById);

// Remove a notice by ID
router.delete('/:id', AgahiGarageRequirementsController.removeNoticeGarageRequirmentsById);

// Get bookmarked notices by user ID
router.get('/bookmarks/:userId/:noticeId', AgahiGarageRequirementsController.getBookmarkedNoticesByUserId);

// Search notices
router.get('/search', AgahiGarageRequirementsController.searchNoticeGarageRequirmentss);

// Report a notice
router.post('/:noticeGarageRequirmentsId/report', AgahiGarageRequirementsController.reportNoticeGarageRequirments);

// Bookmark a notice
router.post('/:noticeGarageRequirmentsId/bookmark', AgahiGarageRequirementsController.bookmarkNoticeGarageRequirments);

// Share a notice
router.post('/:noticeGarageRequirmentsId/share', AgahiGarageRequirementsController.shareNoticeGarageRequirments);

module.exports = router;
