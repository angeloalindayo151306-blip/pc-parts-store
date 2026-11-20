/**
 * Abstract base class for payment gateways (Strategy + Factory target).
 *
 * Normalized contracts (every provider returns these shapes):
 *   createCheckoutSession(input) -> { sessionId, checkoutUrl, amountCentavos, currency }
 *   retrievePayment(sessionId)   -> { sessionId, status, amountCentavos, currency, reference }
 *        status is one of: 'paid' | 'failed' | 'cancelled' | 'expired' | 'pending'
 *   verifyWebhook(payload)       -> { eventKey, eventType, sessionId } or null (unknown event)
 */
function notImplemented(cls, method) {
  throw new TypeError(`${cls}.${method}() is abstract and must be implemented by a subclass`);
}

export class PaymentProvider {
  constructor() {
    if (new.target === PaymentProvider) {
      throw new TypeError('PaymentProvider is abstract and cannot be instantiated directly');
    }
  }

  get name() {
    return notImplemented(this.constructor.name, 'name');
  }

  async createCheckoutSession(_input) {
    return notImplemented(this.constructor.name, 'createCheckoutSession');
  }

  async retrievePayment(_sessionId) {
    return notImplemented(this.constructor.name, 'retrievePayment');
  }

  verifyWebhook(_payload) {
    return notImplemented(this.constructor.name, 'verifyWebhook');
  }
}