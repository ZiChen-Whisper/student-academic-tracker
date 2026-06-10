import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * LiquidTooltip - 液态玻璃风格悬停提示组件
 *
 * 用法：
 *   import { useLiquidTooltip, LiquidTooltip } from './LiquidTooltip';
 *
 *   function MyComponent() {
 *     const { tooltip, showTooltip, hideTooltip } = useLiquidTooltip();
 *     return (
 *       <>
 *         <div
 *           onMouseEnter={(e) => showTooltip('提示文字', e)}
 *           onMouseMove={(e) => showTooltip('提示文字', e)}
 *           onMouseLeave={hideTooltip}
 *         >内容</div>
 *         <LiquidTooltip text={tooltip.text} x={tooltip.x} y={tooltip.y} />
 *       </>
 *     );
 *   }
 */

export function useLiquidTooltip() {
  const [tooltip, setTooltip] = useState({ text: '', x: 0, y: 0 });

  const showTooltip = useCallback((text, e) => {
    setTooltip({ text, x: e.clientX, y: e.clientY });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip({ text: '', x: 0, y: 0 });
  }, []);

  const moveTooltip = useCallback((e) => {
    setTooltip(prev => prev.text ? { ...prev, x: e.clientX, y: e.clientY } : prev);
  }, []);

  return { tooltip, showTooltip, hideTooltip, moveTooltip };
}

export default function LiquidTooltip({ text, x, y }) {
  if (!text) return null;

  const style = {
    left: Math.min(x + 10, window.innerWidth - 260),
    top: y - 36,
  };

  return createPortal(
    <div className="liquid-tooltip" style={style}>{text}</div>,
    document.body
  );
}
