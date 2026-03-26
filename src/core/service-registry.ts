import type { ServiceDefinition } from './types.js';

const registry = new Map<string, ServiceDefinition>();

/** Register a service definition by its scheme */
export function registerService(definition: ServiceDefinition): void {
  registry.set(definition.scheme, definition);
}

/** Get a service definition by scheme */
export function getService(scheme: string): ServiceDefinition | undefined {
  return registry.get(scheme);
}

/** List all registered service schemes */
export function listServices(): string[] {
  return Array.from(registry.keys());
}

/** Check if a service scheme is registered */
export function hasService(scheme: string): boolean {
  return registry.has(scheme);
}
