(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
.vibe-fab {
  position: fixed; bottom: 24px; right: 24px; z-index: 99999;
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #ff4d4f, #ff7a45);
  color: #fff; border: none; cursor: pointer;
  box-shadow: 0 4px 20px rgba(255,77,79,0.5);
  font-size: 24px; display: flex; align-items: center; justify-content: center;
  transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s;
  user-select: none; touch-action: none;
}
.vibe-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(255,77,79,0.65); }
.vibe-fab:active { transform: scale(.93); }
.vibe-fab.busy { opacity: .75; pointer-events: none; }
`;
  document.head.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'vibe-fab';
  fab.innerHTML = '✦';
  fab.title = 'VibeCoding';
  fab.setAttribute('aria-label', '打开 VibeCoding');
  document.body.appendChild(fab);

  let navigating = false;

  async function enterVibeCoding() {
    if (navigating) return;
    navigating = true;
    fab.classList.add('busy');
    window.location.href = '/__vibe/open';
  }

  fab.addEventListener('click', () => enterVibeCoding());

  // 拖动（仅在未跳转时）
  let drag = false;
  let sx = 0;
  let sy = 0;
  let ox = 0;
  let oy = 0;
  fab.addEventListener('pointerdown', (e) => {
    if (navigating) return;
    drag = true;
    sx = e.clientX;
    sy = e.clientY;
    ox = fab.offsetLeft;
    oy = fab.offsetTop;
    fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener('pointermove', (e) => {
    if (!drag) return;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    fab.style.left = (ox + e.clientX - sx) + 'px';
    fab.style.top = (oy + e.clientY - sy) + 'px';
  });
  fab.addEventListener('pointerup', () => { drag = false; });

  console.log('%c✦ VibeCoding Launcher', 'color:#ff4d4f;font-weight:bold;font-size:14px;');
})();
