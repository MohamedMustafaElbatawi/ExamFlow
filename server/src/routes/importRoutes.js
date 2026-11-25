const express = require('express');
const router = express.Router();
const { previewImport, confirmImport, getTemplateGuide } = require('../controllers/importController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { uploadImportFile } = require('../middlewares/uploadMiddleware');

// Protect all import endpoints and enforce instructor role
router.use(protect);
router.use(authorize('instructor'));

router.post('/preview', uploadImportFile.single('file'), previewImport);
router.post('/confirm', confirmImport);
router.get('/template-guide', getTemplateGuide);

module.exports = router;
