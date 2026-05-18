// ============================================
// DATABASE CONNECTION (PostgreSQL)
// For assessment purposes - in-memory simulation
// ============================================

// Since this is a code assessment without actual database setup,
// I'm providing an in-memory data store that mimics database operations.
// In production, replace this with PostgreSQL using 'pg' package.

const inMemoryDB = {
    users: [],
    jobs: [],
    proposals: [],
    contracts: [],
    payments: [],
    escrows: [],
    nextId: {
        user: 1,
        job: 1,
        proposal: 1,
        contract: 1,
        payment: 1,
        escrow: 1
    }
};

// Helper to get next ID
function getNextId(collection) {
    const id = inMemoryDB.nextId[collection];
    inMemoryDB.nextId[collection]++;
    return id;
}

// User helpers
function findUserByEmail(email) {
    return inMemoryDB.users.find(u => u.email === email);
}

function findUserById(id) {
    return inMemoryDB.users.find(u => u.id === id);
}

function createUser(userData) {
    const newUser = {
        id: getNextId('user'),
        ...userData,
        created_at: new Date().toISOString()
    };
    inMemoryDB.users.push(newUser);
    return newUser;
}

// Job helpers
function findJobById(id) {
    return inMemoryDB.jobs.find(j => j.id === id);
}

function findJobsByEmployer(employerId) {
    return inMemoryDB.jobs.filter(j => j.employer_id === employerId);
}

function createJob(jobData) {
    const newJob = {
        id: getNextId('job'),
        ...jobData,
        status: 'open',
        created_at: new Date().toISOString()
    };
    inMemoryDB.jobs.push(newJob);
    return newJob;
}

function updateJob(id, updates) {
    const index = inMemoryDB.jobs.findIndex(j => j.id === id);
    if (index !== -1) {
        inMemoryDB.jobs[index] = { ...inMemoryDB.jobs[index], ...updates };
        return inMemoryDB.jobs[index];
    }
    return null;
}

// Proposal helpers
function findProposalById(id) {
    return inMemoryDB.proposals.find(p => p.id === id);
}

function findProposalsByJob(jobId) {
    return inMemoryDB.proposals.filter(p => p.job_id === jobId);
}

function findProposalByJobAndFreelancer(jobId, freelancerId) {
    return inMemoryDB.proposals.find(p => p.job_id === jobId && p.freelancer_id === freelancerId);
}

function createProposal(proposalData) {
    const newProposal = {
        id: getNextId('proposal'),
        ...proposalData,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    inMemoryDB.proposals.push(newProposal);
    return newProposal;
}

function updateProposal(id, updates) {
    const index = inMemoryDB.proposals.findIndex(p => p.id === id);
    if (index !== -1) {
        inMemoryDB.proposals[index] = { ...inMemoryDB.proposals[index], ...updates };
        return inMemoryDB.proposals[index];
    }
    return null;
}

function rejectOtherProposals(jobId, exceptProposalId) {
    inMemoryDB.proposals.forEach(p => {
        if (p.job_id === jobId && p.id !== exceptProposalId && p.status === 'pending') {
            p.status = 'rejected';
        }
    });
}

// Contract helpers
function findContractById(id) {
    return inMemoryDB.contracts.find(c => c.id === id);
}

function findContractByJob(jobId) {
    return inMemoryDB.contracts.find(c => c.job_id === jobId);
}

function createContract(contractData) {
    const newContract = {
        id: getNextId('contract'),
        ...contractData,
        status: 'active',
        created_at: new Date().toISOString(),
        delivered_at: null,
        funded_at: null,
        released_at: null
    };
    inMemoryDB.contracts.push(newContract);
    return newContract;
}

function updateContract(id, updates) {
    const index = inMemoryDB.contracts.findIndex(c => c.id === id);
    if (index !== -1) {
        inMemoryDB.contracts[index] = { ...inMemoryDB.contracts[index], ...updates };
        return inMemoryDB.contracts[index];
    }
    return null;
}

// Escrow helpers
function createEscrow(escrowData) {
    const newEscrow = {
        id: getNextId('escrow'),
        ...escrowData,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    inMemoryDB.escrows.push(newEscrow);
    return newEscrow;
}

function updateEscrow(id, updates) {
    const index = inMemoryDB.escrows.findIndex(e => e.id === id);
    if (index !== -1) {
        inMemoryDB.escrows[index] = { ...inMemoryDB.escrows[index], ...updates };
        return inMemoryDB.escrows[index];
    }
    return null;
}

// Payment helpers
function createPayment(paymentData) {
    const newPayment = {
        id: getNextId('payment'),
        ...paymentData,
        created_at: new Date().toISOString()
    };
    inMemoryDB.payments.push(newPayment);
    return newPayment;
}

module.exports = {
    inMemoryDB,
    getNextId,
    findUserByEmail,
    findUserById,
    createUser,
    findJobById,
    findJobsByEmployer,
    createJob,
    updateJob,
    findProposalById,
    findProposalsByJob,
    findProposalByJobAndFreelancer,
    createProposal,
    updateProposal,
    rejectOtherProposals,
    findContractById,
    findContractByJob,
    createContract,
    updateContract,
    createEscrow,
    updateEscrow,
    createPayment
};