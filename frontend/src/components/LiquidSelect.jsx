import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * 液态玻璃风格自定义下拉框
 * 替代原生 <select>，下拉面板采用 Liquid Glass 设计
 * 使用 Portal 渲染到 body，确保 backdrop-filter 正常工作
 * 自动检测可用空间，向上或向下展开
 */
export default function LiquidSelect({ value, onChange, options, placeholder, style, className = '' }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // 打开时计算位置和方向
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = options.length * 36 + 16;

    const shouldDropUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    setDropUp(shouldDropUp);

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(shouldDropUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  }, [open, options.length]);

  // 窗口变化时更新位置
  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = options.length * 36 + 16;
      const shouldDropUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setDropUp(shouldDropUp);
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        ...(shouldDropUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [open, options.length]);

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder || '';

  return (
    <div
      ref={ref}
      className={`liquid-select-wrapper ${className}`}
      style={style}
    >
      {/* 触发器 */}
      <button
        ref={triggerRef}
        type="button"
        className={`liquid-select-trigger ${open ? 'liquid-select-trigger-open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`liquid-select-text ${!selectedOption ? 'liquid-select-placeholder' : ''}`}>
          {displayText}
        </span>
        <ChevronDown
          size={14}
          className="liquid-select-arrow"
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? (dropUp ? 'rotate(0deg)' : 'rotate(180deg)') : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* 下拉面板 — Portal 渲染到 body */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          className={`liquid-select-dropdown ${dropUp ? 'liquid-select-dropdown-up' : ''}`}
          style={dropdownStyle}
        >
          <div className="liquid-select-dropdown-inner">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  className={`liquid-select-option ${isSelected ? 'liquid-select-option-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                  {isSelected && <span className="liquid-select-check" />}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
