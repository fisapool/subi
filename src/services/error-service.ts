export class ErrorService {
  private static instance: ErrorService;
  private errorHandlers: Map<string, (error: Error) => void> = new Map();

  private constructor() {}

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  public registerErrorHandler(type: string, handler: (error: Error) => void): void {
    this.errorHandlers.set(type, handler);
  }

  public handleError(error: Error, type: string = 'default'): void {
    console.error(`[${type}] Error:`, error);

    const handler = this.errorHandlers.get(type);
    if (handler) {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }
  }

  public handleNetworkError(error: Error): void {
    this.handleError(error, 'network');
  }

  public handleStorageError(error: Error): void {
    this.handleError(error, 'storage');
  }

  public handlePermissionError(error: Error): void {
    this.handleError(error, 'permission');
  }

  public handleValidationError(error: Error): void {
    this.handleError(error, 'validation');
  }

  public handleStateError(error: Error): void {
    this.handleError(error, 'state');
  }

  public handleMessageError(error: Error): void {
    this.handleError(error, 'message');
  }

  public handleFeatureError(error: Error): void {
    this.handleError(error, 'feature');
  }

  public handleCorruptedDataError(error: Error): void {
    this.handleError(error, 'corrupted_data');
  }

  public handleConcurrentModificationError(error: Error): void {
    this.handleError(error, 'concurrent_modification');
  }

  public handleExpiredSessionError(error: Error): void {
    this.handleError(error, 'expired_session');
  }

  public handleCookieError(error: Error): void {
    this.handleError(error, 'cookie');
  }

  public handleImportError(error: Error): void {
    this.handleError(error, 'import');
  }

  public handleExportError(error: Error): void {
    this.handleError(error, 'export');
  }

  public handleBackupError(error: Error): void {
    this.handleError(error, 'backup');
  }

  public handleRestoreError(error: Error): void {
    this.handleError(error, 'restore');
  }
} 