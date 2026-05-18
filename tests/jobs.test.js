// ============================================
// JOBS API TESTS
// ============================================

const request = require('supertest');
const app = require('../src/app');

let employerToken;
let freelancerToken;

describe('Jobs API Tests', () => {
    
    beforeAll(async () => {
        // Register and login as employer
        await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Employer',
                email: 'employer@test.com',
                phone: '0712345600',
                password: 'Employer123',
                role: 'employer'
            });
        
        const employerLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'employer@test.com',
                password: 'Employer123'
            });
        employerToken = employerLogin.body.accessToken;
        
        // Register and login as freelancer
        await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Freelancer',
                email: 'freelancer@test.com',
                phone: '0712345601',
                password: 'Freelancer123',
                role: 'freelancer'
            });
        
        const freelancerLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'freelancer@test.com',
                password: 'Freelancer123'
            });
        freelancerToken = freelancerLogin.body.accessToken;
    });
    
    describe('POST /api/jobs', () => {
        test('Freelancer cannot POST a job (returns 403)', async () => {
            const response = await request(app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send({
                    title: 'Test Job',
                    description: 'This is a test job description with enough length',
                    category: 'Frontend',
                    location: 'Nairobi',
                    budget: 50000
                });
            
            expect(response.statusCode).toBe(403);
            expect(response.body).toHaveProperty('error', 'Access denied');
            expect(response.body.message).toContain('Required role(s): employer');
        });
        
        test('Employer can create a job returns 201', async () => {
            const response = await request(app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${employerToken}`)
                .send({
                    title: 'Senior React Developer',
                    description: 'Looking for an experienced React developer with 3+ years of experience to build a dashboard application.',
                    category: 'Frontend',
                    location: 'Nairobi',
                    budget: 150000,
                    deadline: '2026-06-30'
                });
            
            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('job');
            expect(response.body.job).toHaveProperty('title', 'Senior React Developer');
        });
    });
    
    describe('GET /api/jobs', () => {
        test('Returns paginated jobs', async () => {
            const response = await request(app)
                .get('/api/jobs?page=1&limit=5');
            
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('jobs');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
            expect(response.body).toHaveProperty('totalPages');
        });
        
        test('Filters jobs by category', async () => {
            const response = await request(app)
                .get('/api/jobs?category=Frontend');
            
            expect(response.statusCode).toBe(200);
            expect(response.body.jobs.every(job => job.category === 'Frontend')).toBe(true);
        });
    });
});