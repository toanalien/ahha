import { describe, it, expect, beforeEach } from 'vitest';

// We test the registry through re-importing to get a fresh module
// Since registry is module-scoped, we test via the public API after services import
describe('service-registry (via services import)', () => {
  it('has services registered after import', async () => {
    // Import services to trigger registration
    await import('../../src/services/index.js');
    const { listServices, hasService, getService } = await import('../../src/core/service-registry.js');

    expect(listServices()).toContain('slack');
    expect(listServices()).toContain('discord');
    expect(listServices()).toContain('telegram');
    expect(listServices()).toContain('smtp');
    expect(listServices()).toContain('generic');
    expect(listServices()).toContain('ntfy');
  });

  it('hasService returns true for registered services', async () => {
    await import('../../src/services/index.js');
    const { hasService } = await import('../../src/core/service-registry.js');

    expect(hasService('slack')).toBe(true);
    expect(hasService('nonexistent')).toBe(false);
  });

  it('getService returns a ServiceDefinition', async () => {
    await import('../../src/services/index.js');
    const { getService } = await import('../../src/core/service-registry.js');

    const slack = getService('slack');
    expect(slack).toBeDefined();
    expect(slack!.scheme).toBe('slack');
    expect(typeof slack!.create).toBe('function');
  });

  it('registerService adds custom service', async () => {
    const { registerService, hasService } = await import('../../src/core/service-registry.js');

    registerService({
      scheme: 'custom-test',
      create: () => ({
        send: async () => ({
          success: true,
          service: 'custom-test',
          timestamp: new Date(),
        }),
      }),
    });

    expect(hasService('custom-test')).toBe(true);
  });
});
