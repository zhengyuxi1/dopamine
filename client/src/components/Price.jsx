export default function Price({ value, original, size = 'normal' }) {
  if (value == null) return null;
  const [int, dec] = String(Number(value).toFixed(2)).split('.');
  const intSize = size === 'large' ? 22 : size === 'small' ? 14 : 18;
  return (
    <span className="price">
      <span className="symbol">¥</span>
      <span className="int" style={{ fontSize: intSize }}>{int}</span>
      <span className="symbol">.{dec}</span>
      {original != null && original > value && (
        <>
          {' '}
          <span className="price original">¥{Number(original).toFixed(2)}</span>
        </>
      )}
    </span>
  );
}
