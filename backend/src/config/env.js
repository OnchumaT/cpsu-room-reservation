import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '127.0.0.1',
  // Number of proxies in front of the API (0 = none). See app.js.
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  seedDefaultPassword: process.env.SEED_DEFAULT_PASSWORD || 'Passw0rd!',
  // Development only: check password logins against the Cloud copy of the
  // users table (backend/.env.sync.local) instead of this database — set on
  // a developer's machine whose local database holds synced, password-masked
  // users. Off by default, so a real server whose MySQL simply runs on
  // localhost checks passwords against its own database.
  loginAgainstCloud: process.env.LOGIN_AGAINST_CLOUD === '1',
  // Real mail server for notification emails (e.g. smtp.gmail.com with an
  // app password, or the university's relay). When SMTP_HOST is unset the
  // Ethereal test sandbox below is used instead, and with neither set no
  // email is sent (it waits in email_outbox, expiring after a day).
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || '"CPSU Room Reservation" <no-reply@cpsu-room-reservation.local>',
  // Linked from every notification email ("เปิดระบบจองห้อง").
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  etherealUser: process.env.ETHEREAL_USER || '',
  etherealPass: process.env.ETHEREAL_PASS || '',
  // Not a secret — an OAuth Client ID is meant to be public (every visitor's
  // browser already sees it embedded in the frontend bundle); the actual
  // security boundary is the Authorized JavaScript origins allowlist in
  // Google Cloud Console, not hiding this value. Defaulted here (rather
  // than left to .env, which .gitignore keeps out of every fresh clone) so
  // Google Sign-In works out of the box on any machine that clones this
  // repo, without a manual per-machine setup step.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '259562354585-ic65v7nsv6ue5mppeeflu8aclvm9sog3.apps.googleusercontent.com',
};
