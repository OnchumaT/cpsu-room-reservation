import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  seedDefaultPassword: process.env.SEED_DEFAULT_PASSWORD || 'Passw0rd!',
  etherealUser: process.env.ETHEREAL_USER || '',
  etherealPass: process.env.ETHEREAL_PASS || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
};
