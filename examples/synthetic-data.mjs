// Purpose: Generate deterministic labeled fixtures, not live Jev measurements or market claims.
export function syntheticRows(count = 600) {
  return Array.from({ length: count }, (_, i) => {
    const easy = i % 3 !== 0;
    return { id: `synthetic-${i}`, timestamp: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(), score: easy ? 0.97 : 0.65, prediction: 'billing', label: easy || i % 2 === 0 ? 'billing' : 'technical', group: i % 2 ? 'English' : 'French' };
  });
}
