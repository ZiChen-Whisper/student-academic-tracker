import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, User, BookOpen, Home, AlertTriangle, Sparkles, Clock, Brain, X, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, Users, Database, Loader, Check, AlertCircle } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import ChartTooltip from '../../components/ChartTooltip';
import ChartFilterBtn from '../../components/ChartFilterBtn';
import { useRole } from '../../contexts/RoleContext';
import { getStudents, getStudent, getScoreTrend, getSuggestions, generateSuggestion, getAlerts, updateSuggestionFeedback, nl2sqlQuery } from '../../api';

const SUBJECT_MAP = { SUBJ_MATH: '数学', SUBJ_PORTUGUESE: '葡萄牙语', SUBJ_GENERAL: '综合' };
const SUBJECT_COLORS = { SUBJ_MATH: '#0b6565', SUBJ_PORTUGUESE: '#c9933a', SUBJ_GENERAL: '#1a8a5a' };
const FAMILY_VALUE_MAP = {
  'Primary': '小学', 'Middle School': '初中', 'High School': '高中', 'College': '大学', 'Postgraduate': '研究生', 'None': '无',
  'at_home': '居家', 'health': '医疗', 'other': '其他', 'services': '服务业', 'teacher': '教师',
  'High': '高', 'Medium': '中', 'Low': '低', 'yes': '是', 'no': '否',
};
const TABS = [
  { key: 'score', label: '成绩趋势', icon: BookOpen },
  { key: 'behavior', label: '学习行为', icon: Brain },
  { key: 'family', label: '家庭背景', icon: Home },
  { key: 'alert', label: '预警与建议', icon: AlertTriangle },
];
const SORT_DIR = { asc: 'asc', desc: 'desc' };
const RiskBadge = ({ level }) => {
  const cls = level === 'high' ? 'risk-high' : level === 'medium' ? 'risk-medium' : 'risk-low';
  const label = level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险';
  const Icon = level === 'low' ? CheckCircle : AlertTriangle;
  return <span className={'risk-badge ' + cls}><Icon size={10} />{label}</span>;
};

function highlightSQL(sql) {
  if (!sql) return null;
  const keywords = ['SELECT','FROM','WHERE','AND','OR','NOT','IN','LIKE','JOIN','LEFT','RIGHT','INNER','OUTER','ON','AS','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','INSERT','UPDATE','DELETE','CREATE','COUNT','SUM','AVG','MAX','MIN','DISTINCT','ASC','DESC','BETWEEN','IS','NULL','UNION','ALL','CASE','WHEN','THEN','ELSE','END'];
  let escaped = sql.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  escaped = escaped.replace(/'([^']*)'/g, '<span class="string">\'\'</span>');
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="number"></span>');
  const funcs = ['COUNT','SUM','AVG','MAX','MIN','ROUND','COALESCE','IFNULL','CONCAT'];
  funcs.forEach((fn) => { const r = new RegExp('\\b(' + fn + ')\\s*\\(', 'gi'); escaped = escaped.replace(r, '<span class="function"></span>('); });
  keywords.forEach((kw) => { const r = new RegExp('\\b(' + kw + ')\\b', 'gi'); escaped = escaped.replace(r, '<span class="keyword"></span>'); });
  return escaped;
}

const EXAMPLE_QUESTIONS = [
  '查询所有学生的平均成绩', '查询数学成绩前10名的学生', '查询出勤率低于80%的学生',
  '统计各科目的平均分', '查询高风险预警学生名单', '查询缺勤次数最多的10个学生',
  '统计男女学生的平均成绩差异', '查询各班级的平均成绩排名',
];

export default function TeacherStudent() {
  const { selectedTeacherClassId, selectedTeacherId, selectedTeacherName } = useRole();
  const classId = selectedTeacherClassId || '';
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sortField, setSortField] = useState('student_id');
  const [sortDir, setSortDir] = useState(SORT_DIR.asc);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('score');
  const [scoreData, setScoreData] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [alertData, setAlertData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [visibleSubjects, setVisibleSubjects] = useState(['SUBJ_MATH', 'SUBJ_PORTUGUESE', 'SUBJ_GENERAL']);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [queryQuestion, setQueryQuestion] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [queryCopied, setQueryCopied] = useState(false);
  useEffect(() => {
    setLoading(true);
    const params = classId ? { class_id: classId, per_page: 9999 } : { per_page: 9999 };
    getStudents(params)
      .then((res) => {
        const data = res.data;
        if (data?.data && Array.isArray(data.data)) {
          setStudents(data.data);
          setTotalStudents(data.total || data.data.length);
        } else if (Array.isArray(data)) {
          setStudents(data);
          setTotalStudents(data.length);
        } else {
          setStudents([]);
          setTotalStudents(0);
        }
      })
      .catch((err) => console.error('获取学生列表失败:', err))
      .finally(() => setLoading(false));
  }, [classId]);

  const filteredStudents = students.filter((s) => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return (s.student_name && s.student_name.toLowerCase().includes(kw)) || (s.student_id && s.student_id.toLowerCase().includes(kw));
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let va = a[sortField] || '', vb = b[sortField] || '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === SORT_DIR.asc ? -1 : 1;
    if (va > vb) return sortDir === SORT_DIR.asc ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const pagedStudents = sortedStudents.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === SORT_DIR.asc ? SORT_DIR.desc : SORT_DIR.asc));
    else { setSortField(field); setSortDir(SORT_DIR.asc); }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 2 }} />;
    return sortDir === SORT_DIR.asc ? <ArrowUp size={10} style={{ marginLeft: 2 }} /> : <ArrowDown size={10} style={{ marginLeft: 2 }} />;
  };

  const handleOpenDetail = useCallback(async (student) => {
    setSelectedStudent(student);
    setDetailOpen(true);
    setActiveTab('score');
    setDetailLoading(true);
    try {
      const [studentRes, trendRes, alertsRes, suggestionsRes] = await Promise.all([
        getStudent(student.student_id), getScoreTrend(student.student_id),
        getAlerts({ student_id: student.student_id }), getSuggestions(student.student_id),
      ]);
      const detail = studentRes.data;
      setBehaviorData(detail.behavior || null);
      setFamilyData(detail.family || null);
      setScoreData(trendRes.data?.scores || []);
      setAlertData(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setSuggestions(suggestionsRes.data || []);
    } catch (err) { console.error('加载学生详情失败:', err); }
    finally { setDetailLoading(false); }
  }, []);

  const closeDetail = () => {
    setDetailOpen(false); setSelectedStudent(null); setScoreData(null);
    setBehaviorData(null); setFamilyData(null); setAlertData(null); setSuggestions([]);
  };

  const handleGenerateSuggestion = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      await generateSuggestion(selectedStudent.student_id, { operator_role: 'teacher', operator_name: selectedTeacherName || '', operator_id: selectedTeacherId || '' });
      const res = await getSuggestions(selectedStudent.student_id);
      setSuggestions(res.data || []);
    } catch (err) { console.error('生成建议失败:', err); }
    finally { setGenerating(false); }
  };

  const handleFeedback = async (suggestionId, feedback) => {
    try {
      await updateSuggestionFeedback(suggestionId, { feedback });
      setSuggestions((prev) => prev.map((s) => s.suggestion_id === suggestionId ? { ...s, student_feedback: feedback } : s));
    } catch (err) { console.error('反馈提交失败:', err); }
  };
  const chartDataBySubject = (() => {
    if (!scoreData || !scoreData.length) return {};
    const map = {};
    scoreData.forEach((item) => { const s = item.subject_id; if (!map[s]) map[s] = []; map[s].push({ exam_stage: item.exam_stage, score: item.score }); });
    return map;
  })();

  const mergedChartData = (() => {
    if (!scoreData || !scoreData.length) return [];
    const stages = ['G1', 'G2', 'G3'];
    const subjects = Object.keys(chartDataBySubject);
    return stages.map((stage) => {
      const row = { exam_stage: stage };
      subjects.forEach((subj) => { const f = chartDataBySubject[subj]?.find((s) => s.exam_stage === stage); row[subj] = f ? f.score : null; });
      return row;
    });
  })();

  const allSelected = pagedStudents.length > 0 && pagedStudents.every((s) => selectedIds.has(s.student_id));
  const toggleSelect = (id) => { setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(pagedStudents.map((s) => s.student_id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleQuery = useCallback(async (q) => {
    const queryText = q || queryQuestion;
    if (!queryText.trim()) return;
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const res = await nl2sqlQuery(queryText.trim(), { operator_role: 'teacher', operator_name: selectedTeacherName || '', operator_id: selectedTeacherId || '' });
      const data = res.data;
      setQueryResult(data);
      setQueryHistory((prev) => [{ question: queryText.trim(), sql: data.sql, execution_time_ms: data.execution_time_ms, error: data.error, timestamp: new Date() }, ...prev].slice(0, 20));
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '查询失败，请稍后重试';
      setQueryResult({ error: errorMsg });
      setQueryHistory((prev) => [{ question: queryText.trim(), sql: null, execution_time_ms: null, error: errorMsg, timestamp: new Date() }, ...prev].slice(0, 20));
    } finally { setQueryLoading(false); }
  }, [queryQuestion]);

  const queryTableData = (() => {
    if (!queryResult?.result || queryResult.error) return null;
    const rows = Array.isArray(queryResult.result) ? queryResult.result : [];
    if (rows.length === 0) return { columns: [], rows: [] };
    return { columns: Object.keys(rows[0]), rows };
  })();

  const handleCopySQL = async () => {
    if (!queryResult?.sql) return;
    try { await navigator.clipboard.writeText(queryResult.sql); setQueryCopied(true); setTimeout(() => setQueryCopied(false), 2000); } catch {}
  };

  const handleBatchGenerateSuggestions = async () => {
    const ids = [...selectedIds];
    for (const sid of ids) {
      try { await generateSuggestion(sid, { operator_role: 'teacher', operator_name: selectedTeacherName || '', operator_id: selectedTeacherId || '' }); } catch (e) { console.error('批量生成建议失败:', e); }
    }
    clearSelection();
  };
  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(11,101,101,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 style={{ margin: 0 }}>学生详情</h1>
        <span className="text-tertiary" style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>
          共 {totalStudents} 名学生{keyword.trim() && filteredStudents.length !== totalStudents ? `（筛选后 ${filteredStudents.length} 名）` : ''}
        </span>
        <button className="liquid-btn-ai" onClick={() => setQueryModalOpen(true)} style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
          <Sparkles size={13} /> 智能查询
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'nowrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 0%', maxWidth: 400, minWidth: 120 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(11,101,101,0.35)', pointerEvents: 'none' }} />
          <input className="liquid-input" placeholder="输入学生姓名或ID搜索..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} style={{ paddingLeft: 28, width: '100%' }} />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(11,101,101,0.03)', border: '0.5px solid rgba(11,101,101,0.06)' }}>
          <CheckSquare size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>已选 {selectedIds.size} 名学生</span>
          <button className="liquid-btn liquid-btn-sm" onClick={handleBatchGenerateSuggestions} style={{ fontSize: '0.6875rem' }}><Sparkles size={11} /> 批量生成建议</button>
          <button className="liquid-btn liquid-btn-sm" onClick={clearSelection} style={{ fontSize: '0.6875rem', marginLeft: 'auto' }}><X size={11} /> 取消选择</button>
        </div>
      )}

      <LiquidCard style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}><p className="text-tertiary">加载中..</p></div>
        ) : pagedStudents.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="liquid-table">
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center', padding: '0.5rem 0.375rem' }}>
                      <span onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {allSelected ? <CheckSquare size={14} style={{ color: 'var(--primary)' }} /> : <Square size={14} style={{ color: 'rgba(11,101,101,0.3)' }} />}
                      </span>
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('student_id')}>学生ID <SortIcon field="student_id" /></th>
                    <th className="sortable-th" onClick={() => handleSort('student_name')}>姓名 <SortIcon field="student_name" /></th>
                    <th className="sortable-th" onClick={() => handleSort('student_gender')}>性别 <SortIcon field="student_gender" /></th>
                    <th className="sortable-th" onClick={() => handleSort('student_age')}>年龄 <SortIcon field="student_age" /></th>
                    <th className="sortable-th" onClick={() => handleSort('student_class_id')}>班级 <SortIcon field="student_class_id" /></th>
                    <th style={{ width: 80 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStudents.map((s) => (
                    <tr key={s.student_id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(s)}>
                      <td style={{ textAlign: 'center', padding: '0.5rem 0.375rem' }} onClick={(e) => e.stopPropagation()}>
                        <span onClick={() => toggleSelect(s.student_id)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                          {selectedIds.has(s.student_id) ? <CheckSquare size={14} style={{ color: 'var(--primary)' }} /> : <Square size={14} style={{ color: 'rgba(11,101,101,0.3)' }} />}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{s.student_id}</td>
                      <td style={{ fontWeight: 500 }}>{s.student_name || '--'}</td>
                      <td>{s.student_gender === 'M' ? '男' : s.student_gender === 'F' ? '女' : s.student_gender || '--'}</td>
                      <td>{s.student_age ?? '--'}</td>
                      <td>{s.student_class_id || '--'}</td>
                      <td>
                        <button className="liquid-btn liquid-btn-sm" onClick={(e) => { e.stopPropagation(); handleOpenDetail(s); }} title="查看详情" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem' }}>
                          <User size={12} /><span className="btn-label">详情</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '0.5px solid rgba(11,101,101,0.05)' }}>
                <button className="liquid-btn liquid-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
                <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>{page} / {totalPages}</span>
                <button className="liquid-btn liquid-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <User size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary">{keyword ? '未找到匹配的学生' : '暂无学生数据'}</p>
          </div>
        )}
      </LiquidCard>
      {detailOpen && selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeDetail}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
          <div className="liquid-scroll" style={{ position: 'relative', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', border: '0.5px solid rgba(11,101,101,0.08)', borderRadius: 16, padding: '1.75rem', width: 720, height: 560, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeDetail} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(11,101,101,0.35)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.15s', zIndex: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="liquid-avatar" style={{ width: 48, height: 48, fontSize: '1.125rem' }}>{selectedStudent.student_name?.charAt(0) || '?'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1a2b2b' }}>{selectedStudent.student_name || '--'}</div>
                <div className="text-tertiary" style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                  学号：{selectedStudent.student_id}
                  {selectedStudent.student_gender && ' · 性别：' + (selectedStudent.student_gender === 'M' ? '男' : selectedStudent.student_gender === 'F' ? '女' : selectedStudent.student_gender)}
                  {selectedStudent.student_age && ' · 年龄：' + selectedStudent.student_age}
                  {selectedStudent.student_class_id && ' · 班级：' + selectedStudent.student_class_id}
                </div>
              </div>
              {alertData && alertData.length > 0 && (
                <div style={{ marginLeft: 'auto' }}><RiskBadge level={alertData.reduce((worst, a) => { const o = { high: 3, medium: 2, low: 1 }; return o[a.risk_level] > o[worst] ? a.risk_level : worst; }, 'low')} /></div>
              )}
            </div>

            <div className="liquid-tabs" style={{ marginBottom: '1.25rem' }}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} className={'liquid-tab' + (activeTab === tab.key ? ' active' : '')} onClick={() => setActiveTab(tab.key)}>
                    <Icon size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.25rem' }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {detailLoading && <div style={{ textAlign: 'center', padding: '3rem 0' }}><p className="text-tertiary">加载中..</p></div>}

            {!detailLoading && activeTab === 'score' && (
              <LiquidCard title="成绩趋势">
                {mergedChartData.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {Object.keys(SUBJECT_MAP).map((subj) => (
                        <ChartFilterBtn key={subj} mode="multi" active={visibleSubjects.includes(subj)} color={SUBJECT_COLORS[subj]}
                          onClick={() => { setVisibleSubjects((prev) => prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]); }}>
                          {SUBJECT_MAP[subj]}
                        </ChartFilterBtn>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={mergedChartData} margin={{ top: 8, right: 16, bottom: 4, left: -10 }}>
                        <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
                        <XAxis dataKey="exam_stage" tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend formatter={(value) => SUBJECT_MAP[value] || value} wrapperStyle={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.65)' }} />
                        {Object.keys(chartDataBySubject).filter((s) => visibleSubjects.includes(s)).map((subj, idx) => (
                          <Line key={subj} type="monotone" dataKey={subj} name={subj} stroke={SUBJECT_COLORS[subj] || '#0b6565'} strokeWidth={2} dot={{ r: 4, fill: SUBJECT_COLORS[subj] || '#0b6565', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6 }} strokeDasharray={idx > 0 ? '6 3' : undefined} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无成绩数据</p>
                )}
              </LiquidCard>
            )}
            {!detailLoading && activeTab === 'behavior' && (
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                <div className="stat-metric-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: behaviorData?.attendance_rate != null && behaviorData.attendance_rate < 80 ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.08)', color: behaviorData?.attendance_rate != null && behaviorData.attendance_rate < 80 ? 'var(--danger)' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={13} />
                    </div>
                    <div>
                      <div className="metric-label">出勤率</div>
                      <div className="metric-value" style={{ color: behaviorData?.attendance_rate != null && behaviorData.attendance_rate < 80 ? 'var(--danger)' : undefined }}>{behaviorData?.attendance_rate != null ? behaviorData.attendance_rate + '%' : '--'}</div>
                    </div>
                  </div>
                </div>
                <div className="stat-metric-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={13} /></div>
                    <div><div className="metric-label">学习时长</div><div className="metric-value">{behaviorData?.study_hours != null ? behaviorData.study_hours + 'h/周' : '--'}</div></div>
                  </div>
                </div>
                <div className="stat-metric-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Brain size={13} /></div>
                    <div><div className="metric-label">睡眠时长</div><div className="metric-value">{behaviorData?.sleep_hours != null ? behaviorData.sleep_hours + 'h/天' : '--'}</div></div>
                  </div>
                </div>
                <div className="stat-metric-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: behaviorData?.motivation_level === 'Low' ? 'rgba(192,57,43,0.08)' : behaviorData?.motivation_level === 'Medium' ? 'rgba(212,136,15,0.08)' : behaviorData?.motivation_level === 'High' ? 'rgba(26,138,90,0.08)' : 'rgba(11,101,101,0.08)', color: behaviorData?.motivation_level === 'Low' ? 'var(--danger)' : behaviorData?.motivation_level === 'Medium' ? 'var(--warning)' : behaviorData?.motivation_level === 'High' ? 'var(--success)' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={13} /></div>
                    <div><div className="metric-label">动机水平</div><div className="metric-value" style={{ color: behaviorData?.motivation_level === 'Low' ? 'var(--danger)' : behaviorData?.motivation_level === 'Medium' ? 'var(--warning)' : behaviorData?.motivation_level === 'High' ? 'var(--success)' : undefined }}>{behaviorData?.motivation_level === 'Low' ? '低' : behaviorData?.motivation_level === 'Medium' ? '中' : behaviorData?.motivation_level === 'High' ? '高' : behaviorData?.motivation_level || '--'}</div></div>
                  </div>
                </div>
                <div className="stat-metric-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Users size={13} /></div>
                    <div><div className="metric-label">辅导次数</div><div className="metric-value">{behaviorData?.tutoring_sessions != null ? behaviorData.tutoring_sessions + '次' : '--'}</div></div>
                  </div>
                </div>
                <div className="stat-metric-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: behaviorData?.internet_access === 'Yes' ? 'rgba(26,138,90,0.08)' : behaviorData?.internet_access === 'No' ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.08)', color: behaviorData?.internet_access === 'Yes' ? 'var(--success)' : behaviorData?.internet_access === 'No' ? 'var(--danger)' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={13} /></div>
                    <div><div className="metric-label">网络接入</div><div className="metric-value" style={{ color: behaviorData?.internet_access === 'Yes' ? 'var(--success)' : behaviorData?.internet_access === 'No' ? 'var(--danger)' : undefined }}>{behaviorData?.internet_access === 'Yes' ? '是' : behaviorData?.internet_access === 'No' ? '否' : behaviorData?.internet_access || '--'}</div></div>
                  </div>
                </div>
              </div>
            )}

            {!detailLoading && activeTab === 'family' && (
              <LiquidCard title="家庭背景信息">
                {familyData && Object.keys(familyData).length > 0 ? (
                  <table className="liquid-table">
                    <thead><tr><th>项目</th><th>信息</th></tr></thead>
                    <tbody>
                      {[{ label: '父亲教育', key: 'father_edu' }, { label: '母亲教育', key: 'mother_edu' }, { label: '父亲职业', key: 'father_job' }, { label: '母亲职业', key: 'mother_job' }, { label: '家庭收入', key: 'family_income' }, { label: '家庭支持', key: 'family_support' }, { label: '家长参与度', key: 'parental_involvement' }, { label: '家庭关系评分', key: 'fam_rel' }]
                        .filter((item) => familyData[item.key] != null && familyData[item.key] !== '')
                        .map((item) => (
                          <tr key={item.key}><td style={{ fontWeight: 500, color: 'rgba(11,101,101,0.65)', width: '40%' }}>{item.label}</td><td>{FAMILY_VALUE_MAP[familyData[item.key]] || String(familyData[item.key])}</td></tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无家庭背景数据</p>
                )}
              </LiquidCard>
            )}
            {!detailLoading && activeTab === 'alert' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <LiquidCard title="预警信息">
                  {alertData && alertData.length > 0 ? (
                    <div>
                      {alertData.map((alert) => {
                        const riskColor = alert.risk_level === 'high' ? '#c0392b' : alert.risk_level === 'medium' ? '#d4880f' : '#1a8a5a';
                        const riskLabel = alert.risk_level === 'high' ? '高风险' : alert.risk_level === 'medium' ? '中风险' : '低风险';
                        const statusLabel = alert.intervention_status === 'completed' ? '已完成' : alert.intervention_status === 'in_progress' ? '进行中' : '待处理';
                        const statusColor = alert.intervention_status === 'completed' ? '#1a8a5a' : alert.intervention_status === 'in_progress' ? '#d4880f' : 'rgba(11,101,101,0.45)';
                        return (
                          <div key={alert.alert_id} style={{ display: 'flex', marginBottom: '0.5rem', borderRadius: '0.5rem', overflow: 'hidden', border: '0.5px solid rgba(11,101,101,0.06)', background: 'rgba(11,101,101,0.015)' }}>
                            <div style={{ width: 3, flexShrink: 0, background: riskColor, borderRadius: '3px 0 0 3px' }} />
                            <div style={{ flex: 1, padding: '0.75rem 0.875rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: riskColor }}>{riskLabel}</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: statusColor }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />{statusLabel}</span>
                                <span style={{ flex: 1 }} />
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)', whiteSpace: 'nowrap', flexShrink: 0 }}><Clock size={9} />{alert.alert_time ? new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                              </div>
                              {alert.risk_factors && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: alert.intervention_measure ? '0.375rem' : 0 }}>
                                  {(() => { try { const f = typeof alert.risk_factors === 'string' ? JSON.parse(alert.risk_factors) : alert.risk_factors; const a = Array.isArray(f) ? f : [String(f)]; return a.map((x, i) => <span key={i} style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)' }}>{x}</span>); } catch { return <span style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)' }}>{String(alert.risk_factors)}</span>; }})()}
                                </div>
                              )}
                              {alert.intervention_measure && <div style={{ fontSize: '0.6875rem', color: 'var(--primary)', padding: '0.25rem 0.5rem', background: 'rgba(11,101,101,0.03)', borderRadius: '0.25rem', borderLeft: '2px solid var(--primary)' }}>{alert.intervention_measure}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-tertiary" style={{ textAlign: 'center', padding: '1.5rem 0' }}>该学生暂无预警记录</p>
                  )}
                </LiquidCard>

                <LiquidCard>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                    <h2 style={{ margin: 0 }}>AI 学习建议</h2>
                    <button className={generating ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'} onClick={handleGenerateSuggestion} disabled={generating}>
                      <Sparkles size={14} /><span className="btn-label">{generating ? 'AI 生成中..' : '生成学习建议'}</span>
                    </button>
                  </div>
                  {suggestions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {suggestions.map((s) => (
                        <div key={s.suggestion_id} style={{ padding: '1rem', background: 'rgba(11,101,101,0.02)', borderRadius: '0.625rem', border: '0.5px solid rgba(11,101,101,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)', whiteSpace: 'nowrap' }}><Clock size={9} />{s.generate_time ? new Date(s.generate_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                            {s.student_feedback && <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', background: s.student_feedback === 'satisfied' ? 'rgba(26,138,90,0.08)' : s.student_feedback === 'unsatisfied' ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.06)', color: s.student_feedback === 'satisfied' ? 'var(--success)' : s.student_feedback === 'unsatisfied' ? 'var(--danger)' : 'rgba(11,101,101,0.65)' }}>{s.student_feedback === 'satisfied' ? '满意' : s.student_feedback === 'unsatisfied' ? '不满意' : '一般'}</span>}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.suggestion_content}</div>
                          {!s.student_feedback && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                              <button className="liquid-btn liquid-btn-sm" style={{ color: 'var(--success)', borderColor: 'rgba(26,138,90,0.15)' }} onClick={() => handleFeedback(s.suggestion_id, 'satisfied')}>满意</button>
                              <button className="liquid-btn liquid-btn-sm" onClick={() => handleFeedback(s.suggestion_id, 'neutral')}>一般</button>
                              <button className="liquid-btn liquid-btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.15)' }} onClick={() => handleFeedback(s.suggestion_id, 'unsatisfied')}>不满意</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-tertiary" style={{ textAlign: 'center', padding: '1.5rem 0' }}>暂无学习建议，点击上方按钮生成</p>
                  )}
                </LiquidCard>
              </div>
            )}
          </div>
        </div>
      )}
      {queryModalOpen && createPortal(
        <div className="ranking-modal-overlay" onClick={() => setQueryModalOpen(false)}>
          <div className="liquid-scroll" onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', border: '0.5px solid rgba(11,101,101,0.08)', borderRadius: 16, padding: '1.75rem', width: 800, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', position: 'relative' }}>
            <button onClick={() => setQueryModalOpen(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(11,101,101,0.35)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.15s', zIndex: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(11,101,101,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.0625rem' }}>智能查询</h2>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.5rem' }}>示例问题：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button key={q} className="liquid-btn liquid-btn-sm liquid-btn-pill" onClick={() => { setQueryQuestion(q); handleQuery(q); }} style={{ fontSize: '0.6875rem' }}>{q}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input className="liquid-input" placeholder="请输入您的问题.." value={queryQuestion} onChange={(e) => setQueryQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuery()} style={{ flex: 1 }} />
              <button className={queryLoading ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'} onClick={() => handleQuery()} disabled={queryLoading}>
                {queryLoading ? <><Loader size={14} style={{ animation: 'spin-rotate 0.8s linear infinite' }} /> 查询中..</> : <><Sparkles size={14} /> 查询</>}
              </button>
            </div>

            {queryLoading && (
              <LiquidCard style={{ marginBottom: '1.25rem', textAlign: 'center', padding: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <Loader size={28} style={{ color: 'var(--primary)', animation: 'spin-rotate 0.8s linear infinite' }} />
                  <p className="text-tertiary">AI 正在分析您的问题并生成 SQL 查询..</p>
                </div>
              </LiquidCard>
            )}

            {!queryLoading && queryResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {queryResult.error && (
                  <div className="liquid-alert liquid-alert-error"><AlertCircle size={16} /><div><div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>查询出错</div><div>{queryResult.error}</div></div></div>
                )}
                {queryResult.sql && (
                  <LiquidCard title="生成的 SQL">
                    <div style={{ position: 'relative' }}>
                      <pre className="liquid-code" style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: highlightSQL(queryResult.sql) }} />
                      <button className="liquid-btn liquid-btn-sm" onClick={handleCopySQL} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.25rem 0.5rem' }}>
                        {queryCopied ? <Check size={12} /> : <Copy size={12} />}
                        {queryCopied ? '已复制' : '复制'}
                      </button>
                    </div>
                  </LiquidCard>
                )}
                {queryTableData && queryTableData.rows.length > 0 && (
                  <LiquidCard title="查询结果">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="liquid-table">
                        <thead><tr>{queryTableData.columns.map((col) => <th key={col}>{col}</th>)}</tr></thead>
                        <tbody>{queryTableData.rows.map((row, i) => <tr key={i}>{queryTableData.columns.map((col) => <td key={col}>{row[col] != null ? String(row[col]) : <span className="text-placeholder">NULL</span>}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Database size={10} />共返回 {queryTableData.rows.length} 条记录</span>
                      {queryResult.execution_time_ms != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={10} />耗时 {queryResult.execution_time_ms}ms</span>}
                    </div>
                  </LiquidCard>
                )}
                {queryTableData && queryTableData.rows.length === 0 && !queryResult.error && (
                  <LiquidCard><div style={{ textAlign: 'center', padding: '2rem 0' }}><Database size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} /><p className="text-tertiary">查询结果为空，未找到匹配的数据</p></div></LiquidCard>
                )}
              </div>
            )}

            {queryHistory.length > 0 && (
              <LiquidCard title="查询历史">
                <table className="liquid-table">
                  <thead><tr><th style={{ width: '40%' }}>问题</th><th style={{ width: '35%' }}>SQL</th><th>耗时</th><th>状态</th><th>时间</th></tr></thead>
                  <tbody>{queryHistory.map((item, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.question}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><code style={{ fontSize: '0.75rem', color: 'var(--primary-dark)' }}>{item.sql || '--'}</code></td>
                      <td>{item.execution_time_ms != null ? item.execution_time_ms + 'ms' : '--'}</td>
                      <td>{item.error ? <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>失败</span> : <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>成功</span>}</td>
                      <td style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', whiteSpace: 'nowrap' }}>{item.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </LiquidCard>
            )}

            {!queryResult && !queryLoading && queryHistory.length === 0 && (
              <LiquidCard>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                  <Sparkles size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
                  <p className="text-tertiary" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>输入自然语言问题，AI 将自动生成 SQL 查询</p>
                  <p className="text-placeholder" style={{ fontSize: '0.75rem' }}>点击上方示例问题快速体验</p>
                </div>
              </LiquidCard>
            )}

            <style>{'@keyframes spin-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}