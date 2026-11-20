import assert from 'node:assert/strict';
import { PaymentProvider } from '../src/services/payments/PaymentProvider.js';
import { MayaProvider, toPesos, toCentavos } from '../src/services/payments/MayaProvider.js';
import { getPaymentProvider } from '../src/services/payments/paymentFactory.js';

let n = 0;
const ok = (msg) => console.log(`ok ${++n} - ${msg}`);

// 1. abstract class cannot be instantiated
assert.throws(() => new PaymentProvider(), TypeError);
ok('PaymentProvider is abstract');

// 2. subclass missing methods fails loudly
class Bad extends PaymentProvider {}
await assert.rejects(() => new Bad().createCheckoutSession({}), TypeError);
assert.throws(() => new Bad().verifyWebhook({}), TypeError);
ok('unimplemented abstract methods throw');

// 3. money conversion
assert.equal(toPesos(195000), 1950);
assert.equal(toCentavos(1950.5), 195050);
assert.equal(toCentavos(19.99), 1999);
ok('peso/centavo conversion');

// 4. mock provider lifecycle
const mock = getPaymentProvider('mock');
assert.equal(mock, getPaymentProvider('mock'));
const s = await mock.createCheckoutSession({ amountCentavos: 50000, currency: 'PHP', referenceNumber: 'REF1' });
assert.equal((await mock.retrievePayment(s.sessionId)).status, 'pending');
mock.simulate(s.sessionId, 'paid');
const p = await mock.retrievePayment(s.sessionId);
assert.equal(p.status, 'paid');
assert.equal(p.amountCentavos, 50000);
assert.deepEqual(mock.verifyWebhook({ id: s.sessionId, paymentStatus: 'PAYMENT_SUCCESS' }).sessionId, s.sessionId);
assert.equal(mock.verifyWebhook({ foo: 'bar' }), null);
ok('mock provider: create, retrieve, simulate, webhook parse, unknown event ignored');

// 5. factory
assert.throws(() => getPaymentProvider('nope'), /Unknown PAYMENT_PROVIDER/);
assert.ok(mock instanceof PaymentProvider);
ok('factory rejects unknown provider; mock is a PaymentProvider');

// 6. Maya body (no network, fake keys)
const maya = new MayaProvider({ baseUrl: 'http://localhost:1', publicKey: 'pk-fake', secretKey: 'sk-fake' });
assert.ok(maya instanceof PaymentProvider);
const input = {
  amountCentavos: 215000 - 21500 + 15000,
  subtotalCentavos: 215000,
  discountCentavos: 21500,
  shippingCentavos: 15000,
  currency: 'PHP',
  referenceNumber: 'PCP-1',
  items: [
    { name: 'RAM', code: 'p1', quantity: 2, unitPriceCentavos: 100000 },
    { name: 'Cable', code: 'p2', quantity: 1, unitPriceCentavos: 15000 },
  ],
  buyer: { name: 'Juan Dela Cruz', phone: '09171234567', email: 'a@b.com' },
  redirectUrls: { success: 'x', failure: 'y', cancel: 'z' },
};
const body = maya.buildCheckoutBody(input);
assert.equal(body.totalAmount.value, 2085);
assert.equal(body.buyer.firstName, 'Juan');
assert.equal(body.items[0].totalAmount.value, 2000);
assert.throws(() => maya.buildCheckoutBody({ ...input, amountCentavos: 1 }), /inconsistent/);
ok('Maya body is built correctly and inconsistent totals are rejected');

console.log(`\nAll ${n} checks passed`);
process.exit(0);