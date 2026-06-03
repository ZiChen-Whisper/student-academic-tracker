/**
 * 统一图表 Tooltip 组件 - 液态玻璃风格
 * 遵循 iOS26-Liquid-Glass 设计系统规范 §6.1
 *
 * 液态玻璃色彩反射：边缘高光线和边框颜色
 * 根据 payload 中的数据系列色动态变化，模拟
 * 玻璃对附近色彩的环境反射效果
 */
export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  // 提取数据系列色，用于色彩反射
  const colors = payload.map((p) => p.color).filter(Boolean);
  const primaryColor = colors[0] || '#0b6565';

  // 生成反射色：多系列时混合，单系列时用该色
  const reflectColor = colors.length >= 2
    ? colors[0]
    : primaryColor;

  // 顶部高光线渐变：两端透明 → 中间反射色
  const highlightGradient = colors.length >= 2
    ? `linear-gradient(90deg, transparent, ${colors[0]}66, ${colors.length > 1 ? colors[1] + '66' : colors[0] + '66'}, transparent)`
    : `linear-gradient(90deg, transparent, ${primaryColor}55, transparent)`;

  // 边框：微弱的反射色
  const borderColor = `${primaryColor}18`;

  // 底部反射光
  const bottomGlow = `linear-gradient(90deg, transparent, ${primaryColor}15, transparent)`;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        border: `0.5px solid ${borderColor}`,
        borderRadius: '0.625rem',
        boxShadow: `0 2px 8px rgba(11,101,101,0.08), 0 4px 16px rgba(11,101,101,0.04), 0 0 12px ${primaryColor}08`,
        padding: '0.5rem 0.75rem',
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 顶部色彩反射高光线 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '8%',
          right: '8%',
          height: '0.5px',
          background: highlightGradient,
        }}
      />
      {/* 底部色彩反射光 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '15%',
          right: '15%',
          height: '0.5px',
          background: bottomGlow,
        }}
      />
      {label != null && (
        <div style={{ fontWeight: 600, color: '#095050', marginBottom: payload.length > 0 ? 2 : 0 }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: '#2a3d3d' }}>
          <span style={{ color: 'rgba(11,101,101,0.5)' }}>{p.name}: </span>
          <span style={{ color: p.color || '#0b6565', fontWeight: 500 }}>
            {typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(1)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
