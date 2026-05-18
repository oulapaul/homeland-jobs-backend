// ============================================
// ESCROW SERVICE
// Business logic for escrow and payment operations
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

/**
 * Generate a mock M-Pesa receipt number
 * @returns {string} Mock receipt number
 */
function generateMockReceipt() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let receipt = '';
    for (let i = 0; i < 10; i++) {
        receipt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return receipt;
}

/**
 * Fund a contract (employer deposits money to escrow)
 * @param {number} contractId - Contract ID
 * @param {number} employerId - Employer ID
 * @returns {Object} { success, escrow, receiptNumber, error }
 */
function fundContractEscrow(contractId, employerId) {
    const contract = findContractById(contractId);
    
    if (!contract) {
        return {
            success: false,
            error: 'Contract not found',
            statusCode: 404
        };
    }
    
    if (contract.employer_id !== employerId) {
        return {
            success: false,
            error: 'Access denied',
            message: 'Only the employer can fund this contract',
            statusCode: 403
        };
    }
    
    if (contract.status !== 'active') {
        return {
            success: false,
            error: 'Invalid contract status',
            message: `Contract status is ${contract.status}, cannot fund`,
            statusCode: 400
        };
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
    
    return {
        success: true,
        escrow: {
            id: escrow.id,
            amount: escrow.amount,
            receiptNumber: escrow.receipt_number,
            status: escrow.status
        },
        receiptNumber,
        message: 'Contract funded successfully'
    };
}

/**
 * Mark contract as delivered (freelancer submits work)
 * @param {number} contractId - Contract ID
 * @param {number} freelancerId - Freelancer ID
 * @returns {Object} { success, contract, error }
 */
function markContractDelivered(contractId, freelancerId) {
    const contract = findContractById(contractId);
    
    if (!contract) {
        return {
            success: false,
            error: 'Contract not found',
            statusCode: 404
        };
    }
    
    if (contract.freelancer_id !== freelancerId) {
        return {
            success: false,
            error: 'Access denied',
            message: 'Only the freelancer can mark delivery',
            statusCode: 403
        };
    }
    
    if (contract.status !== 'funded') {
        return {
            success: false,
            error: 'Invalid contract status',
            message: `Contract status is ${contract.status}, cannot mark delivered`,
            statusCode: 400
        };
    }
    
    const updatedContract = updateContract(contractId, {
        status: 'delivered',
        delivered_at: new Date().toISOString()
    });
    
    return {
        success: true,
        contract: updatedContract,
        message: 'Work marked as delivered'
    };
}

/**
 * Approve contract and release payment (employer releases escrow)
 * Freelancer receives 92%, platform fee 8%
 * @param {number} contractId - Contract ID
 * @param {number} employerId - Employer ID
 * @returns {Object} { success, freelancerPayment, platformFee, contract, error }
 */
function approveAndReleasePayment(contractId, employerId) {
    const contract = findContractById(contractId);
    
    if (!contract) {
        return {
            success: false,
            error: 'Contract not found',
            statusCode: 404
        };
    }
    
    if (contract.employer_id !== employerId) {
        return {
            success: false,
            error: 'Access denied',
            message: 'Only the employer can approve and release payment',
            statusCode: 403
        };
    }
    
    if (contract.status !== 'delivered') {
        return {
            success: false,
            error: 'Invalid contract status',
            message: `Contract status is ${contract.status}, can only approve delivered contracts`,
            statusCode: 400
        };
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
    const updatedContract = updateContract(contractId, {
        status: 'released',
        released_at: new Date().toISOString()
    });
    
    return {
        success: true,
        freelancerPayment: freelancerAmount,
        platformFee: platformFee,
        platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
        contract: updatedContract,
        message: 'Payment released successfully'
    };
}

/**
 * Dispute a contract
 * @param {number} contractId - Contract ID
 * @param {number} userId - User ID (employer or freelancer)
 * @param {string} reason - Dispute reason
 * @returns {Object} { success, contract, error }
 */
function disputeContract(contractId, userId, reason) {
    const contract = findContractById(contractId);
    
    if (!contract) {
        return {
            success: false,
            error: 'Contract not found',
            statusCode: 404
        };
    }
    
    if (contract.employer_id !== userId && contract.freelancer_id !== userId) {
        return {
            success: false,
            error: 'Access denied',
            message: 'Only the employer or freelancer can dispute this contract',
            statusCode: 403
        };
    }
    
    if (!reason || reason.length < 20) {
        return {
            success: false,
            error: 'Validation failed',
            errors: [{ field: 'reason', message: 'Reason must be at least 20 characters' }],
            statusCode: 400
        };
    }
    
    const updatedContract = updateContract(contractId, {
        status: 'disputed',
        dispute_reason: reason,
        disputed_by: userId,
        disputed_at: new Date().toISOString()
    });
    
    return {
        success: true,
        contract: updatedContract,
        message: 'Contract disputed successfully'
    };
}

/**
 * Get escrow status for a contract
 * @param {number} contractId - Contract ID
 * @returns {Object} Escrow details
 */
function getEscrowStatus(contractId) {
    const escrow = inMemoryDB.escrows.find(e => e.contract_id === contractId);
    const contract = findContractById(contractId);
    
    if (!escrow || !contract) {
        return null;
    }
    
    return {
        contractId,
        amount: escrow.amount,
        escrowStatus: escrow.status,
        contractStatus: contract.status,
        fundedAt: contract.funded_at,
        deliveredAt: contract.delivered_at,
        releasedAt: contract.released_at
    };
}

module.exports = {
    generateMockReceipt,
    fundContractEscrow,
    markContractDelivered,
    approveAndReleasePayment,
    disputeContract,
    getEscrowStatus
};