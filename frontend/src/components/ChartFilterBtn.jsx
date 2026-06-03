/**
 * 统一图表筛选标签组件 - 液态玻璃风格
 * 遵循 iOS26-Liquid-Glass 设计系统规范 §6.2
 *
 * mode: 'single'（单选）| 'multi'（多选）
 * active: 是否选中
 * color: 系列色（如 #0b6565）
 * dot: 是否显示色点（默认 true）
 */
export default function ChartFilterBtn({ children, active, color, dot = true, mode = 'single', onClick }) {
  const getStyles = () => {
    if (mode === 'single') {
      return active
        ? {
            background: color,
            color: '#fff',
            borderColor: color,
            dotColor: '#fff',
            fontWeight: 600,
          }
        : {
            background: 'rgba(11,101,101,0.04)',
            color: 'rgba(11,101,101,0.5)',
            borderColor: 'rgba(11,101,101,0.08)',
            dotColor: 'rgba(11,101,101,0.2)',
            fontWeight: 400,
          };
    }
    // multi
    return active
      ? {
          background: `${color}0d`,
          color: color,
          borderColor: color,
          dotColor: color,
          fontWeight: 600,
        }
      : {
          background: 'rgba(11,101,101,0.04)',
          color: 'rgba(11,101,101,0.45)',
          borderColor: 'rgba(11,101,101,0.08)',
          dotColor: 'rgba(11,101,101,0.2)',
          fontWeight: 400,
        };
  };

  const s = getStyles();

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.75rem',
        borderRadius: 9999,
        fontSize: '0.75rem',
        border: `0.5px solid ${s.borderColor}`,
        background: s.background,
        color: s.color,
        fontWeight: s.fontWeight,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {dot && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: s.dotColor,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  );
}
