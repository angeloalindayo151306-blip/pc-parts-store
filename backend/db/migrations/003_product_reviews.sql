CREATE TABLE IF NOT EXISTS product_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- One review per customer per product.
CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_one_per_user_product
  ON product_reviews (user_id, product_id);

-- Fast average rating and review list per product.
CREATE INDEX IF NOT EXISTS product_reviews_product_idx
  ON product_reviews (product_id, created_at DESC);