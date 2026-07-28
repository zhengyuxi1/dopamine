/** In-memory pending DOM picks per vibe UI session (preview ↔ chat sync). */
const store = new Map();

function key(userId, sessionId) {
  return `${userId}:${sessionId}`;
}

export function setPicks(userId, sessionId, elements, pageUrl) {
  const k = key(userId, sessionId);
  const entry = {
    elements: Array.isArray(elements) ? elements : [],
    pageUrl: pageUrl || '',
    updatedAt: Date.now(),
  };
  store.set(k, entry);
  return entry;
}

export function getPicks(userId, sessionId) {
  return store.get(key(userId, sessionId)) || {
    elements: [],
    pageUrl: '',
    updatedAt: 0,
  };
}

export function clearPicks(userId, sessionId) {
  store.delete(key(userId, sessionId));
}

export function clearAllPicksForUser(userId) {
  const prefix = `${userId}:`;
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
