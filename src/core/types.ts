/** Result of a send operation */
export interface SendResult {
  success: boolean;
  service: string;
  timestamp: Date;
  error?: Error;
}

/** Key-value params passed to services (Shoutrrr-compatible) */
export type Params = Record<string, string>;

/** Parsed URL components */
export interface ParsedUrl {
  scheme: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  path: string[];
  query: Params;
  raw: string;
}

/** Service instance -- sends messages */
export interface Service {
  send(message: string, params?: Params): Promise<SendResult>;
}

/** Service definition -- factory for creating service instances from URL */
export interface ServiceDefinition {
  readonly scheme: string;
  create(config: ParsedUrl): Service;
}
