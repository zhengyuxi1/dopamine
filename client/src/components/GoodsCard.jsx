import Cover from './Cover.jsx';
import Price from './Price.jsx';
import { Link } from 'react-router-dom';

export default function GoodsCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="goods-card">
      <div className="cover">
        <Cover src={product.cover} seed={`p${product.id}`} alt={product.title} />
      </div>
      <div className="info">
        {product.tags?.slice(0, 2).map((t, i) => (
          <span key={i} className={`tag ${i === 1 ? 'gold' : ''}`}>{t}</span>
        ))}
        <div className="title">{product.title}</div>
        {product.subtitle && <div className="sub">{product.subtitle}</div>}
        <div className="price-row">
          <Price value={product.price} original={product.original_price} />
          <span className="sales">{product.sales > 999 ? '999+' : product.sales}人付款</span>
        </div>
      </div>
    </Link>
  );
}
