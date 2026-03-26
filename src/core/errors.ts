export class ShoutrrrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShoutrrrError';
  }
}

export class UrlParseError extends ShoutrrrError {
  constructor(message: string) {
    super(message);
    this.name = 'UrlParseError';
  }
}

export class ServiceNotFoundError extends ShoutrrrError {
  public readonly scheme: string;

  constructor(scheme: string) {
    super(`Service not found for scheme: ${scheme}`);
    this.name = 'ServiceNotFoundError';
    this.scheme = scheme;
  }
}

export class SendError extends ShoutrrrError {
  public readonly service: string;
  public readonly cause?: Error;

  constructor(service: string, message: string, cause?: Error) {
    super(`[${service}] ${message}`);
    this.name = 'SendError';
    this.service = service;
    this.cause = cause;
  }
}
