import { api } from './client.js';

// Fake gateway calls. Used only by the dev-only /mock-checkout page.
export const getMockSession = (sessionId) => api(`/mock-checkout/${sessionId}`);

export const completeMockSession = (sessionId, outcome) =>
  api(`/mock-checkout/${sessionId}/complete`, { method: 'POST', body: { outcome } });