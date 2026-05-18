// ============================================
// ESCROW ROUTES
// ============================================

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { 
    fundContract, 
    deliverContract, 
    approveContract, 
    disputeContract 
} = require('../controllers/escrowController');

const router = express.Router();

router.post('/contracts/:id/fund', requireAuth, requireRole('employer'), fundContract);
router.post('/contracts/:id/deliver', requireAuth, requireRole('freelancer'), deliverContract);
router.post('/contracts/:id/approve', requireAuth, requireRole('employer'), approveContract);
router.post('/contracts/:id/dispute', requireAuth, disputeContract);

module.exports = router;