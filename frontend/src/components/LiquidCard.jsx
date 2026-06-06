export default function LiquidCard({ title, action, children, className = '', style }) {
  return (
    <div className={`liquid-card ${className}`} style={style}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
