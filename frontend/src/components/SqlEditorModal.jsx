import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Clock, AlertCircle, ChevronDown, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api';

// SQL 关键字
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'JOIN', 'LEFT',
  'RIGHT', 'INNER', 'ON', 'AS', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'SET', 'VALUES',
  'INTO', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'ASC', 'DESC',
  'BETWEEN', 'IS', 'NULL', 'UNION', 'ALL', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'TABLES',
  'TRUNCATE', 'RENAME', 'IF', 'EXISTS', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'INDEX', 'UNIQUE', 'DEFAULT', 'CHECK', 'CONSTRAINT', 'VIEW', 'TRIGGER',
];

// 表名
const TABLE_NAMES = [
  'student', 'teacher', 'class', 'subject', 'course_schedule', 'student_subject',
  'exam_score', 'learning_behavior', 'family_background', 'risk_alert',
  'learning_suggestion', 'nl2sql_log', 'change_history',
];

// SQL 函数
const SQL_FUNCTIONS = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'UPPER', 'LOWER', 'LENGTH', 'CONCAT', 'COALESCE', 'IFNULL', 'CAST', 'ROUND', 'FORMAT', 'SUBSTRING', 'TRIM', 'REPLACE'];

// 合并补全候选（不含列名，列名动态加载）
const STATIC_SUGGESTIONS = [
  ...SQL_KEYWORDS.map(kw => ({ text: kw, type: 'keyword' })),
  ...TABLE_NAMES.map(t => ({ text: t, type: 'table' })),
  ...SQL_FUNCTIONS.map(f => ({ text: f, type: 'function' })),
];

// ─── 语法高亮 ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightSQL(sql) {
  const keywords = new Set(SQL_KEYWORDS);
  const functions = new Set(SQL_FUNCTIONS);

  let result = '';
  let i = 0;
  while (i < sql.length) {
    // 字符串
    if (sql[i] === "'" || sql[i] === '"') {
      const quote = sql[i];
      let str = quote;
      i++;
      while (i < sql.length && sql[i] !== quote) {
        if (sql[i] === '\\') { str += sql[i]; i++; }
        if (i < sql.length) { str += sql[i]; i++; }
      }
      if (i < sql.length) { str += sql[i]; i++; }
      result += `<span style="color:var(--success)">${escapeHtml(str)}</span>`;
      continue;
    }

    // 数字
    if (/[0-9]/.test(sql[i]) && (i === 0 || /[\s,;(=<>+\-*/]/.test(sql[i - 1]))) {
      let num = '';
      while (i < sql.length && /[0-9.]/.test(sql[i])) { num += sql[i]; i++; }
      result += `<span style="color:var(--accent)">${escapeHtml(num)}</span>`;
      continue;
    }

    // 标识符 / 关键字
    if (/[a-zA-Z_]/.test(sql[i])) {
      let word = '';
      while (i < sql.length && /[a-zA-Z0-9_]/.test(sql[i])) { word += sql[i]; i++; }

      // 检查下一个词是否是 BY（GROUP BY, ORDER BY）
      const rest = sql.slice(i);
      const byMatch = rest.match(/^\s+BY\b/i);
      if ((word.toUpperCase() === 'GROUP' || word.toUpperCase() === 'ORDER') && byMatch) {
        result += `<span style="color:#7c3aed">${escapeHtml(word)}</span>`;
        let ws = '';
        let j = 0;
        while (j < rest.length && /\s/.test(rest[j])) { ws += rest[j]; j++; }
        result += escapeHtml(ws);
        i += j;
        result += `<span style="color:#7c3aed">BY</span>`;
        i += 2;
        continue;
      }

      const upper = word.toUpperCase();
      if (keywords.has(upper)) {
        result += `<span style="color:#7c3aed">${escapeHtml(word)}</span>`;
      } else if (functions.has(upper)) {
        result += `<span style="color:#2563eb">${escapeHtml(word)}</span>`;
      } else if (TABLE_NAMES.includes(word.toLowerCase())) {
        result += `<span style="color:var(--primary)">${escapeHtml(word)}</span>`;
      } else {
        result += escapeHtml(word);
      }
      continue;
    }

    // 注释 --
    if (sql[i] === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
      let comment = '';
      while (i < sql.length && sql[i] !== '\n') { comment += sql[i]; i++; }
      result += `<span style="color:rgba(11,101,101,0.35)">${escapeHtml(comment)}</span>`;
      continue;
    }

    // 其他字符
    result += escapeHtml(sql[i]);
    i++;
  }
  return result;
}

// ─── 语法检查 ────────────────────────────────────────────────────────────────

function checkSqlSyntax(sql) {
  if (!sql.trim()) return { ok: true, message: '' };
  const errors = [];

  // 1. 未闭合引号
  let inSingle = false, inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "'" && !inDouble) inSingle = !inSingle;
    if (sql[i] === '"' && !inSingle) inDouble = !inDouble;
  }
  if (inSingle) errors.push('存在未闭合的单引号');
  if (inDouble) errors.push('存在未闭合的双引号');

  // 2. 未闭合括号
  let parenDepth = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === '(') parenDepth++;
    if (sql[i] === ')') parenDepth--;
    if (parenDepth < 0) { errors.push('存在多余的右括号'); break; }
  }
  if (parenDepth > 0) errors.push('存在未闭合的左括号');

  // 3. 常见拼写错误
  const typos = { SELET: 'SELECT', FORM: 'FROM', WERE: 'WHERE', DELTE: 'DELETE', ISNERT: 'INSERT', UPADTE: 'UPDATE', COUTN: 'COUNT', SEELCT: 'SELECT', FOMR: 'FROM', WHREE: 'WHERE', DELEET: 'DELETE', INSRET: 'INSERT', UPDAET: 'UPDATE' };
  const words = sql.split(/[\s,;(]+/);
  for (const w of words) {
    const upper = w.toUpperCase().replace(/[^A-Z]/g, '');
    if (typos[upper]) errors.push(`可能的拼写错误: ${upper} → ${typos[upper]}`);
  }

  // 4. 结构性检查
  const upperSql = sql.toUpperCase().replace(/\s+/g, ' ').trim();
  const firstWord = upperSql.split(/\s/)[0];

  if (firstWord === 'SELECT') {
    // SELECT 后面应该有 FROM（简单检查）
    if (!upperSql.includes('FROM') && upperSql.length > 10) {
      errors.push('SELECT 语句缺少 FROM 子句');
    }
  } else if (firstWord === 'INSERT') {
    if (!upperSql.includes('INTO')) {
      errors.push('INSERT 语句缺少 INTO 关键字');
    }
  } else if (firstWord === 'UPDATE') {
    if (!upperSql.includes('SET')) {
      errors.push('UPDATE 语句缺少 SET 关键字');
    }
  } else if (firstWord === 'DELETE') {
    if (!upperSql.includes('FROM')) {
      errors.push('DELETE 语句缺少 FROM 关键字');
    }
  }

  // 5. 检查连续关键字（如 SELECT SELECT）
  const sqlWords = upperSql.replace(/[^A-Z\s]/g, '').split(/\s+/).filter(Boolean);
  for (let i = 0; i < sqlWords.length - 1; i++) {
    if (sqlWords[i] === sqlWords[i + 1] && !['AND', 'OR', 'NOT', 'ALL'].includes(sqlWords[i])) {
      errors.push(`连续重复关键字: ${sqlWords[i]}`);
      break;
    }
  }

  // 6. 检查空括号函数调用（可能是误操作）
  const emptyFuncMatch = upperSql.match(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\s*\(\s*\)/);
  if (emptyFuncMatch) {
    errors.push(`关键字 ${emptyFuncMatch[1]} 后不应有空括号`);
  }

  if (errors.length > 0) return { ok: false, message: errors[0] };
  return { ok: true, message: '语法检查通过' };
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

function getWordAtCursor(text, cursorPos) {
  let end = cursorPos;
  let start = cursorPos;
  while (start > 0 && /[a-zA-Z0-9_.]/.test(text[start - 1])) start--;
  while (end < text.length && /[a-zA-Z0-9_.]/.test(text[end])) end++;
  return { word: text.slice(start, end), start, end };
}

function getSqlType(sql) {
  const first = sql.trim().split(/\s+/)[0]?.toUpperCase();
  if (['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'].includes(first)) return 'query';
  return 'execute';
}

// 计算光标在 textarea 中的像素位置（使用 mirror div）
function getCaretCoordinates(textarea, position) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  const props = [
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'boxSizing', 'wordWrap', 'whiteSpace', 'wordBreak', 'tabSize',
  ];
  for (const prop of props) {
    div.style[prop] = style[prop];
  }

  div.style.position = 'absolute';
  div.style.top = '-9999px';
  div.style.left = '-9999px';
  div.style.visibility = 'hidden';
  div.style.width = textarea.offsetWidth + 'px';
  div.style.height = 'auto';
  div.style.overflow = 'hidden';

  const textBefore = textarea.value.substring(0, position);
  const textNode = document.createTextNode(textBefore);
  div.appendChild(textNode);

  const span = document.createElement('span');
  span.textContent = '|';
  div.appendChild(span);

  const textAfter = document.createTextNode(textarea.value.substring(position));
  div.appendChild(textAfter);

  document.body.appendChild(div);

  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();

  document.body.removeChild(div);

  return {
    left: spanRect.left - divRect.left + textareaRect.left - textarea.scrollLeft,
    top: spanRect.top - divRect.top + textareaRect.top - textarea.scrollTop,
    height: spanRect.height,
  };
}

// ─── 共享编辑器样式 ──────────────────────────────────────────────────────────

const EDITOR_FONT = {
  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  fontSize: '0.8125rem',
  lineHeight: 1.7,
  letterSpacing: 'normal',
  padding: '0.5625rem 0.875rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  tabSize: 2,
  boxSizing: 'border-box',
};

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export default function SqlEditorModal({ open, onClose }) {
  const [sql, setSql] = useState('');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // 列名缓存
  const [tableColumns, setTableColumns] = useState({});

  // 自动补全状态
  const [autocomplete, setAutocomplete] = useState({
    visible: false, items: [], index: 0, start: 0, end: 0, x: 0, y: 0,
  });

  const textareaRef = useRef(null);
  const autocompleteRef = useRef(null);
  const justAppliedRef = useRef(false);

  // 语法检查
  const syntaxCheck = checkSqlSyntax(sql);

  // 加载表列信息
  useEffect(() => {
    if (!open) return;
    async function fetchColumns() {
      try {
        const res = await api.get('/admin/data/tables', { headers: { 'X-Admin-Role': 'admin' } });
        const tables = res.data?.data || [];
        const colMap = {};
        tables.forEach(t => {
          if (t.columns) {
            colMap[t.name] = t.columns.map(c => c.name);
          }
        });
        setTableColumns(colMap);
      } catch (err) {
        console.error('获取表列信息失败:', err);
      }
    }
    fetchColumns();
  }, [open]);

  // 关闭时重置
  const handleClose = useCallback(() => {
    setSql('');
    setResult(null);
    setHistory([]);
    setHistoryOpen(false);
    setConfirmDialog(null);
    setAutocomplete({ visible: false, items: [], index: 0, start: 0, end: 0, x: 0, y: 0 });
    onClose();
  }, [onClose]);

  // 点击背景关闭
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // 点击外部关闭自动补全
  useEffect(() => {
    if (!autocomplete.visible) return;
    const handleClick = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setAutocomplete(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [autocomplete.visible]);

  const updateAutocomplete = useCallback((text, cursorPos) => {
    // 如果刚刚应用了补全，不重新触发
    if (justAppliedRef.current) {
      justAppliedRef.current = false;
      return;
    }

    const { word, start, end } = getWordAtCursor(text, cursorPos);
    if (word.length === 0) {
      setAutocomplete(prev => ({ ...prev, visible: false, items: [], index: 0, start, end }));
      return;
    }

    // 检查是否是 table.column 模式
    const dotIndex = word.lastIndexOf('.');
    let matches = [];

    if (dotIndex > 0) {
      const tableName = word.slice(0, dotIndex).toLowerCase();
      const colPrefix = word.slice(dotIndex + 1).toUpperCase();
      const columns = tableColumns[tableName];
      if (columns) {
        matches = columns
          .filter(c => colPrefix === '' || c.toUpperCase().startsWith(colPrefix))
          .slice(0, 8)
          .map(c => ({ text: c, type: 'column' }));
      }
    } else {
      const prefix = word.toUpperCase();
      // 静态建议
      matches = STATIC_SUGGESTIONS.filter(s => s.text.toUpperCase().startsWith(prefix)).slice(0, 8);
      // 如果前缀匹配表名，也添加该表的列名
      const matchedTable = TABLE_NAMES.find(t => t.toUpperCase().startsWith(prefix) && t.toUpperCase() !== prefix);
      if (matchedTable && tableColumns[matchedTable] && matches.length < 6) {
        const colSuggestions = tableColumns[matchedTable].slice(0, 3).map(c => ({ text: `${matchedTable}.${c}`, type: 'column' }));
        matches = [...matches, ...colSuggestions].slice(0, 8);
      }
    }

    if (matches.length === 0 || (matches.length === 1 && matches[0].text.toUpperCase() === word.toUpperCase())) {
      setAutocomplete(prev => ({ ...prev, visible: false, items: [], index: 0, start, end }));
      return;
    }

    // 计算光标像素位置
    let coords = { x: 0, y: 0 };
    if (textareaRef.current) {
      const caret = getCaretCoordinates(textareaRef.current, cursorPos);
      coords = { x: caret.left, y: caret.top + caret.height };
    }

    setAutocomplete({ visible: true, items: matches, index: 0, start, end, x: coords.x, y: coords.y });
  }, [tableColumns]);

  const applyAutocomplete = useCallback((item) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value;
    const { start, end } = autocomplete;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newText = before + item.text + after;
    setSql(newText);
    const newCursor = start + item.text.length;
    justAppliedRef.current = true;
    setAutocomplete({ visible: false, items: [], index: 0, start: 0, end: 0, x: 0, y: 0 });
    requestAnimationFrame(() => {
      textarea.selectionStart = newCursor;
      textarea.selectionEnd = newCursor;
      textarea.focus();
    });
  }, [autocomplete]);

  const addHistory = useCallback((sqlText, type, success, elapsed) => {
    setHistory(prev => [
      { sql: sqlText, type, success, elapsed, time: new Date() },
      ...prev,
    ].slice(0, 10));
  }, []);

  const executeSql = useCallback(async (sqlText, confirmed = false) => {
    const trimmed = sqlText.trim();
    if (!trimmed) return;

    setExecuting(true);
    setResult(null);
    const startTime = performance.now();

    try {
      const body = { sql: trimmed };
      if (confirmed) body.confirmed = true;
      const res = await api.post('/admin/data/execute-sql', body, { headers: { 'X-Admin-Role': 'admin' } });
      const elapsed = Math.round(performance.now() - startTime);
      const data = res.data?.data || res.data;

      if (data.needs_confirm) {
        setConfirmDialog({ sql: trimmed });
        setExecuting(false);
        return;
      }

      const sqlType = getSqlType(trimmed);

      if (sqlType === 'query') {
        const columns = data.columns || [];
        const rows = data.rows || data.results || [];
        setResult({
          type: rows.length > 0 ? 'query' : 'empty',
          columns,
          rows,
          elapsed,
          count: rows.length,
        });
        addHistory(trimmed, 'query', true, elapsed);
      } else {
        const affected = data.affected_rows ?? data.rowcount ?? 0;
        setResult({
          type: 'execute',
          affected,
          message: data.message || `影响 ${affected} 行`,
          elapsed,
        });
        addHistory(trimmed, 'execute', true, elapsed);
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message || err.message || '执行失败';
      setResult({ type: 'error', message: msg, elapsed });
      addHistory(trimmed, getSqlType(trimmed), false, elapsed);
    } finally {
      setExecuting(false);
    }
  }, [addHistory]);

  const handleKeyDown = useCallback((e) => {
    // 自动补全键盘操作
    if (autocomplete.visible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: Math.min(prev.index + 1, prev.items.length - 1) }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: Math.max(prev.index - 1, 0) }));
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const item = autocomplete.items[autocomplete.index];
        if (item) applyAutocomplete(item);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = autocomplete.items[autocomplete.index];
        if (item) {
          applyAutocomplete(item);
        } else {
          // 没有选中项，关闭补全并插入换行
          setAutocomplete(prev => ({ ...prev, visible: false }));
          const textarea = textareaRef.current;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newText = sql.slice(0, start) + '\n' + sql.slice(end);
          setSql(newText);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1;
          });
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, visible: false }));
        return;
      }
    }

    // Ctrl+Enter 执行
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeSql(sql);
      return;
    }

    // Tab 缩进
    if (e.key === 'Tab' && !autocomplete.visible) {
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = sql.slice(0, start) + '  ' + sql.slice(end);
      setSql(newText);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [autocomplete, applyAutocomplete, executeSql, sql]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setSql(val);
    const cursorPos = e.target.selectionStart;
    updateAutocomplete(val, cursorPos);
  }, [updateAutocomplete]);

  const handleCursorChange = useCallback(() => {
    // 补全菜单可见时不重新计算，避免重置选中索引
    if (autocomplete.visible) return;
    const textarea = textareaRef.current;
    if (textarea) {
      updateAutocomplete(textarea.value, textarea.selectionStart);
    }
  }, [updateAutocomplete, autocomplete.visible]);

  const handleConfirmExecute = useCallback(() => {
    setConfirmDialog(null);
    executeSql(confirmDialog.sql, true);
  }, [confirmDialog, executeSql]);

  const handleHistoryClick = useCallback((item) => {
    setSql(item.sql);
    setAutocomplete({ visible: false, items: [], index: 0, start: 0, end: 0, x: 0, y: 0 });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // 同步 textarea 和 pre 的滚动
  const handleScroll = useCallback((e) => {
    const pre = e.target.previousElementSibling;
    if (pre) {
      pre.scrollTop = e.target.scrollTop;
      pre.scrollLeft = e.target.scrollLeft;
    }
  }, []);

  if (!open) return null;

  // 计算自动补全菜单宽度
  const acMaxItemLen = autocomplete.items.reduce((max, item) => Math.max(max, item.text.length), 0);
  const acWidth = Math.min(320, Math.max(160, acMaxItemLen * 8 + 60));

  return createPortal(
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.backdrop} />
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 顶部高光线 */}
        <div style={styles.highlightLine} />

        {/* 标题栏 */}
        <div style={styles.header}>
          <h2 style={styles.title}>自定义 SQL</h2>
          <button onClick={handleClose} style={styles.closeBtn}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}>
            <X size={18} />
          </button>
        </div>

        {/* 编辑区 - overlay 方式实现语法高亮 */}
        <div style={styles.editorContainer}>
          <div style={styles.editorWrapper}>
            {/* 高亮层 - 在 textarea 下面 */}
            <pre
              style={{
                ...EDITOR_FONT,
                ...styles.editorBase,
                color: '#1a2b2b',
                margin: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
              dangerouslySetInnerHTML={{ __html: sql ? highlightSQL(sql) + '\n' : '\n' }}
            />
            {/* 输入层 - 透明文字，可见光标 */}
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={handleInputChange}
              onKeyUp={handleCursorChange}
              onClick={handleCursorChange}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              style={{
                ...EDITOR_FONT,
                ...styles.editorBase,
                color: 'transparent',
                caretColor: 'var(--primary)',
                WebkitTextFillColor: 'transparent',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
              }}
              placeholder="输入 SQL 语句... (Ctrl+Enter 执行)"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>

          {/* 语法检查 */}
          <div style={styles.syntaxRow}>
            {syntaxCheck.message && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.6875rem',
                fontWeight: 500,
                color: syntaxCheck.ok ? 'var(--success)' : 'var(--danger)',
              }}>
                {syntaxCheck.ok
                  ? <><CheckCircle2 size={11} />{syntaxCheck.message}</>
                  : <><AlertCircle size={11} />{syntaxCheck.message}</>
                }
              </span>
            )}
          </div>

          {/* 执行按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
            <button
              className="liquid-btn liquid-btn-primary"
              onClick={() => executeSql(sql)}
              disabled={executing || !sql.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', opacity: (!sql.trim() || executing) ? 0.5 : 1 }}
            >
              {executing ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
              执行
            </button>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)' }}>Ctrl+Enter</span>
          </div>
        </div>

        {/* 结果区 */}
        <div style={styles.resultContainer} className="liquid-scroll">
          {executing && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'rgba(11,101,101,0.4)', gap: '0.5rem' }}>
              <Loader2 size={16} className="spin" />
              <span style={{ fontSize: '0.8125rem' }}>执行中...</span>
            </div>
          )}

          {!executing && result && result.type === 'query' && (
            <>
              <div style={{ overflowX: 'auto', borderRadius: '0.625rem', border: '0.5px solid rgba(11,101,101,0.08)' }}>
                <table className="liquid-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      {result.columns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, idx) => (
                      <tr key={idx}>
                        {result.columns.map(col => (
                          <td key={col} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row[col] != null ? String(row[col]) : <span style={{ color: 'rgba(11,101,101,0.25)' }}>NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)' }}>
                <span>{result.count} 行</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={10} />{result.elapsed}ms</span>
              </div>
            </>
          )}

          {!executing && result && result.type === 'empty' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>
              查询结果为空
              <div style={{ fontSize: '0.6875rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Clock size={10} />{result.elapsed}ms
              </div>
            </div>
          )}

          {!executing && result && result.type === 'execute' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(26,138,90,0.04)', borderRadius: '0.625rem', border: '0.5px solid rgba(26,138,90,0.1)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(26,138,90,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#1a2b2b', fontWeight: 500 }}>{result.message}</div>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', marginTop: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={10} />{result.elapsed}ms
                </div>
              </div>
            </div>
          )}

          {!executing && result && result.type === 'error' && (
            <div className="liquid-alert liquid-alert-error">
              <AlertCircle size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem' }}>{result.message}</div>
                <div style={{ fontSize: '0.6875rem', marginTop: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.7 }}>
                  <Clock size={10} />{result.elapsed}ms
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 历史记录 */}
        <div style={styles.historyContainer}>
          <button
            style={styles.historyToggle}
            onClick={() => setHistoryOpen(prev => !prev)}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.5)'; }}
          >
            {historyOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>执行历史</span>
            {history.length > 0 && <span style={{ fontSize: '0.5625rem', background: 'rgba(11,101,101,0.08)', borderRadius: '9999px', padding: '0.0625rem 0.375rem', color: 'rgba(11,101,101,0.45)' }}>{history.length}</span>}
          </button>
          {historyOpen && history.length > 0 && (
            <div style={styles.historyList} className="liquid-scroll">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  style={styles.historyItem}
                  onClick={() => handleHistoryClick(item)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(11,101,101,0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.5625rem',
                      fontWeight: 600,
                      padding: '0.0625rem 0.3125rem',
                      borderRadius: '0.25rem',
                      flexShrink: 0,
                      ...(item.type === 'query'
                        ? { background: 'rgba(11,101,101,0.06)', color: 'var(--primary)' }
                        : { background: 'rgba(201,147,58,0.08)', color: 'var(--accent)' }),
                    }}>
                      {item.type === 'query' ? '查询' : '执行'}
                    </span>
                    <span style={{
                      fontSize: '0.6875rem',
                      color: '#2a3d3d',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                    }}>
                      {item.sql}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: item.success ? 'var(--success)' : 'var(--danger)',
                    }} />
                    <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)' }}>{item.elapsed}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {historyOpen && history.length === 0 && (
            <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.3)' }}>
              暂无执行记录
            </div>
          )}
        </div>
      </div>

      {/* 自动补全菜单 - 通过 portal 渲染到 body */}
      {autocomplete.visible && autocomplete.items.length > 0 && createPortal(
        <div
          ref={autocompleteRef}
          style={{
            position: 'fixed',
            left: Math.min(autocomplete.x, window.innerWidth - acWidth - 10),
            top: autocomplete.y + 4,
            width: acWidth,
            zIndex: 10001,
            animation: 'acFadeIn 0.15s ease',
          }}
        >
          <div style={styles.autocompleteInner}>
            <div style={styles.autocompleteHighlight} />
            {autocomplete.items.map((item, idx) => (
              <div
                key={item.text + item.type}
                style={{
                  ...styles.autocompleteItem,
                  ...(idx === autocomplete.index ? styles.autocompleteItemActive : {}),
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyAutocomplete(item);
                }}
                onMouseEnter={() => setAutocomplete(prev => ({ ...prev, index: idx }))}
              >
                <span style={{
                  fontSize: '0.5625rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: item.type === 'keyword' ? '#7c3aed' : item.type === 'table' ? 'var(--primary)' : item.type === 'column' ? 'var(--accent)' : '#2563eb',
                  width: 28,
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}>
                  {item.type === 'keyword' ? 'KW' : item.type === 'table' ? 'TBL' : item.type === 'column' ? 'COL' : 'FN'}
                </span>
                <span style={{ color: idx === autocomplete.index ? 'var(--primary)' : '#2a3d3d', fontWeight: idx === autocomplete.index ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* 二次确认对话框 */}
      {confirmDialog && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmDialog(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.72)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '0.5px solid rgba(11,101,101,0.12)',
            borderRadius: '1rem',
            padding: '1.5rem',
            width: 440,
            maxWidth: '90vw',
            boxShadow: '0 2px 6px rgba(11,101,101,0.06), 0 8px 24px rgba(11,101,101,0.05), 0 16px 48px rgba(11,101,101,0.03)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 0.5, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', color: '#1a2b2b', fontWeight: 600 }}>确认执行</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'rgba(11,101,101,0.6)' }}>
                  该语句将修改数据库数据，是否确认执行？
                </p>
              </div>
            </div>
            <div style={{
              background: 'rgba(11,101,101,0.04)',
              border: '0.5px solid rgba(11,101,101,0.08)',
              borderRadius: '0.625rem',
              padding: '0.75rem',
              marginBottom: '1rem',
              maxHeight: 120,
              overflowY: 'auto',
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontSize: '0.75rem',
              color: 'var(--primary-dark)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }} className="liquid-scroll">
              {confirmDialog.sql}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="liquid-btn" onClick={() => setConfirmDialog(null)}>取消</button>
              <button className="liquid-btn liquid-btn-danger" onClick={handleConfirmExecute} disabled={executing}>
                {executing && <Loader2 size={14} className="spin" />}
                确认执行
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 自动补全入场动画 keyframes */}
      <style>{`
        @keyframes acFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    WebkitBackdropFilter: 'blur(4px)',
    backdropFilter: 'blur(4px)',
  },

  modal: {
    position: 'relative',
    background: 'rgba(255,255,255,0.85)',
    WebkitBackdropFilter: 'blur(24px)',
    backdropFilter: 'blur(24px)',
    border: '0.5px solid rgba(11,101,101,0.08)',
    borderRadius: 16,
    width: 'min(720px, 90vw)',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)',
    overflow: 'hidden',
  },

  highlightLine: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: 0.5,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
    pointerEvents: 'none',
    zIndex: 1,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1.25rem',
    borderBottom: '0.5px solid rgba(11,101,101,0.08)',
    flexShrink: 0,
  },

  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a2b2b',
  },

  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(11,101,101,0.35)',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    transition: 'all 0.15s ease',
  },

  editorContainer: {
    padding: '1rem 1.25rem',
    flexShrink: 0,
  },

  editorWrapper: {
    position: 'relative',
    height: 160,
    background: 'rgba(11,101,101,0.02)',
    border: '0.5px solid rgba(11,101,101,0.1)',
    borderRadius: '0.625rem',
    overflow: 'hidden',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },

  editorBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  syntaxRow: {
    minHeight: '1rem',
    marginTop: '0.375rem',
  },

  resultContainer: {
    flex: 1,
    padding: '0 1.25rem',
    overflowY: 'auto',
    minHeight: 0,
  },

  historyContainer: {
    borderTop: '0.5px solid rgba(11,101,101,0.08)',
    flexShrink: 0,
  },

  historyToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    width: '100%',
    padding: '0.5625rem 1.25rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'rgba(11,101,101,0.5)',
    transition: 'color 0.15s ease',
  },

  historyList: {
    maxHeight: 180,
    overflowY: 'auto',
    padding: '0 1.25rem 0.5rem',
  },

  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4375rem 0.5rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    marginBottom: '0.125rem',
  },

  autocompleteInner: {
    position: 'relative',
    background: 'rgba(255,255,255,0.72)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    backdropFilter: 'blur(16px) saturate(180%)',
    border: '0.5px solid rgba(11,101,101,0.1)',
    borderRadius: '0.625rem',
    boxShadow: '0 2px 6px rgba(11,101,101,0.06), 0 8px 24px rgba(11,101,101,0.05)',
    padding: '0.25rem',
    overflow: 'hidden',
  },

  autocompleteHighlight: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: 0.5,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
    pointerEvents: 'none',
  },

  autocompleteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.625rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    transition: 'background 0.15s ease',
  },

  autocompleteItemActive: {
    background: 'rgba(11,101,101,0.06)',
  },
};
