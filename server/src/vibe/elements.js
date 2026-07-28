const MAX_ELEMENTS = 10;

function clip(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/**
 * @param {unknown[]} raw
 */
export function normalizeElements(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const selector = clip(item.selector, 500);
    const tag = clip(item.tag, 40).toLowerCase();
    if (!selector || !tag) continue;
    const rect = item.rect && typeof item.rect === 'object' ? item.rect : {};
    const rawSource = item.source && typeof item.source === 'object' ? item.source : null;
    const sourceFile = rawSource ? clip(rawSource.file, 500) : '';
    out.push({
      selector,
      tag,
      id: clip(item.id, 120) || undefined,
      classes: Array.isArray(item.classes)
        ? item.classes.map(c => clip(c, 80)).filter(Boolean).slice(0, 12)
        : undefined,
      text: clip(item.text, 120) || undefined,
      rect: {
        x: Number(rect.x) || 0,
        y: Number(rect.y) || 0,
        width: Number(rect.width) || 0,
        height: Number(rect.height) || 0,
      },
      page: clip(item.page, 300) || undefined,
      source: sourceFile
        ? {
            file: sourceFile,
            line: Math.max(0, Number(rawSource.line) || 0),
            column: Math.max(0, Number(rawSource.column) || 0),
            component: clip(rawSource.component, 120) || undefined,
          }
        : undefined,
    });
    if (out.length >= MAX_ELEMENTS) break;
  }
  return out;
}

function formatElement(idx, el) {
  const cls = el.classes?.length ? `.${el.classes.slice(0, 4).join('.')}` : '';
  const idPart = el.id ? `#${el.id}` : '';
  const label = el.text ? `"${el.text}"` : '(无可见文本)';
  const r = el.rect;
  const pos = r ? `${Math.round(r.width)}×${Math.round(r.height)}px @(${Math.round(r.x)},${Math.round(r.y)})` : '';
  const source = el.source?.file
    ? `${el.source.file}:${el.source.line || 1}${el.source.column ? `:${el.source.column}` : ''}${el.source.component ? ` (${el.source.component})` : ''}`
    : '';
  return `${idx}. <${el.tag}${idPart}${cls}> ${label}` +
    `${source ? `\n   源码定位: \`${source}\`` : ''}` +
    `\n   selector: \`${el.selector}\`` +
    `${pos ? `\n   视口位置/尺寸: ${pos}` : ''}`;
}

/** Append selected DOM regions to the user prompt for local fine-tuning. */
export function appendElementsToPrompt(userText, elements, pageUrl) {
  const list = normalizeElements(elements);
  if (!list.length) return String(userText || '').trim();

  const lines = [
    String(userText || '').trim(),
    '',
    '【页面局部区域 — 用户选中的 DOM 元素，请优先修改这些区域】',
  ];
  if (pageUrl) lines.push(`页面: ${pageUrl}`);
  lines.push('');
  list.forEach((el, i) => lines.push(formatElement(i + 1, el)));
  lines.push(
    '',
    '说明：以上为用户在浏览器中点选的一个或多个区域。若提供了源码定位，请优先直接读取该文件和附近行；',
    '仅在源码定位缺失或不准确时，再用 selector、文本与结构搜索。不要无关重构。',
  );
  return lines.join('\n').trim();
}
