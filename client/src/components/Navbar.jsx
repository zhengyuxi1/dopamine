import { useNavigate } from 'react-router-dom';

export default function Navbar({ title, back = true, right, white }) {
  const navigate = useNavigate();
  return (
    <div className={`navbar ${white ? 'white' : ''}`}>
      {back && <span className="back" onClick={() => navigate(-1)}>‹</span>}
      <span className="title" style={{ padding: back ? undefined : 0 }}>{title}</span>
      <span className="right">{right}</span>
    </div>
  );
}
