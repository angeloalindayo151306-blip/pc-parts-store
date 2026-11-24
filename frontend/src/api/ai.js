import { api } from './client.js';

// Returns { source, model, summary, items, totalCentavos, budgetCentavos, notes }.
// source is 'gemini' or 'fallback'. The server checks every item against the store's stock and prices.
export const recommendBuild = (payload, signal) =>
  api('/ai/recommend-build', { method: 'POST', body: payload, signal });