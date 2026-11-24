// Rule-based builder used when Gemini is unavailable or returns something we reject.
// Pure function: no network, no database.

const SHARES = {
  gaming: { CPU: 0.2, Motherboard: 0.15, RAM: 0.1, GPU: 0.35, PSU: 0.1, Storage: 0.1 },
  editing: { CPU: 0.3, Motherboard: 0.15, RAM: 0.2, GPU: 0.15, PSU: 0.08, Storage: 0.12 },
  office: { CPU: 0.3, Motherboard: 0.2, RAM: 0.15, GPU: 0.1, PSU: 0.12, Storage: 0.13 },
};

export const USE_CASES = Object.keys(SHARES);

const spec = (p, key) => p?.specs?.[key];

// Best part inside its budget share; if none fits, the cheapest one that still fits what is left.
function choose(products, category, share, remaining, predicate = () => true) {
  const candidates = products.filter(
    (p) => p.category === category && p.stock > 0 && predicate(p)
  );
  const limit = Math.min(share, remaining);
  const inShare = candidates
    .filter((p) => p.price_centavos <= limit)
    .sort((a, b) => b.price_centavos - a.price_centavos);
  if (inShare[0]) return inShare[0];
  const cheaper = candidates
    .filter((p) => p.price_centavos <= remaining)
    .sort((a, b) => a.price_centavos - b.price_centavos);
  return cheaper[0] || null;
}

export function buildFallback(products, { budgetCentavos, useCase }) {
  const shares = SHARES[useCase] || SHARES.gaming;
  const share = (category) => Math.floor(budgetCentavos * shares[category]);
  const lines = [];
  const notes = [];
  let remaining = budgetCentavos;

  const take = (product, reason) => {
    lines.push({ product, reason });
    remaining -= product.price_centavos;
  };

  const cpu = choose(products, 'CPU', share('CPU'), remaining);
  if (!cpu) return { lines: [], notes: ['No CPU fits this budget.'] };
  take(cpu, `Best CPU for a ${useCase} build within your budget.`);

  const mobo = choose(
    products,
    'Motherboard',
    share('Motherboard'),
    remaining,
    (p) => spec(p, 'socket') === spec(cpu, 'socket')
  );
  if (!mobo) return { lines: [], notes: [`No ${spec(cpu, 'socket')} motherboard fits this budget.`] };
  take(mobo, `Matches the ${spec(cpu, 'socket')} socket of the CPU.`);

  const ram = choose(
    products,
    'RAM',
    share('RAM'),
    remaining,
    (p) => spec(p, 'ram_type') === spec(mobo, 'ram_type')
  );
  if (!ram) return { lines: [], notes: [`No ${spec(mobo, 'ram_type')} RAM fits this budget.`] };
  take(ram, `${spec(mobo, 'ram_type')} memory that the motherboard supports.`);

  const gpu = choose(products, 'GPU', share('GPU'), remaining);
  if (gpu) take(gpu, `Best graphics card for a ${useCase} build within your budget.`);
  else notes.push('No graphics card fits what is left of the budget.');

  const neededWatts = (spec(cpu, 'tdp_watts') || 0) + (spec(gpu, 'tdp_watts') || 0) + 150;
  const psu = choose(
    products,
    'PSU',
    share('PSU'),
    remaining,
    (p) => (spec(p, 'wattage') || 0) >= neededWatts
  );
  if (psu) take(psu, `${spec(psu, 'wattage')}W covers the parts (about ${neededWatts}W needed).`);
  else notes.push(`No power supply of at least ${neededWatts}W fits what is left of the budget.`);

  const storage = choose(products, 'Storage', share('Storage'), remaining);
  if (storage) take(storage, 'Storage that fits the remaining budget.');
  else notes.push('No storage drive fits what is left of the budget.');

  return { lines, notes };
}