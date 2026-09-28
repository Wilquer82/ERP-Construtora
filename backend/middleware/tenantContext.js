import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantContext = new AsyncLocalStorage();

export function currentTenant() {
  return tenantContext.getStore() || null;
}

export function runWithTenant(context, callback) {
  return tenantContext.run(context, callback);
}
