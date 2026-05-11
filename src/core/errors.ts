export type ErrorCode =
  | "PERMISSION_DENIED"
  | "PATH_BLOCKED"
  | "COMMAND_NOT_ALLOWED"
  | "FILE_NOT_FOUND"
  | "FILE_READ_ERROR"
  | "FILE_WRITE_ERROR"
  | "NETWORK_ERROR"
  | "PROCESS_ERROR"
  | "STORAGE_ERROR"
  | "EMBED_ERROR"
  | "MODULE_NOT_FOUND"
  | "MANIFEST_INVALID"
  | "LIFECYCLE_ERROR"
  | "IPC_TIMEOUT"
  | "INTERNAL_ERROR";

export interface AppError {
  code: ErrorCode;
  message: string;
  moduleId?: string;
  instanceId?: string;
  cause?: unknown;
}

export class ModuleError extends Error {
  public readonly moduleId: string;
  public readonly code: ErrorCode;
  public readonly cause?: unknown;

  constructor(
    moduleId: string,
    code: ErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "ModuleError";
    this.moduleId = moduleId;
    this.code = code;
    this.cause = cause;
  }

  toAppError(): AppError {
    return {
      code: this.code,
      message: this.message,
      moduleId: this.moduleId,
      cause: this.cause,
    };
  }
}
