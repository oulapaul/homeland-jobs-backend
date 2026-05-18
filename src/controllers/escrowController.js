// ============================================
// ESCROW CONTROLLER
// Handles funding, delivery, approval, dispute
// ============================================

const { 
    findContractById, 
    updateContract, 
    createEscrow, 
    updateEscrow,
    createPayment,
    inMemoryDB
} = require('../config/database');

const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.PLATFORM_FEE_PERCENTAGE) || 8;

// Helper to generate mock receipt number
function generateMockReceipt() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let receipt = '';
    for (let i = 0; i < 10; i++) {
        receipt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return receipt;
}

// POST /api/contracts/:id/fund
function fundContract(req, res) {
    const contractId = parseInt(req.params.id);
    const employerId = req.user.userId;
    
    const contract = findContractById(contractId);
    
    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }
    
    if (contract.employer_id !== employerId) {
        return res.status(403).json({ 
            error: 'Access denied',
            message: 'Only the employer can fund this contract'
        });
    }
    
    if (contract.status !== 'active') {
        return res.status(400).json({ 
            error: 'Invalid contract status',
            message: `Contract status is ${contract.status}, cannot fund`
        });
    }
    
    const receiptNumber = generateMockReceipt();
    
    // Create escrow record
    const escrow = createEscrow({
        contract_id: contractId,
        amount: contract.agreed_amount,
        receipt_number: receiptNumber,
        status: 'funded'
    });
    
    // Update contract status
    updateContract(contractId, { 
        status: 'funded',
        funded_at: new Date().toISOString()
    });
    
    res.status(200).json({
        message: 'Contract funded successfully',
        escrow: {
            id: escrow.id,
            amount: escrow.amount,
            receiptNumber: escrow.receipt_number,
            status: escrow.status
        },
        mockReceiptNumber: receiptNumber
    });
}

// POST /api/contracts/:id/deliver
function deliverContract(req, res) {
    const contractId = parseInt(req.params.id);
    const freelancerId = req.user.userId;
    
    const contract = findContractById(contractId);
    
    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }
    
    if (contract.freelancer_id !== freelancerId) {
        return res.status(403).json({ 
            error: 'Access denied',
            message: 'Only the freelancer can mark delivery'
        });
    }
    
    if (contract.status !== 'funded') {
        return res.status(400).json({ 
            error: 'Invalid contract status',
            message: `Contract status is ${contract.status}, cannot mark delivered`
        });
    }
    
    updateContract(contractId, { 
        status: 'delivered',
        delivered_at: new Date().toISOString()
    });
    
    res.status(200).json({
        message: 'Work marked as delivered',
        contract: findContractById(contractId)
    });
}

// POST /api/contracts/:id/approve
function approveContract(req, res) {
    const contractId = parseInt(req.params.id);
    const employerId = req.user.userId;
    
    const contract = findContractById(contractId);
    
    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }
    
    if (contract.employer_id !== employerId) {
        return res.status(403).json({ 
            error: 'Access denied',
            message: 'Only the employer can approve and release payment'
        });
    }
    
    if (contract.status !== 'delivered') {
        return res.status(400).json({ 
            error: 'Invalid contract status',
            message: `Contract status is ${contract.status}, can only approve delivered contracts`
        });
    }
    
    const totalAmount = contract.agreed_amount;
    const platformFee = (totalAmount * PLATFORM_FEE_PERCENTAGE) / 100;
    const freelancerAmount = totalAmount - platformFee;
    
    // Record freelancer payment (92%)
    createPayment({
        contract_id: contractId,
        user_id: contract.freelancer_id,
        amount: freelancerAmount,
        type: 'freelancer_payment',
        status: 'completed'
    });
    
    // Record platform fee (8%)
    createPayment({
        contract_id: contractId,
        user_id: null,
        amount: platformFee,
        type: 'platform_fee',
        status: 'completed'
    });
    
    // Update escrow status
    const escrow = inMemoryDB.escrows.find(e => e.contract_id === contractId);
    if (escrow) {
        updateEscrow(escrow.id, { status: 'released' });
    }
    
    // Update contract status
    updateContract(contractId, { 
        status: 'released',
        released_at: new Date().toISOString()
    });
    
    res.status(200).json({
        message: 'Payment released successfully',
        freelancerPayment: freelancerAmount,
        platformFee: platformFee,
        platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
        contract: findContractById(contractId)
    });
}

// POST /api/contracts/:id/dispute
function disputeContract(req, res) {
    const contractId = parseInt(req.params.id);
    const { reason } = req.body;
    const userId = req.user.userId;
    
    const contract = findContractById(contractId);
    
    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }
    
    if (contract.employer_id !== userId && contract.freelancer_id !== userId) {
        return res.status(403).json({ 
            error: 'Access denied',
            message: 'Only the employer or freelancer can dispute this contract'
        });
    }
    
    if (!reason || reason.length < 20) {
        return res.status(400).json({ 
            error: 'Validation failed',
            errors: [{ field: 'reason', message: 'Reason must be at least 20 characters' }]
        });
    }
    
    updateContract(contractId, { 
        status: 'disputed',
        dispute_reason: reason,
        disputed_by: userId,
        disputed_at: new Date().toISOString()
    });
    
    res.status(200).json({
        message: 'Contract disputed successfully',
        contract: findContractById(contractId)
    });
}

module.exports = { fundContract, deliverContract, approveContract, disputeContract };