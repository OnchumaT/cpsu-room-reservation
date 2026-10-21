import { createApp } from './app.js';
import { createContainer } from './container.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { startReminderJob } from './jobs/reminderJob.js';
import { startFacilityRequestReminderJob } from './jobs/facilityRequestReminderJob.js';
import { startExpireBookingsJob } from './jobs/expireBookingsJob.js';
import { startNoShowJob } from './jobs/noShowJob.js';

const container = createContainer();
const app = createApp(container);

const server = app.listen(env.port, env.host, () => {
  console.log(`CPSU Room Reservation API listening on http://localhost:${env.port}`);
});

const stopReminderJob = startReminderJob(container.repositories);
const stopFacilityRequestReminderJob = startFacilityRequestReminderJob(container.repositories);
const stopExpireBookingsJob = startExpireBookingsJob(container.repositories);
const stopNoShowJob = startNoShowJob(container.repositories);

function shutdown() {
  stopReminderJob();
  stopFacilityRequestReminderJob();
  stopExpireBookingsJob();
  stopNoShowJob();
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
