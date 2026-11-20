ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_url text;

-- At most one live payment session per order.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_per_order
  ON payments (order_id) WHERE status = 'pending';