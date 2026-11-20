import { randomUUID } from 'node:crypto';
import { PaymentProvider } from './PaymentProvider.js';
import { AppError } from '../../utils/errors.js';

/** Fake gateway for development and automated tests. Same contract as MayaProvider. */
export class MockProvider extends PaymentProvider {
  #sessions = new Map();
  #baseUrl;

  constructor({ baseUrl }) {
    super();
    this.#baseUrl = baseUrl;
  }

  get name() {
    return 'mock';
  }

  async createCheckoutSession(input) {
    const sessionId = `mock_${randomUUID()}`;
    this.#sessions.set(sessionId, {
      status: 'pending',
      amountCentavos: input.amountCentavos,
      currency: input.currency,
      reference: input.referenceNumber,
    });
    return {
      sessionId,
            checkoutUrl: `${this.#baseUrl}/mock-checkout/${sessionId}`,
      amountCentavos: input.amountCentavos,
      currency: input.currency,
    };
  }

  async retrievePayment(sessionId) {
    const s = this.#sessions.get(sessionId);
    if (!s) throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Unknown mock session');
    return { sessionId, ...s };
  }

  verifyWebhook(payload) {
    if (!payload || typeof payload !== 'object' || !payload.id || !payload.paymentStatus) {
      return null;
    }
    return {
      eventKey: `${payload.id}:${payload.paymentStatus}`,
      eventType: String(payload.paymentStatus),
      sessionId: String(payload.id),
    };
  }

  /** Test/demo helper (not part of the abstract contract). */
  simulate(sessionId, status, overrides = {}) {
    const s = this.#sessions.get(sessionId);
    if (!s) throw new AppError(404, 'NOT_FOUND', 'Unknown mock session');
    Object.assign(s, { status }, overrides);
  }
}