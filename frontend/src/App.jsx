import { useEffect, useState } from 'react';
import { api } from './api/client.js';

export default function App() {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    api('/health')
      .then((data) => setState({ loading: false, data }))
      .catch((error) => setState({ loading: false, error }));
  }, []);

  const up = state.data?.database === 'up';

  return (
    <main className="page">
      <h1>PC Parts Store</h1>
      <div className="card">
        <p className="label">API status</p>
        {state.loading && <p>Connecting…</p>}
        {state.error && <p className="bad">● Offline: {state.error.message}</p>}
        {state.data && (
          <p className={up ? 'good' : 'bad'}>
            ● {up ? 'Online, database connected' : 'Database down'}
          </p>
        )}
      </div>
    </main>
  );
}