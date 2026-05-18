// ============================================
// JOBS ROUTES
// ============================================

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { 
    getJobs, 
    createJobPost, 
    getJobById, 
    submitProposal, 
    acceptProposal 
} = require('../controllers/jobController');

const router = express.Router();

// Public routes
router.get('/jobs', getJobs);
router.get('/jobs/:id', getJobById);

// Protected routes
router.post('/jobs', requireAuth, requireRole('employer'), createJobPost);
router.post('/jobs/:id/proposals', requireAuth, requireRole('freelancer'), submitProposal);
router.put('/jobs/:id/proposals/:proposalId/accept', requireAuth, requireRole('employer'), acceptProposal);

module.exports = router;