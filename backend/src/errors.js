export class ApiError extends Error {
  constructor(status, message, hint) {
    super(message);
    this.status = status;
    this.hint = hint;
  }
}
