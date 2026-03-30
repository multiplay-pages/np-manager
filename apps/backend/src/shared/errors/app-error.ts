/**
 * Klasa błędów aplikacji.
 *
 * Używana do komunikowania znanych błędów biznesowych do klienta API.
 * Każdy AppError ma:
 *  - statusCode: kod HTTP odpowiedzi
 *  - code:       maszynowy kod błędu (używany przez frontend do i18n)
 *  - message:    czytelna wiadomość PL (bezpośrednio do użytkownika)
 *  - isOperational: true = błąd operacyjny (oczekiwany), false = błąd programistyczny
 *
 * Błędy nieoperacyjne (false) trafiają do logu ze stack trace.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }

  // ============================================================
  // Fabryki dla typowych błędów HTTP
  // ============================================================

  static badRequest(message: string, code = 'BAD_REQUEST'): AppError {
    return new AppError(message, 400, code)
  }

  static unauthorized(
    message = 'Wymagane zalogowanie. Sesja wygasła lub token jest nieprawidłowy.',
    code = 'UNAUTHORIZED',
  ): AppError {
    return new AppError(message, 401, code)
  }

  static forbidden(
    message = 'Brak uprawnień do wykonania tej operacji.',
    code = 'FORBIDDEN',
  ): AppError {
    return new AppError(message, 403, code)
  }

  static notFound(message = 'Nie znaleziono zasobu.', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code)
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code)
  }

  /**
   * Sprawa lub zasób jest zablokowany do edycji (np. zamknięta sprawa).
   */
  static locked(message: string, code = 'RESOURCE_LOCKED'): AppError {
    return new AppError(message, 423, code)
  }

  static tooManyRequests(
    message = 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.',
    code = 'TOO_MANY_REQUESTS',
  ): AppError {
    return new AppError(message, 429, code)
  }

  static internal(
    message = 'Wystąpił błąd serwera. Spróbuj ponownie lub skontaktuj się z administratorem.',
    code = 'INTERNAL_ERROR',
  ): AppError {
    return new AppError(message, 500, code, false)
  }
}
