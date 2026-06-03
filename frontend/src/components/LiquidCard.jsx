export default function LiquidCard({ title, children, className = '', style }) {
  return (
    <div className={`liquid-card ${className}`} style={style}>
      {title && (
        <h2 style={{ marginBottom: '0.875rem' }}>{title}</h2>
      )}
      {children}
    </div>
  );
}
