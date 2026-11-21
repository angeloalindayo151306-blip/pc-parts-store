import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProducts, fetchCategories } from '../api/products.js';
import ProductCard from '../components/ProductCard.jsx';
import { categoryIcon } from '../utils/format.js';

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState([]);
  const [state, setState] = useState({ loading: true, error: '', items: [] });

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProducts({ q: '', category: '', sort: 'newest', inStock: '', page: 1, limit: 6 })
      .then(({ items }) => !cancelled && setState({ loading: false, error: '', items }))
      .catch((e) => !cancelled && setState({ loading: false, error: e.message, items: [] }));
    return () => {
      cancelled = true;
    };
  }, []);

  function onSearch(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/products?q=${encodeURIComponent(term)}` : '/products');
  }

  const { loading, error, items } = state;

  return (
    <main className="container">
      <section className="hero">
        <h1>Build your <span className="grad">dream rig</span></h1>
        <p>CPUs, GPUs, RAM and more. Pick parts with confidence.</p>
      </section>

      <form className="home-search" onSubmit={onSearch}>
        <input
          className="search"
          type="search"
          placeholder="Search parts, e.g. Ryzen, RTX, DDR5…"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn" type="submit">Search</button>
      </form>

      {categories.length > 0 && (
        <>
          <div className="section-head">
            <h2>Shop by category</h2>
          </div>
          <div className="cat-tiles">
            {categories.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`} className="cat-tile">
                <span className="cat-icon">{categoryIcon(c.name)}</span>
                <span className="cat-name">{c.name}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="section-head">
        <h2>Newest parts</h2>
        <Link to="/products">View all →</Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <div className="grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton card-skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}