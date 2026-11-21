import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProduct } from '../api/products.js';
import { peso, categoryIcon } from '../utils/format.js';
import AddToCartButton from '../components/AddToCartButton.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', product: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: '', product: null });
    fetchProduct(id)
      .then((product) => !cancelled && setState({ loading: false, error: '', product }))
      .catch((e) =>
        !cancelled &&
        setState({
          loading: false,
          error: e.code === 'PRODUCT_NOT_FOUND' ? 'This product does not exist.' : e.message,
          product: null,
        })
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { loading, error, product } = state;

  return (
    <main className={'container detail-page' + (product ? ' has-sticky-bar' : '')}>
      <Link to="/products" className="back-link">← Back to catalog</Link>
      {loading && <div className="skeleton detail-skeleton" />}
      {error && <p className="form-error">{error}</p>}
      {product && (() => {
        const catName =
          typeof product.category === 'string' ? product.category : product.category_name;
        const specs = product.specs && typeof product.specs === 'object' ? product.specs : {};
        const out = product.stock <= 0;
        return (
          <>
            <div className="detail">
              <div className="detail-media">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} />
                ) : (
                  <span className="detail-icon">{categoryIcon(catName)}</span>
                )}
              </div>
              <div className="detail-info">
                {catName && <span className="badge">{catName}</span>}
                <h1>{product.name}</h1>
                <p className="detail-price">{peso(product.price_centavos)}</p>
                <p className={out ? 'stock out' : 'stock in'}>
                  {out ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
                </p>
                {product.description && <p className="detail-desc">{product.description}</p>}
                {Object.keys(specs).length > 0 && (
                  <table className="specs">
                    <tbody>
                      {Object.entries(specs).map(([k, v]) => (
                        <tr key={k}>
                          <th>{k.replace(/_/g, ' ')}</th>
                          <td>{String(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="sticky-bar">
              <div className="sticky-bar-info">
                <span>Price</span>
                <strong>{peso(product.price_centavos)}</strong>
              </div>
              <div className="sticky-bar-action">
                <AddToCartButton product={product} />
              </div>
            </div>
          </>
        );
      })()}
    </main>
  );
}