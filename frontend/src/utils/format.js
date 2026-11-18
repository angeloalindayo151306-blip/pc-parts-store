export function peso(centavos) {
  return (
    '₱' +
    (Number(centavos || 0) / 100).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const ICONS = {
  CPU: '🧠',
  Motherboard: '🔌',
  RAM: '💾',
  GPU: '🎮',
  Storage: '💽',
  PSU: '⚡',
};

export function categoryIcon(name) {
  return ICONS[name] || '🖥️';
}