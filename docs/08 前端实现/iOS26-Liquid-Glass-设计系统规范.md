# iOS 26 液态玻璃设计系统规范

> 本文档定义了「学业跟踪预警系统」前端 UI 的完整设计规范，所有前端开发必须遵循此规范。
> 样式预览文件：`frontend/style-preview.html`

---

## 1. 设计理念

基于 iOS 26 Liquid Glass 设计语言，核心特征：

- **磨砂玻璃质感**：`backdrop-filter: blur()` + 半透明背景，内容透过玻璃隐约可见
- **细高光轮廓**：`0.5px` 极细边框 + 顶部渐变高光线（中间亮、两端淡出），非均匀粗边框
- **弥散光晕背景**：纯白底色上叠加主色径向渐变光晕，营造空间感
- **克制动效**：悬浮微升 `-1px`、点击缩放 `0.98`，不使用弹跳或大幅位移动画

---

## 2. 色彩系统

### 2.1 主题色

| Token | 色值 | 用途 |
|-------|------|------|
| `--primary` | `#0b6565` | 主色，按钮、链接、强调文字 |
| `--primary-light` | `#0d7a7a` | 主色浅一档，hover 态 |
| `--primary-lighter` | `#0e8f8f` | 主色浅两档，渐变终点 |
| `--primary-lightest` | `#10a4a4` | 主色最浅档 |
| `--primary-dark` | `#095050` | 主色深一档，标题、重要数值 |
| `--primary-bg` | `#e6f5f5` | 主色背景色，大面积底色 |
| `--primary-bg-subtle` | `#f0fafa` | 主色极浅背景 |

### 2.2 辅色

| Token | 色值 | 用途 |
|-------|------|------|
| `--accent` | `#c9933a` | 辅色/强调色，第二折线、次要高亮 |
| `--accent-light` | `#daa84e` | 辅色浅一档 |

### 2.3 语义色

| Token | 色值 | 用途 |
|-------|------|------|
| `--danger` | `#c0392b` | 高风险、错误、删除 |
| `--danger-light` | `#e74c3c` | danger hover 态 |
| `--warning` | `#d4880f` | 中风险、警告 |
| `--warning-light` | `#f0a30a` | warning hover 态 |
| `--success` | `#1a8a5a` | 低风险、成功、及格 |
| `--success-light` | `#27ae70` | success hover 态 |

### 2.4 中性色

| 用途 | 色值 |
|------|------|
| 正文 | `#1a2b2b` |
| 次要文字 | `rgba(11,101,101,0.65)` |
| 辅助文字 | `rgba(11,101,101,0.45)` |
| 占位符 | `rgba(11,101,101,0.35)` |
| 分割线 | `rgba(11,101,101,0.08)` |
| 边框 | `rgba(11,101,101,0.12)` |
| 页面背景 | `#ffffff` |

---

## 3. 弥散光晕背景

纯白底色 + 两处主色径向渐变光晕，营造空间纵深感：

```css
/* 右上光晕 */
body::before {
  position: fixed;
  top: -20%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(11,101,101,0.08) 0%, rgba(11,101,101,0.03) 40%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

/* 左下光晕 */
body::after {
  position: fixed;
  bottom: -15%;
  left: -5%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(11,101,101,0.06) 0%, rgba(11,101,101,0.02) 40%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
```

---

## 4. 排版

| 元素 | 字号 | 字重 | 行高 |
|------|------|------|------|
| 页面标题 | 1.375rem (22px) | 700 | 1.4 |
| 区域标题 | 1rem (16px) | 600 | 1.5 |
| 正文 | 0.8125rem (13px) | 400 | 1.6 |
| 辅助文字 | 0.6875rem (11px) | 400 | 1.5 |
| 标签/徽章 | 0.6875rem (11px) | 600 | 1.4 |
| 表头 | 0.6875rem (11px) | 600 | 1.4 |
| 代码 | 0.8125rem (13px) | 400 | 1.7 |

字体栈：`-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif`

代码字体栈：`'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace`

---

## 5. 组件规范

### 5.1 导航栏 `.liquid-nav`

| 属性 | 值 |
|------|-----|
| 定位 | `sticky top:0 z-index:50` |
| 背景 | `rgba(255,255,255,0.72)` |
| 模糊 | `backdrop-filter: blur(24px) saturate(180%)` |
| 底边框 | `0.5px solid rgba(11,101,101,0.12)` |
| 高度 | 52px |

导航项 `.liquid-nav-item`：

| 状态 | 背景 | 文字色 | 阴影 |
|------|------|--------|------|
| 默认 | transparent | `rgba(11,101,101,0.55)` | 无 |
| hover | `rgba(11,101,101,0.06)` | `var(--primary)` | 无 |
| active | `rgba(11,101,101,0.1)` | `var(--primary)` | `inset 0 0.5px 0 rgba(255,255,255,0.6)` |

### 5.2 液态玻璃卡片 `.liquid-card`

| 属性 | 值 |
|------|-----|
| 背景 | `rgba(255,255,255,0.6)` |
| 模糊 | `backdrop-filter: blur(20px) saturate(160%)` |
| 边框 | `0.5px solid rgba(11,101,101,0.1)` |
| 圆角 | `1rem` (16px) |
| 阴影 | `0 1px 3px rgba(11,101,101,0.04), 0 4px 16px rgba(11,101,101,0.03)` |
| 顶部高光线 | `::before` — `0.5px` 高，`left:12% right:12%`，`linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)` |
| hover 背景 | `rgba(255,255,255,0.72)` |
| hover 阴影 | `0 2px 6px rgba(11,101,101,0.06), 0 8px 24px rgba(11,101,101,0.05)` |
| hover 位移 | `translateY(-1px)` |
| 内边距 | `1.25rem` |

### 5.3 指标卡片 `.metric-card`

| 属性 | 值 |
|------|-----|
| 背景 | `rgba(255,255,255,0.65)` |
| 模糊 | `backdrop-filter: blur(16px) saturate(160%)` |
| 边框 | `0.5px solid rgba(11,101,101,0.08)` |
| 圆角 | `0.875rem` (14px) |
| 顶部高光线 | `::before` — `left:15% right:15%`，`rgba(255,255,255,0.6)` |
| hover 位移 | `translateY(-1px)` |
| 内边距 | `1.125rem` |

图标容器 `.metric-icon`：32x32px，圆角 8px，背景 `rgba(11,101,101,0.08)`，SVG 16x16px

### 5.4 按钮 `.liquid-btn`

| 属性 | 值 |
|------|-----|
| 背景 | `rgba(11,101,101,0.08)` |
| 边框 | `0.5px solid rgba(11,101,101,0.12)` |
| 圆角 | `0.5rem` (8px) |
| 文字色 | `var(--primary)` |
| 内边距 | `0.4375rem 1rem` |
| 字号 | `0.8125rem` |
| 顶部高光线 | `::before` — `left:10% right:10%`，`rgba(255,255,255,0.5)` |
| hover 背景 | `rgba(11,101,101,0.14)` |
| hover 位移 | `translateY(-0.5px)` |
| active 缩放 | `scale(0.98)` |

按钮变体：

| 变体 | 类名 | 背景 | 文字色 | 边框色 |
|------|------|------|--------|--------|
| 主要 | `.liquid-btn-primary` | `var(--primary)` | white | `var(--primary-light)` |
| 危险 | `.liquid-btn-danger` | `rgba(192,57,43,0.08)` | `var(--danger)` | `rgba(192,57,43,0.15)` |
| 小号 | `.liquid-btn-sm` | 同默认 | 同默认 | 同默认 |
| 胶囊 | `.liquid-btn-pill` | 同默认 | 同默认 | 同默认 |

### 5.5 输入框 `.liquid-input`

| 属性 | 值 |
|------|-----|
| 背景 | `rgba(11,101,101,0.03)` |
| 边框 | `0.5px solid rgba(11,101,101,0.12)` |
| 圆角 | `0.5rem` |
| 内边距 | `0.5625rem 0.875rem` |
| 占位符色 | `rgba(11,101,101,0.35)` |
| focus 边框 | `rgba(11,101,101,0.3)` |
| focus 背景 | `rgba(11,101,101,0.05)` |
| focus 光环 | `0 0 0 2.5px rgba(11,101,101,0.08)` |

### 5.6 下拉框 `.liquid-select`

与输入框同风格，额外：

| 属性 | 值 |
|------|-----|
| 右内边距 | `2.25rem`（为箭头留空间） |
| 箭头图标 | 内联 SVG，14x14px，`stroke: #0b6565` |
| option 背景 | `#ffffff` |

### 5.7 Tab 切换 `.liquid-tabs` / `.liquid-tab`

| 属性 | 值 |
|------|-----|
| 容器背景 | `rgba(11,101,101,0.04)` |
| 容器边框 | `0.5px solid rgba(11,101,101,0.06)` |
| 容器圆角 | `0.625rem` |
| 容器内边距 | `0.1875rem` |

Tab 项状态：

| 状态 | 背景 | 文字色 | 阴影 |
|------|------|--------|------|
| 默认 | transparent | `rgba(11,101,101,0.5)` | 无 |
| hover | `rgba(11,101,101,0.05)` | `var(--primary)` | 无 |
| active | `rgba(255,255,255,0.75)` | `var(--primary)` | `0 0.5px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(11,101,101,0.06)` |

### 5.8 表格 `.liquid-table`

| 元素 | 属性 | 值 |
|------|------|-----|
| 表头 | 背景 | `rgba(11,101,101,0.04)` |
| 表头 | 字号 | `0.6875rem` |
| 表头 | 文字色 | `rgba(11,101,101,0.5)` |
| 表头 | 底边框 | `0.5px solid rgba(11,101,101,0.08)` |
| 单元格 | 字号 | `0.8125rem` |
| 单元格 | 文字色 | `#2a3d3d` |
| 单元格 | 底边框 | `0.5px solid rgba(11,101,101,0.05)` |
| 行 hover | 背景 | `rgba(11,101,101,0.02)` |

### 5.9 代码块 `.liquid-code`

| 属性 | 值 |
|------|-----|
| 背景 | `rgba(11,101,101,0.04)` |
| 边框 | `0.5px solid rgba(11,101,101,0.08)` |
| 圆角 | `0.625rem` |
| 内边距 | `1rem 1.125rem` |
| 文字色 | `var(--primary-dark)` |

语法高亮色：

| 类型 | 色值 |
|------|------|
| keyword | `#7c3aed` |
| string | `var(--success)` (#1a8a5a) |
| number | `var(--accent)` (#c9933a) |
| function | `#2563eb` |

### 5.10 风险等级标签 `.risk-badge`

| 等级 | 类名 | 背景 | 边框 | 文字色 |
|------|------|------|------|--------|
| 高 | `.risk-high` | `rgba(192,57,43,0.08)` | `0.5px solid rgba(192,57,43,0.2)` | `var(--danger)` |
| 中 | `.risk-medium` | `rgba(212,136,15,0.08)` | `0.5px solid rgba(212,136,15,0.2)` | `var(--warning)` |
| 低 | `.risk-low` | `rgba(26,138,90,0.08)` | `0.5px solid rgba(26,138,90,0.2)` | `var(--success)` |

通用：圆角 `9999px`，内边距 `0.1875rem 0.625rem`，字号 `0.6875rem`，字重 600，内含 10x10px SVG 图标

### 5.11 提示信息 `.liquid-alert`

| 类型 | 类名 | 背景 | 边框 | 文字色 |
|------|------|------|------|--------|
| 信息 | `.liquid-alert-info` | `rgba(37,99,235,0.05)` | `0.5px solid rgba(37,99,235,0.12)` | `#2563eb` |
| 成功 | `.liquid-alert-success` | `rgba(26,138,90,0.05)` | `0.5px solid rgba(26,138,90,0.12)` | `var(--success)` |
| 警告 | `.liquid-alert-warning` | `rgba(212,136,15,0.05)` | `0.5px solid rgba(212,136,15,0.12)` | `var(--warning)` |
| 错误 | `.liquid-alert-error` | `rgba(192,57,43,0.05)` | `0.5px solid rgba(192,57,43,0.12)` | `var(--danger)` |

通用：圆角 `0.625rem`，内边距 `0.75rem 1rem`，左侧 16x16px SVG 图标

### 5.12 进度条 `.liquid-progress`

| 属性 | 值 |
|------|-----|
| 高度 | 4px |
| 轨道背景 | `rgba(11,101,101,0.06)` |
| 填充渐变 | `linear-gradient(90deg, var(--primary), var(--primary-lighter))` |
| 圆角 | 2px |

危险态填充：`linear-gradient(90deg, var(--danger), var(--danger-light))`

### 5.13 头像 `.liquid-avatar`

| 属性 | 值 |
|------|-----|
| 尺寸 | 32x32px（表格内 26x26px） |
| 圆角 | 50% |
| 背景 | `rgba(11,101,101,0.08)` |
| 边框 | `0.5px solid rgba(11,101,101,0.1)` |
| 文字 | 首字，0.75rem，字重 600，`var(--primary)` |

### 5.14 分割线 `.liquid-divider`

| 属性 | 值 |
|------|-----|
| 高度 | 0.5px |
| 颜色 | `rgba(11,101,101,0.08)` |
| 上下间距 | 1rem |

---

## 6. 图表配色

| 图表元素 | 色值 | 说明 |
|----------|------|------|
| 主数据系列 | `var(--primary)` #0b6565 | 柱状图填充、主折线 |
| 次数据系列 | `var(--accent)` #c9933a | 第二折线（虚线） |
| 高风险 | `var(--danger)` #c0392b | 饼图红色区 |
| 中风险 | `var(--warning)` #d4880f | 饼图橙色区 |
| 低风险 | `var(--success)` #1a8a5a | 饼图绿色区 |
| 网格线 | `rgba(11,101,101,0.05)` | 0.5px 细线 |
| 坐标轴文字 | `rgba(11,101,101,0.3~0.4)` | 小号字 |
| Tooltip 背景 | 见 6.1 图表 Tooltip 规范 | 液态玻璃风格，半透明白底 + 模糊 |

柱状图填充渐变：`linear-gradient(180deg, var(--primary) 0%, rgba(11,101,101,0.3) 100%)`

饼图中心镂空：70px 白色圆，`rgba(255,255,255,0.85)` + `backdrop-filter: blur(4px)`

### 6.1 图表 Tooltip `.chart-tooltip`

| 属性 | 值 |
|------|-----|
| 背景 | `rgba(255,255,255,0.82)` |
| 模糊 | `backdrop-filter: blur(16px) saturate(160%)` |
| 边框 | `0.5px solid`，颜色为反射色 10% 透明（如 `#0b656518`） |
| 圆角 | `0.625rem` |
| 阴影 | `0 2px 8px rgba(11,101,101,0.08), 0 4px 16px rgba(11,101,101,0.04), 0 0 12px 反射色 3%` |
| 内边距 | `0.5rem 0.75rem` |
| 字号 | `0.8125rem` |
| 行高 | 1.5 |
| 标题色 | `var(--primary-dark)` #095050，字重 600 |
| 数据项色 | `#2a3d3d`，数据值色跟随系列色 |

**液态玻璃色彩反射机制**：

Tooltip 边缘的高光线和边框颜色不是固定的，而是根据当前悬停的数据系列色动态变化，模拟玻璃对附近色彩的环境反射效果：

| 反射元素 | 规则 |
|----------|------|
| 顶部高光线 | `left:8% right:8%`，渐变 `transparent → 反射色 40% → transparent`；多系列时 `transparent → 第一色 40% → 第二色 40% → transparent` |
| 底部反射光 | `left:15% right:15%`，渐变 `transparent → 反射色 8% → transparent`，比顶部更弱 |
| 边框色 | 反射色 10% 透明度（如 `#0b656518`） |
| 外光晕 | `0 0 12px 反射色 3%`，营造色彩弥散感 |

反射色来源：取自 `payload[0].color`（即当前悬停的数据系列颜色）。多系列时，顶部高光线呈现多色渐变。

示例：
- 悬停综合成绩（`#1a8a5a`）→ 顶部高光线偏绿，边框微绿
- 悬停数学成绩（`#0b6565`）→ 顶部高光线偏青，边框微青
- 悬停高风险饼图区（`#c0392b`）→ 顶部高光线偏红，边框微红

### 6.2 图表筛选标签 `.chart-filter-btn`

用于图表上方的科目/分类筛选切换，支持单选和多选两种模式。

| 属性 | 值 |
|------|-----|
| 圆角 | `9999px`（胶囊形） |
| 内边距 | `0.25rem 0.75rem` |
| 字号 | `0.75rem` |
| 字重 | 默认 400，选中 600 |
| 边框 | `0.5px solid` |
| 过渡 | `all 0.2s ease` |
| 色点 | 8x8px 圆形，`border-radius: 50%`，与系列色一致 |

**单选模式**（如成绩分布科目切换）：

| 状态 | 背景 | 文字色 | 边框色 | 色点 |
|------|------|--------|--------|------|
| 选中 | 系列色（如 `#0b6565`） | `#fff` | 系列色 | `#fff` |
| 未选中 | `rgba(11,101,101,0.04)` | `rgba(11,101,101,0.5)` | `rgba(11,101,101,0.08)` | `rgba(11,101,101,0.2)` |
| hover | `rgba(11,101,101,0.08)` | `rgba(11,101,101,0.7)` | `rgba(11,101,101,0.12)` | `rgba(11,101,101,0.35)` |

**多选模式**（如成绩趋势科目筛选）：

| 状态 | 背景 | 文字色 | 边框色 | 色点 |
|------|------|--------|--------|------|
| 选中 | 系列色 5% 透明（如 `rgba(11,101,101,0.05)`） | 系列色 | 系列色 | 系列色 |
| 未选中 | `rgba(11,101,101,0.04)` | `rgba(11,101,101,0.45)` | `rgba(11,101,101,0.08)` | `rgba(11,101,101,0.2)` |
| hover | 同选中态 + 微升透明度 | 同选中态 | 同选中态 | 同选中态 |

系列色映射：

| 科目 | 色值 |
|------|------|
| 综合 | `#1a8a5a` (var(--success)) |
| 数学 | `#0b6565` (var(--primary)) |
| 葡萄牙语 | `#c9933a` (var(--accent)) |

---

## 7. 动效规范

| 交互 | 效果 | 时长 | 缓动 |
|------|------|------|------|
| 卡片 hover | `translateY(-1px)` + 阴影增强 | 0.3s | ease |
| 按钮 hover | `translateY(-0.5px)` + 阴影 | 0.2s | ease |
| 按钮 active | `scale(0.98)` | 0.1s | ease |
| Tab 切换 | 白底浮起 + 阴影 | 0.25s | ease |
| 输入框 focus | 边框高亮 + 外光环 | 0.2s | ease |
| 进度条 | 宽度过渡 | 0.6s | ease |

**禁止**：弹跳动画、大幅位移、闪烁效果、自动轮播

---

## 8. 间距与布局

| 场景 | 值 |
|------|-----|
| 页面最大宽度 | 1200px |
| 页面左右内边距 | 1.5rem (24px) |
| 卡片内边距 | 1.25rem (20px) |
| 卡片间距 | 1.25rem (20px) |
| 指标卡片间距 | 0.875rem (14px) |
| 表单元素间距 | 0.625rem (10px) |
| 按钮间距 | 0.5rem (8px) |
| 区域标题下间距 | 0.875rem (14px) |

---

## 9. 图标规范

- 使用内联 SVG，不使用 emoji
- 图标尺寸：16x16px（默认）、14x14px（按钮内）、10x10px（标签内）
- 描边风格：`stroke-width: 2`，`stroke-linecap: round`，`stroke-linejoin: round`
- 颜色：继承父元素 `currentColor`，或使用 `var(--primary)` / 语义色

常用图标（Lucide 风格）：

| 图标 | 用途 |
|------|------|
| 用户组 | 学生总数 |
| 趋势线 | 平均成绩 |
| 三角警告 | 高风险 |
| 对勾圆 | 及格/成功 |
| 刷新 | 重新生成 |
| 信息圆 | 提示 |
| 叉号圆 | 错误 |

---

## 10. 兼容性

| 浏览器 | 最低版本 |
|--------|---------|
| Chrome | 76+ |
| Firefox | 103+ |
| Safari | 14+ |
| Edge | 79+ |

核心依赖：`backdrop-filter`（需 `-webkit-` 前缀兼容 Safari）

---

## 11. CSS 变量完整定义

在 `index.css` 的 `:root` 中定义以下变量，供全局使用：

```css
:root {
  --primary: #0b6565;
  --primary-light: #0d7a7a;
  --primary-lighter: #0e8f8f;
  --primary-lightest: #10a4a4;
  --primary-dark: #095050;
  --primary-bg: #e6f5f5;
  --primary-bg-subtle: #f0fafa;
  --accent: #c9933a;
  --accent-light: #daa84e;
  --danger: #c0392b;
  --danger-light: #e74c3c;
  --warning: #d4880f;
  --warning-light: #f0a30a;
  --success: #1a8a5a;
  --success-light: #27ae70;
}
```
