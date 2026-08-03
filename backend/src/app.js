import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env.js';
import { createContainer } from './container.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import { authRoutes } from './routes/auth.routes.js';
import { roomRoutes } from './routes/rooms.routes.js';
import { bookingRoutes } from './routes/bookings.routes.js';
import { facilityRequestRoutes } from './routes/facilityRequests.routes.js';
import { templateRoutes } from './routes/templates.routes.js';
import { notificationRoutes } from './routes/notifications.routes.js';
import { userRoutes } from './routes/users.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { managementPositionRoutes } from './routes/managementPositions.routes.js';
import { auditLogRoutes } from './routes/auditLogs.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';

export function createApp() {
  const container = createContainer();

  const app = express();
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes(container));
  app.use('/api/rooms', roomRoutes(container));
  app.use('/api/bookings', bookingRoutes(container));
  app.use('/api/facility-requests', facilityRequestRoutes(container));
  app.use('/api/templates', templateRoutes(container));
  app.use('/api/notifications', notificationRoutes(container));
  app.use('/api/users', userRoutes(container));
  app.use('/api/settings', settingsRoutes(container));
  app.use('/api/management-positions', managementPositionRoutes(container));
  app.use('/api/audit-logs', auditLogRoutes(container));
  app.use('/api/dashboard', dashboardRoutes(container));
  app.use('/api/analytics', analyticsRoutes(container));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
