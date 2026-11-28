export declare class MiniKVError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
}
export declare class KeyNotFoundError extends MiniKVError {
}
export declare class KeyExpiredError extends MiniKVError {
}
export declare class InvalidRequestError extends MiniKVError {
}
export declare class InvalidValueError extends MiniKVError {
}
export declare class AuthenticationError extends MiniKVError {
}
export declare class StorageError extends MiniKVError {
}
export declare class MiniKVConnectionError extends MiniKVError {
}
export declare class MiniKVTimeoutError extends MiniKVError {
}
export declare function mapProtocolError(code: string, message: string): MiniKVError;
