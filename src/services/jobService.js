// ============================================
// JOBS SERVICE
// Business logic for job and proposal operations
// ============================================

const {
    findJobById,
    createJob,
    updateJob,
    findProposalById,
    findProposalsByJob,
    findProposalByJobAndFreelancer,
    createProposal,
    updateProposal,
    rejectOtherProposals,
    createContract,
    inMemoryDB
} = require('../config/database');

const { isValidBudget, isValidCategory, isValidLocation } = require('../utils/validationHelpers');

/**
 * Get all jobs with filters, sorting, and pagination
 * @param {Object} queryParams - Query parameters
 * @returns {Object} Paginated jobs result
 */
function getAllJobs(queryParams) {
    let jobs = [...inMemoryDB.jobs];
    const {
        search,
        category,
        location,
        budget_min,
        budget_max,
        sort,
        page = 1,
        limit = 10
    } = queryParams;
    
    // Apply filters
    if (search) {
        const searchLower = search.toLowerCase();
        jobs = jobs.filter(job =>
            job.title.toLowerCase().includes(searchLower) ||
            job.description.toLowerCase().includes(searchLower)
        );
    }
    
    if (category && category !== 'All') {
        jobs = jobs.filter(job => job.category === category);
    }
    
    if (location && location !== 'All') {
        jobs = jobs.filter(job => job.location === location);
    }
    
    if (budget_min) {
        jobs = jobs.filter(job => job.budget >= parseFloat(budget_min));
    }
    
    if (budget_max) {
        jobs = jobs.filter(job => job.budget <= parseFloat(budget_max));
    }
    
    // Apply sorting
    if (sort === 'newest') {
        jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'budget_high') {
        jobs.sort((a, b) => b.budget - a.budget);
    } else if (sort === 'budget_low') {
        jobs.sort((a, b) => a.budget - b.budget);
    }
    
    // Pagination
    const total = jobs.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedJobs = jobs.slice(startIndex, endIndex);
    
    // Add proposal count to each job
    const jobsWithCount = paginatedJobs.map(job => ({
        ...job,
        proposalCount: findProposalsByJob(job.id).length
    }));
    
    return {
        jobs: jobsWithCount,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
    };
}

/**
 * Create a new job posting
 * @param {Object} jobData - Job data
 * @param {number} employerId - ID of employer
 * @returns {Object} { success, job, errors }
 */
function createNewJob(jobData, employerId) {
    const { title, description, category, location, budget, deadline } = jobData;
    
    const errors = [];
    
    if (!title || title.length < 5) {
        errors.push({ field: 'title', message: 'Title must be at least 5 characters' });
    }
    
    if (!description || description.length < 20) {
        errors.push({ field: 'description', message: 'Description must be at least 20 characters' });
    }
    
    if (!category || !isValidCategory(category)) {
        errors.push({
            field: 'category',
            message: `Category must be one of: Frontend, Backend, Full Stack, Mobile, DevOps, Data Science, Design, Security, Management`
        });
    }
    
    if (!location || !isValidLocation(location)) {
        errors.push({
            field: 'location',
            message: `Location must be one of: Nairobi, Mombasa, Kisumu, Eldoret, Remote`
        });
    }
    
    if (!budget || !isValidBudget(budget)) {
        errors.push({ field: 'budget', message: 'Budget must be a positive number' });
    }
    
    if (errors.length > 0) {
        return { success: false, errors };
    }
    
    const newJob = createJob({
        employer_id: employerId,
        title,
        description,
        category,
        location,
        budget: parseFloat(budget),
        deadline: deadline || null
    });
    
    return {
        success: true,
        job: newJob,
        message: 'Job created successfully'
    };
}

/**
 * Get job by ID with proposal count
 * @param {number} jobId - Job ID
 * @returns {Object} { success, job, error }
 */
function getJobDetails(jobId) {
    const job = findJobById(jobId);
    
    if (!job) {
        return {
            success: false,
            error: 'Job not found',
            statusCode: 404
        };
    }
    
    const proposalCount = findProposalsByJob(jobId).length;
    
    return {
        success: true,
        job: { ...job, proposalCount }
    };
}

/**
 * Submit a proposal for a job
 * @param {Object} proposalData - Proposal data
 * @param {number} jobId - Job ID
 * @param {number} freelancerId - Freelancer ID
 * @returns {Object} { success, proposal, errors }
 */
function submitNewProposal(proposalData, jobId, freelancerId) {
    const { cover_letter, proposed_budget, timeline_days } = proposalData;
    
    const job = findJobById(jobId);
    
    if (!job) {
        return {
            success: false,
            error: 'Job not found',
            statusCode: 404
        };
    }
    
    // Check for duplicate proposal
    const existingProposal = findProposalByJobAndFreelancer(jobId, freelancerId);
    if (existingProposal) {
        return {
            success: false,
            error: 'Duplicate proposal',
            message: 'You have already submitted a proposal for this job',
            statusCode: 409
        };
    }
    
    const errors = [];
    
    if (!cover_letter || cover_letter.length < 50) {
        errors.push({ field: 'cover_letter', message: 'Cover letter must be at least 50 characters' });
    }
    
    if (!proposed_budget || parseFloat(proposed_budget) <= 0) {
        errors.push({ field: 'proposed_budget', message: 'Proposed budget must be a positive number' });
    }
    
    if (!timeline_days || parseInt(timeline_days) < 1) {
        errors.push({ field: 'timeline_days', message: 'Timeline must be at least 1 day' });
    }
    
    if (errors.length > 0) {
        return { success: false, errors };
    }
    
    const newProposal = createProposal({
        job_id: jobId,
        freelancer_id: freelancerId,
        cover_letter,
        proposed_budget: parseFloat(proposed_budget),
        timeline_days: parseInt(timeline_days)
    });
    
    return {
        success: true,
        proposal: newProposal,
        message: 'Proposal submitted successfully'
    };
}

/**
 * Accept a proposal and create a contract
 * @param {number} jobId - Job ID
 * @param {number} proposalId - Proposal ID
 * @param {number} employerId - Employer ID
 * @returns {Object} { success, contract, proposal, error }
 */
function acceptProposalAndCreateContract(jobId, proposalId, employerId) {
    const job = findJobById(jobId);
    
    if (!job) {
        return {
            success: false,
            error: 'Job not found',
            statusCode: 404
        };
    }
    
    if (job.employer_id !== employerId) {
        return {
            success: false,
            error: 'Access denied',
            message: 'You can only accept proposals for your own jobs',
            statusCode: 403
        };
    }
    
    const proposal = findProposalById(proposalId);
    
    if (!proposal) {
        return {
            success: false,
            error: 'Proposal not found',
            statusCode: 404
        };
    }
    
    if (proposal.job_id !== jobId) {
        return {
            success: false,
            error: 'Proposal does not belong to this job',
            statusCode: 400
        };
    }
    
    // Check if contract already exists
    const existingContract = inMemoryDB.contracts.find(c => c.job_id === jobId);
    if (existingContract) {
        return {
            success: false,
            error: 'A contract already exists for this job',
            statusCode: 409
        };
    }
    
    // Update proposal status to accepted
    updateProposal(proposalId, { status: 'accepted' });
    
    // Reject all other proposals for this job
    rejectOtherProposals(jobId, proposalId);
    
    // Update job status
    updateJob(jobId, { status: 'in_progress' });
    
    // Create contract
    const newContract = createContract({
        job_id: jobId,
        proposal_id: proposalId,
        employer_id: employerId,
        freelancer_id: proposal.freelancer_id,
        agreed_amount: proposal.proposed_budget
    });
    
    return {
        success: true,
        contract: newContract,
        proposal: findProposalById(proposalId),
        message: 'Proposal accepted successfully'
    };
}

module.exports = {
    getAllJobs,
    createNewJob,
    getJobDetails,
    submitNewProposal,
    acceptProposalAndCreateContract
};