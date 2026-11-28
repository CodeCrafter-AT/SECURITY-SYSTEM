export class MiniKVError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class KeyNotFoundError extends MiniKVError {}
export class KeyExpiredError extends MiniKVError {}
export class InvalidRequestError extends MiniKVError {}
export class InvalidValueError extends MiniKVError {}
export class AuthenticationError extends MiniKVError {}
export class StorageError extends MiniKVError {}
export class MiniKVConnectionError extends MiniKVError {}
export class MiniKVTimeoutError extends MiniKVError {}

export function mapProtocolError(code: string, message: string): MiniKVError {
  switch (code) {
    case 'NOT_FOUND':
      return new KeyNotFoundError(message, code);
    case 'EXPIRED':
      return new KeyExpiredError(message, code);
    case 'INVALID_REQUEST':
      return new InvalidRequestError(message, code);
    case 'INVALID_VALUE':
      return new InvalidValueError(message, code);
    case 'AUTH_REQUIRED':
    case 'AUTH_FAILED':
      return new AuthenticationError(message, code);
    case 'STORAGE_ERROR':
      return new StorageError(message, code);
    default:
      return new MiniKVError(message, code);
  }
}
