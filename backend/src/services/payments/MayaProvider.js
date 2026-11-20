import { PaymentProvider } from './PaymentProvider.js';
import { AppError } from '../../utils/errors.js';

export const toPesos = (centavos) => Number((centavos / 100).toFixed(2));
export const toCentavos = (pesos) => Math.round(Number(pesos) * 100);

const TIMEOUT_MS = 10_000;

export class MayaProvider extends PaymentProvider {
  #baseUrl;
  #publicKey;
  #secretKey;

  constructor({ baseUrl, publicKey, secretKey }) {
    super();
    if (!publicKey || !secretKey) {
      throw new Error('MayaProvider requires MAYA_PUBLIC_KEY and MAYA_SECRET_KEY');
    }
    this.#baseUrl = baseUrl;
    this.#publicKey = publicKey;
    this.#secretKey = secretKey;
  }

  get name() {
    return 'maya';
  }

  /** Pure function (no network): builds the Maya request body from our normalized input. */
  buildCheckoutBody(input) {
    const { amountCentavos, subtotalCentavos, discountCentavos, shippingCentavos } = input;
    const itemsSum = input.items.reduce((s, i) => s + i.unitPriceCentavos * i.quantity, 0);
    if (
      itemsSum !== subtotalCentavos ||
      subtotalCentavos - discountCentavos + shippingCentavos !== amountCentavos
    ) {
      throw new AppError(500, 'PAYMENT_AMOUNT_MISMATCH', 'Order totals are inconsistent');
    }

    const [firstName, ...rest] = (input.buyer.name || 'Customer').trim().split(/\s+/);
    return {
      totalAmount: {
        value: toPesos(amountCentavos),
        currency: input.currency,
        details: {
          subtotal: toPesos(subtotalCentavos),
          discount: toPesos(discountCentavos),
          shippingFee: toPesos(shippingCentavos),
        },
      },
      buyer: {
        firstName,
        lastName: rest.join(' ') || '-',
        contact: { phone: input.buyer.phone, email: input.buyer.email },
      },
      items: input.items.map((i) => ({
        name: i.name.slice(0, 255),
        code: i.code,
        quantity: i.quantity,
        amount: { value: toPesos(i.unitPriceCentavos) },
        totalAmount: { value: toPesos(i.unitPriceCentavos * i.quantity) },
      })),
      redirectUrl: input.redirectUrls,
      requestReferenceNumber: input.referenceNumber,
      metadata: input.metadata || {},
    };
  }

  async createCheckoutSession(input) {
    const body = this.buildCheckoutBody(input);
    const res = await this.#request('POST', '/checkout/v1/checkouts', this.#publicKey, body);
    if (!res?.checkoutId || !res?.redirectUrl) {
      throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Payment gateway returned an invalid response');
    }
    return {
      sessionId: res.checkoutId,
      checkoutUrl: res.redirectUrl,
      amountCentavos: input.amountCentavos,
      currency: input.currency,
    };
  }

  async retrievePayment(sessionId) {
    const res = await this.#request(
      'GET',
      `/checkout/v1/checkouts/${encodeURIComponent(sessionId)}`,
      this.#secretKey,
    );
    return {
      sessionId: res.id || sessionId,
      status: MayaProvider.#mapStatus(res.paymentStatus),
      amountCentavos: toCentavos(res.totalAmount?.value),
      currency: res.totalAmount?.currency || null,
      reference: res.requestReferenceNumber || null,
    };
  }

  verifyWebhook(payload) {
    if (!payload || typeof payload !== 'object' || !payload.id || !payload.paymentStatus) {
      return null; // unknown event: ignore
    }
    return {
      eventKey: `${payload.id}:${payload.paymentStatus}`,
      eventType: String(payload.paymentStatus),
      sessionId: String(payload.id),
    };
  }

  /** Strict mapping: only an exact PAYMENT_SUCCESS is 'paid'. Unknown values stay 'pending'. */
  static #mapStatus(raw) {
    const s = String(raw || '').toUpperCase();
    if (s === 'PAYMENT_SUCCESS') return 'paid';
    if (s === 'PAYMENT_FAILED') return 'failed';
    if (s === 'PAYMENT_EXPIRED') return 'expired';
    if (s.includes('CANCEL')) return 'cancelled';
    return 'pending';
  }

  async #request(method, path, key, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.#baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* non-JSON body */
      }
      if (!res.ok) {
        throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Payment gateway rejected the request', {
          gatewayStatus: res.status,
          gatewayCode: json?.code || null,
        });
      }
      return json;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const timedOut = err?.name === 'AbortError';
      throw new AppError(
        502,
        'PAYMENT_GATEWAY_ERROR',
        timedOut ? 'Payment gateway timed out' : 'Payment gateway is unreachable',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}