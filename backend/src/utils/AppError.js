// Thrown by controllers/use-cases for expected failure conditions
// (validation, not-found, conflict, forbidden). errorHandler.js turns
// this into a consistent { error: { message, details } } JSON response.
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) { return new AppError(400, message, details); }
  static unauthorized(message = 'Unauthorized') { return new AppError(401, message); }
  static forbidden(message = 'Forbidden') { return new AppError(403, message); }
  static notFound(message = 'Not found') { return new AppError(404, message); }
  static conflict(message, details) { return new AppError(409, message, details); }
}
