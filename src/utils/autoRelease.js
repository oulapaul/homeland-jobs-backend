// ============================================
// ESCROW AUTO-RELEASE FUNCTION
// Finds delivered contracts older than 3 days and releases payment
// ============================================

const { findContractById, updateContract, createPayment, inMemoryDB } = require('../config/database');
const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.PLATFORM_FEE_PERCENTAGE) || 8;

function autoReleaseEscrow() {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const releasedContracts = [];
    
    // Find all contracts with status 'delivered' that are older than 3 days
    const deliveredContracts = inMemoryDB.contracts.filter(contract => {
        if (contract.status !== 'delivered') return false;
        if (!contract.delivered_at) return false;
        const deliveredDate = new Date(contract.delivered_at);
        return deliveredDate <= threeDaysAgo;
    });
    
    for (const contract of deliveredContracts) {
        try {
            // Calculate amounts
            const totalAmount = contract.agreed_amount;
            const platformFee = (totalAmount * PLATFORM_FEE_PERCENTAGE) / 100;
            const freelancerAmount = totalAmount - platformFee;
            
            // Create payment record for freelancer (92%)
            createPayment({
                contract_id: contract.id,
                user_id: contract.freelancer_id,
                amount: freelancerAmount,
                type: 'freelancer_payment',
                status: 'completed'
            });
            
            // Create payment record for platform fee (8%)
            createPayment({
                contract_id: contract.id,
                user_id: null,
                amount: platformFee,
                type: 'platform_fee',
                status: 'completed'
            });
            
            // Update contract status
            updateContract(contract.id, {
                status: 'released',
                released_at: new Date().toISOString(),
                auto_released: true
            });
            
            releasedContracts.push({
                contractId: contract.id,
                freelancerAmount,
                platformFee,
                releasedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`Failed to auto-release contract ${contract.id}:`, error.message);
        }
    }
    
    return {
        message: `Auto-released ${releasedContracts.length} contracts`,
        releasedContracts
    };
}

module.exports = { autoReleaseEscrow };