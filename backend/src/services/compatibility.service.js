// L3 compatibility rules. Pure function: no network, no database.
// Takes parts shaped like { name, category, specs } and returns a list of problems.
// Same headroom the keyword fallback uses when it picks a PSU.
export const PSU_HEADROOM_WATTS = 150;

const specOf = (part, key) => part?.specs?.[key];
const known = (v) => v !== undefined && v !== null && v !== '';
const norm = (v) => String(v).trim().toLowerCase();
const inCategory = (parts, category) => parts.filter((p) => p.category === category);

export function checkCompatibility(parts) {
  const issues = [];
  const cpus = inCategory(parts, 'CPU');
  const boards = inCategory(parts, 'Motherboard');
  const rams = inCategory(parts, 'RAM');
  const gpus = inCategory(parts, 'GPU');
  const psus = inCategory(parts, 'PSU');

  for (const cpu of cpus) {
    for (const board of boards) {
      const a = specOf(cpu, 'socket');
      const b = specOf(board, 'socket');
      if (known(a) && known(b) && norm(a) !== norm(b)) {
        issues.push({
          code: 'SOCKET_MISMATCH',
          message: `${cpu.name} uses socket ${a} but ${board.name} uses socket ${b}.`,
        });
      }
    }
  }

  for (const board of boards) {
    for (const ram of rams) {
      const a = specOf(board, 'ram_type');
      const b = specOf(ram, 'ram_type');
      if (known(a) && known(b) && norm(a) !== norm(b)) {
        issues.push({
          code: 'RAM_TYPE_MISMATCH',
          message: `${board.name} takes ${a} memory but ${ram.name} is ${b}.`,
        });
      }
    }
  }

  const drawers = [...cpus, ...gpus];
  if (drawers.length > 0) {
    const draw = drawers.reduce((sum, p) => sum + (Number(specOf(p, 'tdp_watts')) || 0), 0);
    const needed = draw + PSU_HEADROOM_WATTS;
    for (const psu of psus) {
      const watts = specOf(psu, 'wattage');
      if (known(watts) && Number(watts) < needed) {
        issues.push({
          code: 'PSU_INSUFFICIENT',
          message: `${psu.name} gives ${watts}W but this build needs about ${needed}W.`,
        });
      }
    }
  }

  return issues;
}