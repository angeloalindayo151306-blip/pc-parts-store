import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { withTransaction } from '../utils/transaction.js';
import { lockOrder } from './orderWorkflow.js';
import { getPaymentProvider } from './payments/paymentFactory.js';
import * as repo from '../repositories/payment.repository.js';

const CURRENCY = 'PHP';

// The order row stays locked while we talk to the gateway. That is deliberate:
// two simultaneous "Pay" clicks run one after the other, so the second one
// finds the first session and reuses it instead of creating a duplicate.
export async function startPayment(userId, orderId) {
  const provider = getPaymentProvider();

  return withTransaction(async (client) => {
    const locked = await lockOrder(client, orderId, userId);
    if (!locked) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    if (locked.status !== 'pending_payment') {
      throw new AppError(409, 'ORDER_NOT_PAYABLE', `A ${locked.status} order cannot be paid`, {
        status: locked.status,
      });
    }
    if (!(await repo.reservationActive(client, orderId))) {
      throw new AppError(
        409,
        'RESERVATION_EXPIRED',
        'The stock hold for this order has expired. Please place the order again.'
      );
    }

    const pending = await repo.findPendingPayment(client, orderId);
    if (pending) {
      if (pending.provider === provider.name && pending.checkout_url) {
        return {
          checkoutUrl: pending.checkout_url,
          provider: pending.provider,
          paymentId: pending.id,
          reused: true,
        };
      }
      await repo.setPaymentStatus(client, pending.id, 'expired'); // provider changed
    }

    const order = await repo.orderForPayment(client, orderId);
    const items = await repo.itemsForPayment(client, orderId);
    const email = await repo.userEmail(client, userId);
    const addr = order.shipping_address;
    const base = env.frontendUrl;

    // Every amount comes from the database. The client sends none.
    const session = await provider.createCheckoutSession({
      amountCentavos: order.total_centavos,
      subtotalCentavos: order.subtotal_centavos,
      discountCentavos: order.discount_centavos,
      shippingCentavos: order.shipping_centavos,
      currency: CURRENCY,
      referenceNumber: orderId,
      items: items.map((i) => ({
        name: i.product_name,
        code: i.product_id,
        quantity: i.quantity,
        unitPriceCentavos: i.unit_price_centavos,
      })),
      buyer: { name: addr.fullName, phone: addr.phone, email },
      redirectUrls: {
        success: `${base}/payment/success?order=${orderId}`,
        failure: `${base}/payment/cancelled?order=${orderId}&reason=failed`,
        cancel: `${base}/payment/cancelled?order=${orderId}`,
      },
      metadata: { orderId },
    });

    const paymentId = await repo.insertPayment(client, {
      orderId,
      provider: provider.name,
      sessionId: session.sessionId,
      amountCentavos: session.amountCentavos,
      currency: session.currency,
      checkoutUrl: session.checkoutUrl,
    });

    return {
      checkoutUrl: session.checkoutUrl,
      provider: provider.name,
      paymentId,
      reused: false,
    };
  });
}