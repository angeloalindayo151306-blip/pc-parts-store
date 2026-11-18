// Money is stored as integer centavos. Convert only when displaying.
const peso = (centavos) =>
  '₱' + (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });

export default function ProductCard({ product }) {
  const low = product.stock > 0 && product.stock <= 5;
  return (
    <article className="product-card">
      <div className="product-thumb">{product.icon}</div>
      <div className="product-body">
        <span className="product-cat">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <span className={`product-stock ${low ? 'low' : ''}`}>
          {product.stock === 0 ? 'Out of stock' : low ? `Only ${product.stock} left` : 'In stock'}
        </span>
        <div className="product-price">{peso(product.price_centavos)}</div>
        <button className="btn btn-primary" disabled={product.stock === 0}>Add to cart</button>
      </div>
    </article>
  );
}