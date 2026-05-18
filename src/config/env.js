// ============================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================

const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

function validateEnv() {
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.error(`❌ Missing required environment variable: ${envVar}`);
            process.exit(1);
        }
    }
    console.log('✅ Environment variables validated');
}

module.exports = { validateEnv };