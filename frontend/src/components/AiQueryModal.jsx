import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Clock, Database, AlertCircle, Copy, Check, Loader, X } from 'lucide-react';
import { nl2sqlQuery } from '../api';
import { useRole } from '../contexts/RoleContext';

const EXAMPLE_QUESTIONS = [
  '查询所有学生的平均成绩',
  '查询数学成绩前10名的学生',
  '查询出勤率低于80%的学生',
  '统计各科目的平均分',
  '查询高风险预警学生名单',
  '查询缺勤次数最多的10个学生',
];

function highlightSQL(sql) {
  if (!sql) return null;
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS',
    'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
    'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP',
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT',
    'ASC', 'DESC', 'BETWEEN', 'IS', 'NULL', 'UNION', 'ALL',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  ];
  let escaped = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  escaped = escaped.replace(/'([^']*)'/g, '<span style="color:var(--success)">\'$1\'</span>');
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:var(--accent)">$1</span>');
  const functions = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ROUND', 'COALESCE', 'IFNULL', 'CONCAT'];
  functions.forEach((fn) => {
    const regex = new RegExp(`\\b(${fn})\\s*\\(`, 'gi');
    escaped = escaped.replace(regex, '<span style="color:#2563eb">$1</span>(');
  });
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
    escaped = escaped.replace(regex, '<span style="color:#7c3aed;font-weight:600">$1</span>');
  });
  return escaped;
}

export default function AiQueryModal({ open, onClose }) {
  const { selectedAdminId, selectedAdminName } = useRole();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  const handleQuery = useCallback(async (q) => {
    const queryText = q || question;
    if (!queryText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await nl2sqlQuery(queryText.trim(), {
        operator_role: 'admin',
        operator_name: selectedAdminName || '管理员',
        operator_id: selectedAdminId || '',
      });
      const data = res.data;
      setResult(data);
      setHistory((prev) => [
        { question: queryText.trim(), sql: data.sql, execution_time_ms: data.execution_time_ms, error: data.error, timestamp: new Date() },
        ...prev,
      ].slice(0, 10));
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '查询失败';
      setResult({ error: errorMsg });
      setHistory((prev) => [
        { question: queryText.trim(), sql: null, execution_time_ms: null, error: errorMsg, timestamp: new Date() },
        ...prev,
      ].slice(0, 10));
    } finally {
      setLoading(false);
    }
  }, [question, selectedAdminId, selectedAdminName]);

  const handleCopySQL = async () => {
    if (!result?.sql) return;
    try {
      await navigator.clipboard.writeText(result.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const tableData = (() => {
    if (!result?.result || result.error) return null;
    const rows = Array.isArray(result.result) ? result.result : [];
    if (rows.length === 0) return { columns: [], rows: [] };
    const columns = Object.keys(rows[0]);
    return { columns, rows };
  })();

  if (!open) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.85)',
          WebkitBackdropFilter: 'blur(24px)',
          backdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(11,101,101,0.08)',
          borderRadius: 16,
          width: 'min(680px, 90vw)',
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部高光线 */}
        <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 0.5, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', pointerEvents: 'none', zIndex: 1 }} />

        {/* 标题栏 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: '0.5px solid rgba(11,101,101,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(11,101,101,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1a2b2b' }}>AI 自然语言查询</h2>
          </div>
          <button onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(11,101,101,0.35)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}>
            <X size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }} className="liquid-scroll">
          {/* 示例问题 */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.375rem' }}>示例问题：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {EXAMPLE_QUESTIONS.map((q) => (
                <button key={q} className="liquid-btn liquid-btn-sm liquid-btn-pill" onClick={() => { setQuestion(q); handleQuery(q); }} style={{ fontSize: '0.625rem' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* 输入区 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              className="liquid-input"
              placeholder="请输入您的问题..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              style={{ flex: 1 }}
            />
            <button
              className="liquid-btn liquid-btn-primary"
              onClick={() => handleQuery()}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />查询中...</> : <><Sparkles size={14} />查询</>}
            </button>
          </div>

          {/* 加载 */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Loader size={28} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginTop: '0.75rem' }}>AI 正在分析您的问题并生成 SQL 查询...</p>
            </div>
          )}

          {/* 结果 */}
          {!loading && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {result.error && (
                <div className="liquid-alert liquid-alert-error" style={{ fontSize: '0.75rem' }}>
                  <AlertCircle size={14} />
                  <div><div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>查询出错</div><div>{result.error}</div></div>
                </div>
              )}
              {result.sql && (
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.25rem' }}>生成的 SQL</div>
                  <pre className="liquid-code" style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem' }} dangerouslySetInnerHTML={{ __html: highlightSQL(result.sql) }} />
                  <button className="liquid-btn liquid-btn-sm" onClick={handleCopySQL} style={{ position: 'absolute', top: '1.25rem', right: '0.5rem', padding: '0.1875rem 0.375rem', fontSize: '0.625rem' }}>
                    {copied ? <Check size={10} /> : <Copy size={10} />}{copied ? '已复制' : '复制'}
                  </button>
                </div>
              )}
              {tableData && tableData.rows.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.25rem' }}>查询结果</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="liquid-table">
                      <thead><tr>{tableData.columns.map((col) => <th key={col}>{col}</th>)}</tr></thead>
                      <tbody>{tableData.rows.map((row, i) => <tr key={i}>{tableData.columns.map((col) => <td key={col}>{row[col] != null ? String(row[col]) : <span style={{ color: 'rgba(11,101,101,0.25)' }}>NULL</span>}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.45)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Database size={10} />共 {tableData.rows.length} 条</span>
                    {result.execution_time_ms != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={10} />{result.execution_time_ms}ms</span>}
                  </div>
                </div>
              )}
              {tableData && tableData.rows.length === 0 && !result.error && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <Database size={28} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)' }}>查询结果为空</p>
                </div>
              )}
            </div>
          )}

          {/* 历史 */}
          {history.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.375rem' }}>查询历史</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {history.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(11,101,101,0.02)', cursor: 'pointer', fontSize: '0.6875rem' }}
                    onClick={() => { setQuestion(item.question); handleQuery(item.question); }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a2b2b' }}>{item.question}</span>
                    <span style={{ flexShrink: 0, color: item.error ? 'var(--danger)' : 'var(--success)', fontSize: '0.625rem' }}>{item.error ? '失败' : '成功'}</span>
                    {item.execution_time_ms != null && <span style={{ flexShrink: 0, color: 'rgba(11,101,101,0.35)', fontSize: '0.625rem' }}>{item.execution_time_ms}ms</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {!result && !loading && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(11,101,101,0.12)', display: 'block', margin: '0 auto 0.75rem' }}>
                <path d="M12 0.5L13.5 8.5C13.6 9.1 14.1 9.6 14.7 9.7L22 11L14.7 12.3C14.1 12.4 13.6 12.9 13.5 13.5L12 21.5L10.5 13.5C10.4 12.9 9.9 12.4 9.3 12.3L2 11L9.3 9.7C9.9 9.6 10.4 9.1 10.5 8.5L12 0.5Z"/>
                <circle cx="20" cy="3" r="1.5"/>
                <circle cx="4" cy="20" r="1.5"/>
              </svg>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.25rem' }}>输入自然语言问题，AI 将自动生成 SQL 查询</p>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.3)' }}>点击上方示例问题快速体验</p>
            </div>
          )}
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>,
    document.body
  );
}
