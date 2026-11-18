import { useEffect, useState } from 'react';
import { fetchProducts, fetchCategories } from '../api/products.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], meta: null });

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  // wait 350ms after typing stops before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetchProducts({
      q: search,
      category,
      sort,
      inStock: inStock ? 'true' : '',
      page,
      limit: 12,
    })
      .then(({ items, meta }) => !cancelled && setState({ loading: false, error: '', items, meta }))
      .catch((e) =>
        !cancelled && setState({ loading: false, error: e.message, items: [], meta: null })
      );
    return () => {
      cancelled = true;
    };
  }, [search, category, sort, inStock, page]);

  const { loading, error, items, meta } = state;

  function pickCategory(id) {
    setCategory(id);
    setPage(1);
  }

  return (
    <main className="container">
      <section className="hero">
        <h1>Build your <span className="grad">dream rig</span></h1>
        <p>CPUs, GPUs, RAM and more. Pick parts with confidence.</p>
      </section>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search parts, e.g. Ryzen, RTX, DDR5…"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name_asc">Name: A to Z</option>
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => {
              setInStock(e.target.checked);
              setPage(1);
            }}
          />
          In stock only
        </label>
      </div>

      <div className="chips">
        <button className={'chip' + (category === '' ? ' active' : '')} onClick={() => pickCategory('')}>
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={'chip' + (String(category) === String(c.id) ? ' active' : '')}
            onClick={() => pickCategory(c.id)}
          >
            {c.name} <small>({c.product_count})</small>
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading && items.length === 0 ? (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton card-skeleton" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <p className="empty">No products match your search.</p>
      ) : (
        <div className={'grid' + (loading ? ' dim' : '')}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="pagination">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Prev
          </button>
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} products
          </span>
          <button className="btn" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </main>
  );
}