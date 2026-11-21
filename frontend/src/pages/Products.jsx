import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts, fetchCategories } from '../api/products.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Products() {
  const [params] = useSearchParams();
  const initialQ = params.get('q') || '';
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState(initialQ);
  const [search, setSearch] = useState(initialQ.trim());
  const [category, setCategory] = useState(params.get('category') || '');
  const [sort, setSort] = useState('newest');
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], meta: null });

  // bottom sheet: edits are held in a draft until "Show results"
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftSort, setDraftSort] = useState('newest');
  const [draftInStock, setDraftInStock] = useState(false);

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

  // while the sheet is open: Esc closes it and the page behind does not scroll
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  const { loading, error, items, meta } = state;
  const activeFilters = (sort !== 'newest' ? 1 : 0) + (inStock ? 1 : 0);

  function pickCategory(id) {
    setCategory(id);
    setPage(1);
  }

  function openSheet() {
    setDraftSort(sort);
    setDraftInStock(inStock);
    setSheetOpen(true);
  }

  function applySheet() {
    setSort(draftSort);
    setInStock(draftInStock);
    setPage(1);
    setSheetOpen(false);
  }

  function resetSheet() {
    setDraftSort('newest');
    setDraftInStock(false);
  }

  return (
    <main className="container">
      <h1 className="page-title">All parts</h1>

      <div className="filter-row">
        <input
          className="search"
          type="search"
          placeholder="Search parts, e.g. Ryzen, RTX, DDR5…"
          aria-label="Search products"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="filter-btn" onClick={openSheet} aria-haspopup="dialog">
          <span aria-hidden="true">⚙️</span> Filters
          {activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
        </button>
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

      {sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-head">
              <h2>Filters</h2>
              <button type="button" className="sheet-close" onClick={() => setSheetOpen(false)} aria-label="Close filters">
                ✕
              </button>
            </div>

            <label className="sheet-field">
              <span>Sort by</span>
              <select className="select" value={draftSort} onChange={(e) => setDraftSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </label>

            <label className="sheet-check">
              <input
                type="checkbox"
                checked={draftInStock}
                onChange={(e) => setDraftInStock(e.target.checked)}
              />
              <span>In stock only</span>
            </label>

            <div className="sheet-actions">
              <button type="button" className="btn" onClick={resetSheet}>Reset</button>
              <button type="button" className="btn btn-primary" onClick={applySheet}>Show results</button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}