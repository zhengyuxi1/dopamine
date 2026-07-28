// 商品封面组件：支持绝对 URL、本地 /images 路径，否则用 picsum.photos 占位
export default function Cover({ src, seed, alt = '', className = '', style }) {
  let url = src;
  if (!src) {
    const s = seed || 'shop';
    url = `https://picsum.photos/seed/${encodeURIComponent(s)}/400/400`;
  } else if (src.startsWith('http')) {
    url = src;
  } else if (src.startsWith('/images') || src.startsWith('/api')) {
    url = src; // 通过 vite 代理或同源访问后端静态资源
  } else {
    const s = seed || src;
    url = `https://picsum.photos/seed/${encodeURIComponent(s)}/400/400`;
  }
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = `https://picsum.photos/seed/fallback${Math.random()}/400/400`;
      }}
    />
  );
}
