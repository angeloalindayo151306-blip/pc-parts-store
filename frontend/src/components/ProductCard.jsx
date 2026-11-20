import { Link } from 'react-router-dom';
import { peso, categoryIcon } from '../utils/format.js';
import AddToCartButton from './AddToCartButton.jsx';

export default function ProductCard({ product }) {
  const catName =
    typeof product.category === 'string' ? product.category : product.category_name;
  const out = product.stock <= 0;

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="pc-link">
        <div className="product-thumb">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" />
          ) : (
            <span className="pc-icon">{categoryIcon(catName)}</span>
          )}
        </div>
        <div className="pc-body">
          {catName && <span className="badge">{catName}</span>}
          <h3 className="pc-name">{product.name}</h3>
          <div className="pc-row">
            <span className="pc-price">{peso(product.price_centavos)}</span>
            <span className={out ? 'stock out' : 'stock in'}>
              {out ? 'Out of stock' : 'In stock'}
            </span>
          </div>
        </div>
      </Link>
      <div className="pc-actions">
        <AddToCartButton product={product} />
      </div>
    </article>
  );
}