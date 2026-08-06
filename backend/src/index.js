import { createApp } from './app.js';
import { createContainer } from './container.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { startReminderJob } from './jobs/reminderJob.js';

const container = createContainer();
const app = createApp(container);

const server = app.listen(env.port, () => {
  console.log(`CPSU Room Reservation API listening on http://localhost:${env.port}`);
});

const stopReminderJob = startReminderJob(container.repositories);

function shutdown() {
  stopReminderJob();
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
