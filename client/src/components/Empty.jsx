export default function Empty({ emoji = '📭', text = '空空如也', action }) {
  return (
    <div className="empty">
      <div className="emoji">{emoji}</div>
      <div className="text">{text}</div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
