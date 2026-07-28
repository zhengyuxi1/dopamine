export function parseProduct(p) {
  if (!p) return p;
  try { p.images = JSON.parse(p.images || '[]'); } catch { p.images = []; }
  try { p.tags = JSON.parse(p.tags || '[]'); } catch { p.tags = []; }
  if (p.images && p.images.length && !p.cover) p.cover = p.images[0];
  return p;
}
