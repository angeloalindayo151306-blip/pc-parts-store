import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';

// Sample data. In Phase 2 this comes from the database.
const SAMPLE = [
  { id: 1, icon: '🧠', category: 'CPU', name: 'AMD Ryzen 5 5600 6-Core', price_centavos: 849500, stock: 12 },
  { id: 2, icon: '🎮', category: 'GPU', name: 'NVIDIA GeForce RTX 4060 8GB', price_centavos: 1899500, stock: 4 },
  { id: 3, icon: '🧩', category: 'Motherboard', name: 'MSI B550M PRO-VDH WiFi', price_centavos: 625000, stock: 9 },
  { id: 4, icon: '⚡', category: 'RAM', name: 'Corsair Vengeance 16GB DDR4 3200', price_centavos: 195000, stock: 30 },
  { id: 5, icon: '💾', category: 'Storage', name: 'Kingston NV2 1TB NVMe SSD', price_centavos: 320000, stock: 0 },
  { id: 6, icon: '🔌', category: 'PSU', name: 'Cooler Master 650W 80+ Bronze', price_centavos: 345000, stock: 15 },
];
const CATEGORIES = ['All', 'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU'];

export default function Home() {
  const [apiUp, setApiUp] = useState(null); // null = checking
  const [category, setCategory] = useState('All');

  useEffect(() => {
    api('/health')
      .then((d) => setApiUp(d.database === 'up'))
      .catch(() => setApiUp(false));
  }, []);

  const shown = category === 'All' ? SAMPLE : SAMPLE.filter((p) => p.category === category);

  return (
    <main className="container">
      <section className="hero">
        <h1>Build your <span className="glow">dream PC</span>, part by part.</h1>
        <p>Genuine components, compatibility-checked builds, and an AI advisor to help you pick the right parts for your budget.</p>
        <div className="hero-actions">
          <button className="btn btn-primary">Shop parts</button>
          <button className="btn">Build a PC</button>
          <span className={`status ${apiUp === null ? '' : apiUp ? 'up' : 'down'}`}>
            <span className="dot" />
            {apiUp === null ? 'Connecting…' : apiUp ? 'API online' : 'API offline'}
          </span>
        </div>
      </section>

      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${c === category ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <h2 className="section-title">Featured parts</h2>
      <div className="grid">
        {shown.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </main>
  );
}