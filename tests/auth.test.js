// ============================================
// AUTHENTICATION TESTS
// ============================================

const request = require('supertest');
const app = require('../src/app');

describe('Authentication API Tests', () => {
    
    describe('POST /api/auth/register', () => {
        test('Successful registration returns 201 with correct fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: '0712345678',
                    password: 'Test1234',
                    role: 'freelancer'
                });
            
            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user).toHaveProperty('name', 'Test User');
            expect(response.body.user).toHaveProperty('email', 'test@example.com');
            expect(response.body.user).not.toHaveProperty('password_hash');
        });
        
        test('Registration with invalid email returns 400', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'invalid-email',
                    phone: '0712345678',
                    password: 'Test1234',
                    role: 'freelancer'
                });
            
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'Validation failed');
        });
        
        test('Registration with duplicate email returns 400', async () => {
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'User One',
                    email: 'duplicate@example.com',
                    phone: '0711111111',
                    password: 'Test1234',
                    role: 'freelancer'
                });
            
            // Duplicate registration
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'User Two',
                    email: 'duplicate@example.com',
                    phone: '0722222222',
                    password: 'Test1234',
                    role: 'employer'
                });
            
            expect(response.statusCode).toBe(400);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors.some(e => e.field === 'email')).toBe(true);
        });
    });
    
    describe('POST /api/auth/login', () => {
        test('Login with wrong password returns 401', async () => {
            // Register first
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Login Test',
                    email: 'logintest@example.com',
                    phone: '0733333333',
                    password: 'Correct123',
                    role: 'freelancer'
                });
            
            // Login with wrong password
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'logintest@example.com',
                    password: 'WrongPassword'
                });
            
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('error', 'Invalid email or password');
        });
        
        test('Successful login returns accessToken and refreshToken', async () => {
            // Register first
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Success Test',
                    email: 'success@example.com',
                    phone: '0744444444',
                    password: 'Success123',
                    role: 'employer'
                });
            
            // Login
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'success@example.com',
                    password: 'Success123'
                });
            
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
        });
    });
    
    describe('GET /api/auth/me', () => {
        test('Protected route requires authentication', async () => {
            const response = await request(app)
                .get('/api/auth/me');
            
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('error', 'Authentication required');
        });
    });
});