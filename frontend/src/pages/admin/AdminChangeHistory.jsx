import React, { useState, useEffect } from 'react';
import { Clock, Database, Plus, Pencil, Trash2, ChevronDown, User, Code, Copy, Check, FileText, FileJson, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import { getChangeHistory } from '../../api';

// change_detail 字段中文映射
const DETAIL_LABEL_MAP = {
  risk_level: '风险等级',
  risk_score: '风险评分',
  features: '特征数据',
  intervention_status: '干预状态',
  intervention_measure: '干预措施',
  student_id: '学生ID',
  student_name: '学生姓名',
  suggestion_id: '建议ID',
  student_feedback: '学生反馈',
  question: '查询问题',
  is_correct: '是否正确',
  execution_time_ms: '执行耗时(ms)',
};

// record_data 字段中文映射
const RECORD_LABEL_MAP = {
  alert_id: '预警ID',
  student_id: '学生ID',
  student_name: '学生姓名',
  risk_level: '风险等级',
  risk_score: '风险评分',
  alert_time: '预警时间',
  intervention_status: '干预状态',
  intervention_measure: '干预措施',
  intervention_result: '干预结果',
  risk_factors: '风险因素',
  suggestion_id: '建议ID',
  suggestion_content: '建议内容',
  generate_time: '生成时间',
  student_feedback: '学生反馈',
  log_id: '日志ID',
  natural_language_input: '自然语言输入',
  generated_sql: '生成SQL',
  execution_time_ms: '执行耗时(ms)',
  is_correct: '是否正确',
  query_time: '查询时间',
  attendance_rate: '出勤率',
  motivation_level: '学习动力',
  score_id: '成绩ID',
  subject_id: '科目ID',
  exam_stage: '考试阶段',
  score: '成绩',
  teacher_id: '教师ID',
  teacher_name: '教师姓名',
  course_id: '课程ID',
  class_id: '班级ID',
  course_name: '课程名称',
  course_time: '上课时间',
  course_type: '课程类型',
  semester: '学期',
  school_support: '学校支持',
  parent_education: '家长教育',
  internet_access: '网络接入',
  guardian: '监护人',
  address: '地址',
  sex: '性别',
  age: '年龄',
  school: '学校',
  reason: '原因',
  goal: '目标',
  result: '结果',
  status: '状态',
  created_at: '创建时间',
  updated_at: '更新时间',
};

const OPERATOR_SUFFIX = {
  system: '',
  admin: '管理员',
  teacher: '老师',
  student: '同学',
  parent: '家长',
};

const SORT_DIR = { asc: 'asc', desc: 'desc' };

function formatTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatOperator(item) {
  const role = item.operator_role || 'system';
  const name = item.operator_name || '未知';
  const id = item.operator_id;
  if (role === 'system') return '未知';
  const suffix = OPERATOR_SUFFIX[role] || '';
  const idPart = id ? `(${id})` : '';
  return `${name}${suffix}${idPart}`;
}

function DetailGrid({ data, labelMap, useChinese = true }) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.375rem' }}>
      {entries.map(([key, val]) => (
        <div key={key} style={{ fontSize: '0.75rem', display: 'flex', gap: '0.375rem', alignItems: 'baseline' }}>
          <span style={{ color: 'rgba(11,101,101,0.45)', flexShrink: 0, minWidth: 80 }}>{useChinese ? (labelMap[key] || key) : key}:</span>
          <span style={{ color: '#1a2b2b', fontWeight: 500, wordBreak: 'break-all' }}>
            {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
          </span>
        </div>
      ))}
    </div>
  );
}

function fallbackCopy(text, onSuccess) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    onSuccess();
  } catch { /* ignore */ }
  document.body.removeChild(ta);
}

const SQL_KEYWORDS = /\b(INSERT|INTO|UPDATE|SET|DELETE|FROM|WHERE|VALUES|SELECT|AND|OR|NOT|NULL|IS|IN|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|EXISTS|UNION|ALL|CREATE|ALTER|DROP|TABLE|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CONSTRAINT)\b/gi;

function highlightSQL(sql) {
  if (!sql) return null;
  const breakBefore = /\b(SET|WHERE|VALUES|AND)\b/gi;
  let formatted = sql.replace(breakBefore, (m) => '\n' + m);

  const parts = [];
  let i = 0;
  while (i < formatted.length) {
    if (formatted[i] === "'") {
      let j = i + 1;
      while (j < formatted.length && formatted[j] !== "'") j++;
      if (j < formatted.length) j++;
      parts.push({ type: 'string', text: formatted.slice(i, j) });
      i = j;
    } else if (/\d/.test(formatted[i]) && (i === 0 || /[\s,=(]/.test(formatted[i - 1]))) {
      let j = i;
      while (j < formatted.length && /[\d.]/.test(formatted[j])) j++;
      parts.push({ type: 'number', text: formatted.slice(i, j) });
      i = j;
    } else {
      let j = i;
      while (j < formatted.length && formatted[j] !== "'" && !(/\d/.test(formatted[j]) && (j === 0 || /[\s,=(]/.test(formatted[j - 1])))) j++;
      if (j === i) j++;
      parts.push({ type: 'text', text: formatted.slice(i, j) });
      i = j;
    }
  }

  return parts.map((part, idx) => {
    if (part.type === 'string') {
      return <span key={idx} style={{ color: 'var(--success)' }}>{part.text}</span>;
    }
    if (part.type === 'number') {
      return <span key={idx} style={{ color: 'var(--accent)' }}>{part.text}</span>;
    }
    const pieces = part.text.split(SQL_KEYWORDS);
    return pieces.map((piece, pidx) => {
      if (SQL_KEYWORDS.test(piece)) {
        SQL_KEYWORDS.lastIndex = 0;
        return <span key={`${idx}-${pidx}`} style={{ color: '#7c3aed', fontWeight: 600 }}>{piece}</span>;
      }
      return <span key={`${idx}-${pidx}`}>{piece}</span>;
    });
  });
}

function CopyButton({ item, useChinese = true }) {
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [hovered, setHovered] = useState(false);

  const labelKey = (key, labelMap) => useChinese ? (labelMap[key] || key) : key;

  const formats = [
    {
      key: 'json',
      label: 'JSON',
      icon: FileJson,
      getText: () => {
        const detail = useChinese ? {
          操作类型: item.op_label,
          目标表: item.table_label,
          描述: item.description,
          操作人: formatOperator(item),
          时间: formatTime(item.created_at),
          变更详情: item.change_detail ? Object.fromEntries(Object.entries(item.change_detail).map(([k, v]) => [labelKey(k, DETAIL_LABEL_MAP), v])) : item.change_detail,
          SQL语句: item.sql_statement,
          记录数据: item.record_data ? Object.fromEntries(Object.entries(item.record_data).map(([k, v]) => [labelKey(k, RECORD_LABEL_MAP), v])) : item.record_data,
        } : {
          operation: item.operation,
          table: item.table_name,
          description: item.description,
          operator: formatOperator(item),
          time: item.created_at,
          change_detail: item.change_detail,
          sql: item.sql_statement,
          record_data: item.record_data,
        };
        return JSON.stringify(detail, null, 2);
      },
    },
    {
      key: 'sql',
      label: 'SQL',
      icon: Code,
      getText: () => item.sql_statement || '',
    },
    {
      key: 'text',
      label: '纯文本',
      icon: FileText,
      getText: () => {
        const lines = useChinese ? [
          `操作类型: ${item.op_label}`,
          `目标表: ${item.table_label}`,
          `描述: ${item.description}`,
          `操作人: ${formatOperator(item)}`,
          `时间: ${formatTime(item.created_at)}`,
        ] : [
          `Operation: ${item.operation}`,
          `Table: ${item.table_name}`,
          `Description: ${item.description}`,
          `Operator: ${formatOperator(item)}`,
          `Time: ${item.created_at}`,
        ];
        if (item.change_detail && typeof item.change_detail === 'object') {
          lines.push(useChinese ? '变更详情:' : 'Change Detail:');
          Object.entries(item.change_detail).forEach(([k, v]) => {
            lines.push(`  ${labelKey(k, DETAIL_LABEL_MAP)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
          });
        }
        if (item.sql_statement) lines.push(`SQL: ${item.sql_statement}`);
        if (item.record_data && typeof item.record_data === 'object') {
          lines.push(useChinese ? '记录数据:' : 'Record Data:');
          Object.entries(item.record_data).forEach(([k, v]) => {
            lines.push(`  ${labelKey(k, RECORD_LABEL_MAP)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
          });
        }
        return lines.join('\n');
      },
    },
  ];

  const handleCopy = (fmt, e) => {
    e.stopPropagation();
    const text = fmt.getText();
    if (text === undefined || text === null) return;
    const onSuccess = () => {
      setCopiedFormat(fmt.key);
      setTimeout(() => setCopiedFormat(null), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
        fallbackCopy(text, onSuccess);
      });
    } else {
      fallbackCopy(text, onSuccess);
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setCopiedFormat(null); }}
    >
      <button
        className="liquid-btn liquid-btn-sm"
        onClick={(e) => handleCopy(formats[0], e)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', padding: '0.1875rem 0.4375rem' }}
      >
        {copiedFormat === 'json' ? <Check size={10} style={{ color: 'var(--success)' }} /> : <Copy size={10} />}
        {copiedFormat === 'json' ? '已复制' : '复制'}
        <ChevronDown size={10} style={{ color: 'rgba(11,101,101,0.35)', transition: 'transform 0.2s ease', transform: hovered ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {hovered && (
        <div className="copy-dropdown">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <div
                key={fmt.key}
                className="liquid-select-option"
                onClick={(e) => handleCopy(fmt, e)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.6875rem',
                  padding: '0.1875rem 0.5rem',
                  background: copiedFormat === fmt.key ? 'rgba(11,101,101,0.06)' : undefined,
                  color: copiedFormat === fmt.key ? 'var(--primary)' : '#2a3d3d',
                }}
              >
                {copiedFormat === fmt.key
                  ? <Check size={10} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  : <Icon size={10} style={{ color: 'rgba(11,101,101,0.5)', flexShrink: 0 }} />}
                {copiedFormat === fmt.key ? '已复制' : fmt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminChangeHistory() {
  const [changeHistory, setChangeHistory] = useState([]);
  const [expandedChangeId, setExpandedChangeId] = useState(null);
  const [detailLang, setDetailLang] = useState('zh');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState(SORT_DIR.desc);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    getChangeHistory({ limit: 100 })
      .then((res) => setChangeHistory(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch((err) => console.error('加载变更历史失败:', err))
      .finally(() => setLoading(false));
  }, []);

  // 排序
  const sortedHistory = [...changeHistory].sort((a, b) => {
    let va = a[sortField];
    let vb = b[sortField];
    if (sortField === 'created_at') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
      return sortDir === SORT_DIR.asc ? va - vb : vb - va;
    }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === SORT_DIR.asc ? -1 : 1;
    if (va > vb) return sortDir === SORT_DIR.asc ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedHistory.length / pageSize);
  const pagedHistory = sortedHistory.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === SORT_DIR.asc ? SORT_DIR.desc : SORT_DIR.asc));
    } else {
      setSortField(field);
      setSortDir(field === 'created_at' ? SORT_DIR.desc : SORT_DIR.asc);
    }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 2 }} />;
    return sortDir === SORT_DIR.asc
      ? <ArrowUp size={10} style={{ marginLeft: 2 }} />
      : <ArrowDown size={10} style={{ marginLeft: 2 }} />;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>变更历史</h1>

      <LiquidCard style={{ padding: 0 }}>
        {pagedHistory.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="liquid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="sortable-th" onClick={() => handleSort('operation')}>
                      操作类型 <SortIcon field="operation" />
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('table_name')}>
                      目标表 <SortIcon field="table_name" />
                    </th>
                    <th>描述</th>
                    <th>操作人</th>
                    <th className="sortable-th" onClick={() => handleSort('created_at')}>
                      时间 <SortIcon field="created_at" />
                    </th>
                    <th style={{ width: 28 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistory.map((item) => {
                    const opIcon = item.operation === 'INSERT' || item.operation === 'GENERATE'
                      ? <Plus size={12} style={{ color: item.op_color }} />
                      : item.operation === 'UPDATE'
                        ? <Pencil size={12} style={{ color: item.op_color }} />
                        : <Trash2 size={12} style={{ color: item.op_color }} />;
                    const isExpanded = expandedChangeId === item.change_id;
                    return (
                      <React.Fragment key={item.change_id}>
                        <tr
                          className="change-row"
                          onClick={() => setExpandedChangeId(isExpanded ? null : item.change_id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: item.op_color, verticalAlign: 'middle' }}>
                              {opIcon}
                              {item.op_label}
                            </span>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)', verticalAlign: 'middle' }}>
                              {item.table_label}
                            </span>
                          </td>
                          <td style={{ verticalAlign: 'middle', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description || '--'}
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)', verticalAlign: 'middle' }}>
                              <User size={12} style={{ color: 'rgba(11,101,101,0.35)' }} />
                              {formatOperator(item)}
                            </span>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              <Clock size={10} />
                              {formatTime(item.created_at)}
                            </span>
                          </td>
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            <ChevronDown
                              size={14}
                              style={{
                                color: 'rgba(11,101,101,0.35)',
                                transition: 'transform 0.25s ease',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                display: 'inline-block',
                              }}
                            />
                          </td>
                        </tr>
                        <tr className="change-detail-row">
                          <td colSpan={6} style={{ padding: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                            <div
                              className="change-detail-wrapper"
                              style={{
                                maxHeight: isExpanded ? 800 : 0,
                                opacity: isExpanded ? 1 : 0,
                                overflow: 'hidden',
                                transition: 'max-height 0.3s ease, opacity 0.25s ease',
                              }}
                            >
                              <div style={{
                                padding: '0.75rem 1rem 1rem',
                                background: 'rgba(11,101,101,0.015)',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                                      变更详情 #{item.change_id}
                                    </span>
                                    <div className="liquid-tabs" style={{ padding: '0.125rem' }}>
                                      <button
                                        className={`liquid-tab ${detailLang === 'zh' ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setDetailLang('zh'); }}
                                        style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', background: detailLang === 'zh' ? 'rgba(255,255,255,0.75)' : 'transparent', color: detailLang === 'zh' ? 'var(--primary)' : 'rgba(11,101,101,0.45)', fontWeight: detailLang === 'zh' ? 600 : 400, boxShadow: detailLang === 'zh' ? '0 0.5px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(11,101,101,0.06)' : 'none', transition: 'all 0.2s ease' }}
                                      >中文</button>
                                      <button
                                        className={`liquid-tab ${detailLang === 'en' ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setDetailLang('en'); }}
                                        style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', background: detailLang === 'en' ? 'rgba(255,255,255,0.75)' : 'transparent', color: detailLang === 'en' ? 'var(--primary)' : 'rgba(11,101,101,0.45)', fontWeight: detailLang === 'en' ? 600 : 400, boxShadow: detailLang === 'en' ? '0 0.5px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(11,101,101,0.06)' : 'none', transition: 'all 0.2s ease' }}
                                      >EN</button>
                                    </div>
                                  </div>
                                  <CopyButton item={item} useChinese={detailLang === 'zh'} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.375rem', marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '0.375rem' }}>
                                    <span style={{ color: 'rgba(11,101,101,0.45)', minWidth: 80 }}>操作类型:</span>
                                    <span style={{ color: item.op_color, fontWeight: 600 }}>{item.op_label}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '0.375rem' }}>
                                    <span style={{ color: 'rgba(11,101,101,0.45)', minWidth: 80 }}>目标表:</span>
                                    <span style={{ color: '#1a2b2b', fontWeight: 500 }}>{item.table_label} ({item.table_name})</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '0.375rem' }}>
                                    <span style={{ color: 'rgba(11,101,101,0.45)', minWidth: 80 }}>操作人:</span>
                                    <span style={{ color: '#1a2b2b', fontWeight: 500 }}>{formatOperator(item)}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '0.375rem' }}>
                                    <span style={{ color: 'rgba(11,101,101,0.45)', minWidth: 80 }}>记录ID:</span>
                                    <span style={{ color: '#1a2b2b', fontWeight: 500 }}>{item.record_id || '--'}</span>
                                  </div>
                                </div>

                                {item.change_detail && typeof item.change_detail === 'object' && Object.keys(item.change_detail).length > 0 && (
                                  <div style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>
                                      变更字段
                                    </div>
                                    <DetailGrid data={item.change_detail} labelMap={DETAIL_LABEL_MAP} useChinese={detailLang === 'zh'} />
                                  </div>
                                )}

                                {item.record_data && typeof item.record_data === 'object' && Object.keys(item.record_data).length > 0 && (
                                  <div style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>
                                      表数据 ({item.table_label})
                                    </div>
                                    <DetailGrid data={item.record_data} labelMap={RECORD_LABEL_MAP} useChinese={detailLang === 'zh'} />
                                  </div>
                                )}

                                {item.sql_statement && (
                                  <div>
                                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', letterSpacing: '0.05em' }}>
                                      <Code size={10} style={{ color: 'rgba(11,101,101,0.35)' }} />
                                      SQL 语句
                                    </div>
                                    <div className="liquid-code" style={{ fontSize: '0.75rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                      {highlightSQL(item.sql_statement)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderTop: '0.5px solid rgba(11,101,101,0.05)',
              }}>
                <button
                  className="liquid-btn liquid-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </button>
                <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>
                  {page} / {totalPages}
                </span>
                <button
                  className="liquid-btn liquid-btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <Database size={32} style={{ color: 'rgba(11,101,101,0.15)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary">暂无变更记录</p>
          </div>
        )}
      </LiquidCard>
    </div>
  );
}
