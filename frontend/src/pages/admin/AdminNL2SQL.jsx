import { useState, useCallback } from 'react';
import { Sparkles, Clock, Database, AlertCircle, Copy, Check, Loader } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import { nl2sqlQuery } from '../../api';
import { useRole } from '../../contexts/RoleContext';

// 示例问题
const EXAMPLE_QUESTIONS = [
  '查询所有学生的平均成绩',
  '查询数学成绩前10名的学生',
  '查询出勤率低于80%的学生',
  '统计各科目的平均分',
  '查询高风险预警学生名单',
  '查询缺勤次数最多的10个学生',
  '统计男女学生的平均成绩差异',
  '查询各班级的平均成绩排名',
];

// SQL 语法高亮
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

  // 先转义 HTML
  let escaped = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 高亮字符串（单引号）
  escaped = escaped.replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>');

  // 高亮数字
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

  // 高亮函数名（COUNT、SUM、AVG 等后跟括号的）
  const functions = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ROUND', 'COALESCE', 'IFNULL', 'CONCAT'];
  functions.forEach((fn) => {
    const regex = new RegExp(`\\b(${fn})\\s*\\(`, 'gi');
    escaped = escaped.replace(regex, '<span class="function">$1</span>(');
  });

  // 高亮关键字
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
    escaped = escaped.replace(regex, '<span class="keyword">$1</span>');
  });

  return escaped;
}

export default function AdminNL2SQL() {
  const { selectedAdminId, selectedAdminName } = useRole();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { sql, result, error, execution_time_ms }
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  // 执行查询
  const handleQuery = useCallback(async (q) => {
    const queryText = q || question;
    if (!queryText.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await nl2sqlQuery(queryText.trim(), { operator_role: 'admin', operator_name: selectedAdminName || '管理员', operator_id: selectedAdminId || '' });
      const data = res.data;
      setResult(data);

      // 添加到历史记录
      setHistory((prev) => [
        {
          question: queryText.trim(),
          sql: data.sql,
          execution_time_ms: data.execution_time_ms,
          error: data.error,
          timestamp: new Date(),
        },
        ...prev,
      ].slice(0, 20)); // 最多保留 20 条
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '查询失败，请稍后重试';
      setResult({ error: errorMsg });
      setHistory((prev) => [
        {
          question: queryText.trim(),
          sql: null,
          execution_time_ms: null,
          error: errorMsg,
          timestamp: new Date(),
        },
        ...prev,
      ].slice(0, 20));
    } finally {
      setLoading(false);
    }
  }, [question, selectedAdminId, selectedAdminName]);

  // 点击示例问题
  const handleExampleClick = (q) => {
    setQuestion(q);
    handleQuery(q);
  };

  // 复制 SQL
  const handleCopySQL = async () => {
    if (!result?.sql) return;
    try {
      await navigator.clipboard.writeText(result.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // 处理结果数据为表格格式
  const tableData = (() => {
    if (!result?.result || result.error) return null;
    const rows = Array.isArray(result.result) ? result.result : [];
    if (rows.length === 0) return { columns: [], rows: [] };
    const columns = Object.keys(rows[0]);
    return { columns, rows };
  })();

  return (
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>AI 自然语言查询</h1>

      {/* 示例问题 */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.5rem' }}>
          示例问题：
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              className="liquid-btn liquid-btn-sm liquid-btn-pill"
              onClick={() => handleExampleClick(q)}
              style={{ fontSize: '0.6875rem' }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 输入区域 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          className="liquid-input"
          placeholder="请输入您的问题..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          style={{ flex: 1 }}
        />
        <button
          className={loading ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'}
          onClick={() => handleQuery()}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              AI 查询中...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              查询
            </>
          )}
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <LiquidCard style={{ marginBottom: '1.25rem', textAlign: 'center', padding: '3rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <Loader size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
            <p className="text-tertiary">AI 正在分析您的问题并生成 SQL 查询...</p>
          </div>
        </LiquidCard>
      )}

      {/* 查询结果 */}
      {!loading && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* 错误提示 */}
          {result.error && (
            <div className="liquid-alert liquid-alert-error">
              <AlertCircle size={16} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>查询出错</div>
                <div>{result.error}</div>
              </div>
            </div>
          )}

          {/* 生成的 SQL */}
          {result.sql && (
            <LiquidCard title="生成的 SQL">
              <div style={{ position: 'relative' }}>
                <pre
                  className="liquid-code"
                  style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: highlightSQL(result.sql) }}
                />
                <button
                  className="liquid-btn liquid-btn-sm"
                  onClick={handleCopySQL}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.25rem 0.5rem' }}
                  title="复制 SQL"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </LiquidCard>
          )}

          {/* 查询结果表格 */}
          {tableData && tableData.rows.length > 0 && (
            <LiquidCard title="查询结果">
              <div style={{ overflowX: 'auto' }}>
                <table className="liquid-table">
                  <thead>
                    <tr>
                      {tableData.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, i) => (
                      <tr key={i}>
                        {tableData.columns.map((col) => (
                          <td key={col}>
                            {row[col] != null ? String(row[col]) : <span className="text-placeholder">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '0.75rem',
                fontSize: '0.6875rem',
                color: 'rgba(11,101,101,0.45)',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Database size={10} />
                  共返回 {tableData.rows.length} 条记录
                </span>
                {result.execution_time_ms != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={10} />
                    耗时 {result.execution_time_ms}ms
                  </span>
                )}
              </div>
            </LiquidCard>
          )}

          {/* 空结果 */}
          {tableData && tableData.rows.length === 0 && !result.error && (
            <LiquidCard>
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <Database size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
                <p className="text-tertiary">查询结果为空，未找到匹配的数据</p>
              </div>
            </LiquidCard>
          )}
        </div>
      )}

      {/* 查询历史 */}
      {history.length > 0 && (
        <LiquidCard title="查询历史">
          <table className="liquid-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>问题</th>
                <th style={{ width: '35%' }}>SQL</th>
                <th>耗时</th>
                <th>状态</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.question}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <code style={{ fontSize: '0.75rem', color: 'var(--primary-dark)' }}>
                      {item.sql || '--'}
                    </code>
                  </td>
                  <td>
                    {item.execution_time_ms != null ? `${item.execution_time_ms}ms` : '--'}
                  </td>
                  <td>
                    {item.error ? (
                      <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>失败</span>
                    ) : (
                      <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>成功</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', whiteSpace: 'nowrap' }}>
                    {item.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LiquidCard>
      )}

      {/* 未查询时的提示 */}
      {!result && !loading && history.length === 0 && (
        <LiquidCard>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
          }}>
            <Sparkles size={48} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '1rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
              输入自然语言问题，AI 将自动生成 SQL 查询
            </p>
            <p className="text-placeholder" style={{ fontSize: '0.8125rem' }}>
              点击上方示例问题快速体验
            </p>
          </div>
        </LiquidCard>
      )}

      {/* spin 动画 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
