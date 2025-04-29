export class CookieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CookieError';
  }
}
