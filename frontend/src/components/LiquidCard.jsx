export default function LiquidCard({ title, children, className = '' }) {
  return (
    <div className={`liquid-card ${className}`}>
      {title && (
        <h2 style={{ marginBottom: '0.875rem' }}>{title}</h2>
      )}
      {children}
    </div>
  );
}
