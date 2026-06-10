import { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Clock, CheckCircle2, Loader, X, Pencil, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, CheckCircle, RefreshCw, Square, CheckSquare, Sparkles, GraduationCap, BookOpen, Zap } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import LiquidSelect from '../../components/LiquidSelect';
import ChartTooltip from '../../components/ChartTooltip';
import { useRole } from '../../contexts/RoleContext';
import { getAlerts, generateAlerts, updateIntervention, getAlertStats, generateSuggestion, getStudent } from '../../api';

const RISK_COLORS = { low: '#1a8a5a', medium: '#d4880f', high: '#c0392b' };
const RISK_LABELS = { low: '低风险', medium: '中风险', high: '高风险' };
const RISK_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_MAP = { pending: { label: '待处理', color: 'rgba(11,101,101,0.45)' }, in_progress: { label: '进行中', color: '#d4880f' }, completed: { label: '已完成', color: '#1a8a5a' } };
const SORT_DIR = { asc: 'asc', desc: 'desc' };

const INTERVENTION_TEMPLATES = [
  '建议加强基础知识的补习，安排课后辅导',
  '关注学生心理状态，进行一对一谈心',
  '与家长沟通学生的学习情况，共同制定提升计划',
  '调整学习计划，适当减少课外活动时间',
  '安排学习小组互助，发挥同伴教育作用',
  '建议增加每日自学时间，重点突破薄弱科目',
];

export default function TeacherAlert() {
  const { selectedTeacherClassId, selectedTeacherId, selectedTeacherName } = useRole();
  const classId = selectedTeacherClassId || '';
  const refreshTimerRef = useRef(null);

  const [alerts, setAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('alert_time');
  const [sortDir, setSortDir] = useState(SORT_DIR.desc);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = 15;
  const [modalOpen, setModalOpen] = useState(false);
  const [interveneAlert, setInterveneAlert] = useState(null);
  const [interveneStatus, setInterveneStatus] = useState('pending');
  const [interveneMeasure, setInterveneMeasure] = useState('');
  const [interveneMsg, setInterveneMsg] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { alertId, field, value }
  const cellInputRef = useRef(null);
  const [studentSummary, setStudentSummary] = useState(null);
  const [batchMsg, setBatchMsg] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!classId) { setAlerts([]); setAlertStats(null); setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const params = { class_id: classId };
      if (riskFilter) params.risk_level = riskFilter;
      if (statusFilter) params.intervention_status = statusFilter;
      const statsParams = { class_id: classId };
      const [alertsRes, statsRes] = await Promise.all([getAlerts(params), getAlertStats(statsParams)]);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setAlertStats(statsRes.data);
    } catch (err) { console.error('获取预警数据失败:', err); }
    finally { if (!silent) setLoading(false); setRefreshing(false); setLastUpdated(new Date()); }
  }, [riskFilter, statusFilter, classId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts, refreshKey]);

  useEffect(() => {
    if (!classId) return;
    refreshTimerRef.current = setInterval(() => { setRefreshing(true); fetchAlerts(true); }, 30000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setGenerating(true);
    try { await generateAlerts({ operator_role: 'teacher', operator_name: selectedTeacherName || '', operator_id: selectedTeacherId || '' }); await fetchAlerts(); }
    catch (err) { console.error('生成预警失败:', err); }
    finally { setGenerating(false); }
  };

  const openInterveneModal = async (alert) => {
    setInterveneAlert(alert); setInterveneStatus(alert.intervention_status || 'pending'); setInterveneMeasure(alert.intervention_measure || ''); setInterveneMsg(null); setStudentSummary(null); setModalOpen(true);
    try { const res = await getStudent(alert.student_id); setStudentSummary(res.data); } catch (e) { console.error(e); }
  };

  const closeModal = () => { setModalOpen(false); setInterveneAlert(null); setInterveneStatus('pending'); setInterveneMeasure(''); setInterveneMsg(null); setStudentSummary(null); };

  const handleIntervene = async () => {
    const id = interveneAlert?.alert_id; if (!id) { setInterveneMsg({ type: 'error', text: '预警 ID 无效' }); return; }
    if (!interveneMeasure.trim()) { setInterveneMsg({ type: 'error', text: '请输入干预措施' }); return; }
    try {
      await updateIntervention(id, { intervention_status: interveneStatus, intervention_measure: interveneMeasure.trim(), operator_role: 'teacher', operator_name: selectedTeacherName || '', operator_id: selectedTeacherId || '' });
      setInterveneMsg({ type: 'success', text: '干预状态更新成功' });
      await fetchAlerts(); setTimeout(() => closeModal(), 1200);
    } catch (err) { setInterveneMsg({ type: 'error', text: err.response?.data?.error || '更新失败' }); }
  };

  const riskData = (() => {
    if (!alertStats) return [];
    return [{ name: RISK_LABELS.low, value: alertStats.low || 0, key: 'low' }, { name: RISK_LABELS.medium, value: alertStats.medium || 0, key: 'medium' }, { name: RISK_LABELS.high, value: alertStats.high || 0, key: 'high' }].filter((d) => d.value > 0);
  })();
  const totalAlerts = riskData.reduce((sum, d) => sum + d.value, 0);
  const highCount = riskData.find((d) => d.key === 'high')?.value || 0;
  const completedAlerts = alerts.filter((a) => a.intervention_status === 'completed').length;
  const interventionRate = totalAlerts > 0 ? ((completedAlerts / totalAlerts) * 100).toFixed(1) + '%' : '--';
  const avgRiskScore = alerts.length > 0 ? (alerts.reduce((s, a) => s + (a.risk_score || 0), 0) / alerts.length).toFixed(1) : '--';

  const studentAlertCounts = {}; alerts.forEach((a) => { studentAlertCounts[a.student_id] = (studentAlertCounts[a.student_id] || 0) + 1; });

  const filteredAlerts = alerts.filter((a) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.trim().toLowerCase();
    return (a.student_id && a.student_id.toLowerCase().includes(kw)) || (a.student_name && a.student_name.toLowerCase().includes(kw));
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'risk_level') { va = RISK_ORDER[va] ?? 99; vb = RISK_ORDER[vb] ?? 99; return sortDir === SORT_DIR.asc ? va - vb : vb - va; }
    if (sortField === 'intervention_status') { const o = { pending: 0, in_progress: 1, completed: 2 }; va = o[va] ?? 99; vb = o[vb] ?? 99; return sortDir === SORT_DIR.asc ? va - vb : vb - va; }
    if (sortField === 'risk_score') { return sortDir === SORT_DIR.asc ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0); }
    if (sortField === 'alert_time') { va = va ? new Date(va).getTime() : 0; vb = vb ? new Date(vb).getTime() : 0; return sortDir === SORT_DIR.asc ? va - vb : vb - va; }
    if (typeof va === 'string') va = va.toLowerCase(); if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === SORT_DIR.asc ? -1 : 1; if (va > vb) return sortDir === SORT_DIR.asc ? 1 : -1; return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) { setSortDir((d) => (d === SORT_DIR.asc ? SORT_DIR.desc : SORT_DIR.asc)); }
    else { setSortField(field); setSortDir(field === 'alert_time' ? SORT_DIR.desc : SORT_DIR.asc); }
    setPage(1);
  };
  const SortIcon = ({ field }) => { if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 2 }} />; return sortDir === SORT_DIR.asc ? <ArrowUp size={10} style={{ marginLeft: 2 }} /> : <ArrowDown size={10} style={{ marginLeft: 2 }} />; };

  const totalPages = Math.ceil(sortedAlerts.length / pageSize);
  const pagedAlerts = sortedAlerts.slice((page - 1) * pageSize, page * pageSize);

  // 管理风格多选
  const allSelectedOnPage = pagedAlerts.length > 0 && pagedAlerts.every((s) => selectedIds.has(s.alert_id));
  const someSelectedOnPage = pagedAlerts.length > 0 && pagedAlerts.some((s) => selectedIds.has(s.alert_id));
  const toggleSelect = (id) => { setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => {
    if (allSelectedOnPage) { setSelectedIds((prev) => { const next = new Set(prev); pagedAlerts.forEach(a => next.delete(a.alert_id)); return next; }); }
    else { setSelectedIds((prev) => { const next = new Set(prev); pagedAlerts.forEach(a => next.add(a.alert_id)); return next; }); }
  };

  const handleBatchMark = async (newStatus) => {
    const ids = [...selectedIds]; let success = 0, fail = 0;
    for (const alertId of ids) { try { await updateIntervention(alertId, { intervention_status: newStatus, operator_role: 'teacher', operator_name: selectedTeacherName || '', operator_id: selectedTeacherId || '' }); success++; } catch (e) { fail++; } }
    setBatchMsg({ type: fail > 0 ? 'warning' : 'success', text: `批量操作完成：成功 ${success}/${ids.length}${fail > 0 ? `，失败 ${fail}` : ''}` });
    setSelectedIds(new Set()); fetchAlerts(); setTimeout(() => setBatchMsg(null), 4000);
  };

  const handleBatchSuggestions = async () => {
    const ids = [...selectedIds];
    const studentIds = [...new Set(alerts.filter(a => ids.includes(a.alert_id)).map(a => a.student_id))];
    let success = 0, fail = 0;
    for (const sid of studentIds) { try { await generateSuggestion(sid, { operator_role: 'teacher', operator_name: selectedTeacherName || '', operator_id: selectedTeacherId || '' }); success++; } catch (e) { fail++; } }
    setBatchMsg({ type: fail > 0 ? 'warning' : 'success', text: `批量生成建议完成：成功 ${success}/${studentIds.length}${fail > 0 ? `，失败 ${fail}` : ''}` });
    setSelectedIds(new Set()); setTimeout(() => setBatchMsg(null), 4000);
  };

  const handleCellDoubleClick = (alertId, field, value) => {
    setEditingCell({ alertId, field, value: String(value ?? '') });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    await handleCellSaveWithValue(editingCell);
  };

  const handleCellSaveWithValue = async (cellData) => {
    if (!cellData) return;
    const { alertId, field, value: newValue } = cellData;
    const alert = alerts.find(a => a.alert_id === alertId);
    if (!alert) { setEditingCell(null); return; }
    if (String(alert[field] ?? '') === String(newValue)) { setEditingCell(null); return; }
    try {
      await updateIntervention(alertId, {
        [field]: newValue,
        operator_role: 'teacher',
        operator_name: selectedTeacherName || '',
        operator_id: selectedTeacherId || '',
      });
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, [field]: newValue } : a));
    } catch (err) {
      console.error('更新失败:', err);
    }
    setEditingCell(null);
  };

  const handleCellKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleCellSave(); }
    else if (e.key === 'Escape') { setEditingCell(null); }
  };

  if (!classId) {
    return (
      <div className="home-page">
        <div className="home-orb home-orb--top" />
        <div className="home-orb home-orb--bottom" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <h1 style={{ margin: 0 }}>风险预警</h1>
        </div>
        <LiquidCard><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}><ShieldAlert size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block', paintOrder: 'stroke fill' }} /><p className="text-tertiary">请先选择班级</p></div></LiquidCard>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
        </div>
        <h1 style={{ margin: 0 }}>风险预警</h1>
        <button className="liquid-btn liquid-btn-sm" onClick={() => { setRefreshKey(k => k + 1); setRefreshing(true); }} disabled={refreshing} style={{ marginLeft: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} title="手动刷新">
          <RefreshCw size={12} style={refreshing ? { animation: 'spin-rotate 0.6s linear infinite' } : {}} />
        </button>
        {lastUpdated && (
          <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)', marginLeft: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button className="liquid-btn liquid-btn-sm" onClick={handleGenerate} disabled={generating} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          {generating ? <Loader size={12} style={{ animation: 'spin-rotate 0.8s linear infinite' }} /> : <Zap size={12} />}
          {generating ? '生成中...' : '重新生成预警'}
        </button>
      </div>

      {batchMsg && (
        <div className={`liquid-alert liquid-alert-${batchMsg.type}`} style={{ marginBottom: '0.75rem' }}>
          {batchMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}<div>{batchMsg.text}</div>
        </div>
      )}

      {/* 布局：左侧饼图（含统计卡片） + 右侧表格 */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <LiquidCard title="风险分布" style={{ textAlign: 'center' }}>
            {riskData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 200, height: 200 }}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={2} dataKey="value" stroke="none">{riskData.map((e) => <Cell key={e.key} fill={RISK_COLORS[e.key]} />)}</Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--primary-dark)', lineHeight: 1.2 }}>{totalAlerts}</span>
                    <span style={{ fontSize: '0.5625rem', color: 'rgba(11,101,101,0.45)' }}>预警总数</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', width: '100%' }}>
                  {riskData.map((e) => (<div key={e.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLORS[e.key], flexShrink: 0 }} />{e.name}</span><span style={{ fontWeight: 600, color: RISK_COLORS[e.key] }}>{e.value}</span></div>))}
                </div>
              </div>
            ) : <p className="text-tertiary" style={{ textAlign: 'center', padding: '1rem 0' }}>暂无数据</p>}
          </LiquidCard>

          {/* 四个统计卡片移到饼图下方 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="stat-metric-item" style={{ padding: '0.75rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(192,57,43,0.08)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={15} /></div><div><div className="metric-label">高风险</div><div className="metric-value" style={{ color: 'var(--danger)', fontSize: '1.125rem' }}>{highCount}</div></div></div></div>
            <div className="stat-metric-item" style={{ padding: '0.75rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShieldAlert size={15} /></div><div><div className="metric-label">预警总数</div><div className="metric-value" style={{ fontSize: '1.125rem' }}>{totalAlerts}</div></div></div></div>
            <div className="stat-metric-item" style={{ padding: '0.75rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,138,90,0.08)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={15} /></div><div><div className="metric-label">干预率</div><div className="metric-value" style={{ color: 'var(--success)', fontSize: '1.125rem' }}>{interventionRate}</div></div></div></div>
            <div className="stat-metric-item" style={{ padding: '0.75rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(201,147,58,0.08)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={15} /></div><div><div className="metric-label">平均风险评分</div><div className="metric-value" style={{ color: 'var(--warning)', fontSize: '1.125rem' }}>{avgRiskScore}</div></div></div></div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <LiquidSelect value={riskFilter} onChange={(val) => { setRiskFilter(val); setPage(1); }} options={[{ value: '', label: '全部等级' }, { value: 'high', label: '高风险' }, { value: 'medium', label: '中风险' }, { value: 'low', label: '低风险' }]} style={{ width: 130, flexShrink: 0 }} />
            <LiquidSelect value={statusFilter} onChange={(val) => { setStatusFilter(val); setPage(1); }} options={[{ value: '', label: '全部状态' }, { value: 'pending', label: '待处理' }, { value: 'in_progress', label: '进行中' }, { value: 'completed', label: '已完成' }]} style={{ width: 130, flexShrink: 0 }} />
            <input className="liquid-input" placeholder="搜索姓名/学生ID..." value={searchKeyword} onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }} style={{ width: 160, fontSize: '0.8125rem', flexShrink: 0 }} />
            <button
              className={`liquid-btn liquid-btn-sm${selectMode ? ' liquid-btn-primary' : ''}`}
              onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()); }}
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <CheckSquare size={12} />{selectMode ? '退出多选' : '多选'}
            </button>
            <span className="text-tertiary" style={{ fontSize: '0.75rem', marginLeft: 'auto', whiteSpace: 'nowrap' }}>共 {sortedAlerts.length} 条预警</span>
          </div>

          {selectMode && selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(11,101,101,0.03)', border: '0.5px solid rgba(11,101,101,0.06)' }}>
              <CheckSquare size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>已选 {selectedIds.size} 条</span>
              <button className="liquid-btn liquid-btn-sm" onClick={() => handleBatchMark('in_progress')} style={{ fontSize: '0.6875rem' }}>标记处理中</button>
              <button className="liquid-btn liquid-btn-sm" onClick={() => handleBatchMark('completed')} style={{ fontSize: '0.6875rem', color: 'var(--success)' }}>标记已完成</button>
              <button className="liquid-btn liquid-btn-sm" onClick={handleBatchSuggestions} style={{ fontSize: '0.6875rem' }}><Sparkles size={11} /> 生成建议</button>
              <button className="liquid-btn liquid-btn-sm" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.6875rem', marginLeft: 'auto' }}><X size={11} /> 取消</button>
            </div>
          )}

          <LiquidCard style={{ padding: 0 }}>
            {loading ? (<div style={{ textAlign: 'center', padding: '3rem 0' }}><p className="text-tertiary">加载中...</p></div>) : pagedAlerts.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="liquid-table">
                    <thead>
                      <tr>
                        {selectMode && (
                        <th style={{ width: 40, textAlign: 'center', padding: '0.625rem 0.5rem' }}>
                          <span onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {allSelectedOnPage ? <CheckSquare size={14} style={{ color: 'var(--primary)' }} /> : someSelectedOnPage ? <Square size={14} style={{ color: 'var(--primary)', opacity: 0.5 }} /> : <Square size={14} style={{ color: 'rgba(11,101,101,0.3)' }} />}
                          </span>
                        </th>
                        )}
                        <th className="sortable-th" onClick={() => handleSort('student_id')}>学生ID <SortIcon field="student_id" /></th>
                        <th>姓名</th>
                        <th style={{ width: 70 }}>预警次数</th>
                        <th className="sortable-th" onClick={() => handleSort('risk_level')}>风险等级 <SortIcon field="risk_level" /></th>
                        <th className="sortable-th" onClick={() => handleSort('risk_score')}>风险评分 <SortIcon field="risk_score" /></th>
                        <th>风险因素</th>
                        <th className="sortable-th" onClick={() => handleSort('intervention_status')}>干预状态 <SortIcon field="intervention_status" /></th>
                        <th className="sortable-th" onClick={() => handleSort('alert_time')}>预警时间 <SortIcon field="alert_time" /></th>
                        <th style={{ width: 70 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedAlerts.map((alert) => {
                        const riskCls = alert.risk_level === 'high' ? 'risk-high' : alert.risk_level === 'medium' ? 'risk-medium' : 'risk-low';
                        const riskLabel = RISK_LABELS[alert.risk_level] || alert.risk_level;
                        const statusInfo = STATUS_MAP[alert.intervention_status] || { label: alert.intervention_status || '--', color: 'rgba(11,101,101,0.45)' };
                        const alertCount = studentAlertCounts[alert.student_id] || 1;
                        let factors = [];
                        try { factors = typeof alert.risk_factors === 'string' ? JSON.parse(alert.risk_factors) : (Array.isArray(alert.risk_factors) ? alert.risk_factors : []); } catch { }
                        const factorsPreview = factors.slice(0, 2).join('、') || '--';
                        return (
                          <tr key={alert.alert_id}>
                            {selectMode && (
                            <td style={{ textAlign: 'center', padding: '0.5rem 0.5rem' }} onClick={(e) => e.stopPropagation()}>
                              <span onClick={() => toggleSelect(alert.alert_id)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                {selectedIds.has(alert.alert_id) ? <CheckSquare size={14} style={{ color: 'var(--primary)' }} /> : <Square size={14} style={{ color: 'rgba(11,101,101,0.3)' }} />}
                              </span>
                            </td>
                            )}
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{alert.student_id}</td>
                            <td style={{ fontWeight: 500 }}>{alert.student_name || '--'}</td>
                            <td style={{ textAlign: 'center' }}><span style={{ fontSize: '0.75rem', fontWeight: 600, color: alertCount > 1 ? 'var(--warning)' : 'rgba(11,101,101,0.4)' }}>{alertCount}</span></td>
                            <td><span className={'risk-badge ' + riskCls}>{riskLabel}</span></td>
                            <td style={{ fontWeight: 600, color: alert.risk_score >= 5 ? 'var(--danger)' : alert.risk_score >= 3 ? 'var(--warning)' : 'var(--primary-dark)' }}>{alert.risk_score ?? '--'}</td>
                            <td><span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.5)' }} title={factors.join('、')}>{factorsPreview}{factors.length > 2 && <span style={{ color: 'rgba(11,101,101,0.3)' }}> +{factors.length - 2}</span>}</span></td>
                            <td
                              onDoubleClick={() => handleCellDoubleClick(alert.alert_id, 'intervention_status', alert.intervention_status)}
                              style={{
                                cursor: 'text',
                                position: editingCell?.alertId === alert.alert_id && editingCell?.field === 'intervention_status' ? 'relative' : undefined,
                                background: editingCell?.alertId === alert.alert_id && editingCell?.field === 'intervention_status' ? 'rgba(11,101,101,0.03)' : undefined,
                                boxShadow: editingCell?.alertId === alert.alert_id && editingCell?.field === 'intervention_status' ? 'inset 0 0 0 0.5px rgba(11,101,101,0.2), 0 0 0 2px rgba(11,101,101,0.06)' : undefined,
                              }}
                            >
                              {editingCell?.alertId === alert.alert_id && editingCell?.field === 'intervention_status' ? (
                                <LiquidSelect
                                  value={editingCell.value}
                                  onChange={(v) => handleCellSaveWithValue({ ...editingCell, value: v })}
                                  options={[{ value: 'pending', label: '待处理' }, { value: 'in_progress', label: '进行中' }, { value: 'completed', label: '已完成' }]}
                                  style={{ width: '100%' }}
                                  triggerStyle={{ fontSize: '0.8125rem', padding: '0.25rem 0.5rem', minHeight: '1.5rem' }}
                                />
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: statusInfo.color }}>
                                  {alert.intervention_status === 'completed' ? <CheckCircle2 size={12} /> : alert.intervention_status === 'in_progress' ? <Clock size={12} /> : <ShieldAlert size={12} />}
                                  {statusInfo.label}
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', whiteSpace: 'nowrap' }}>{alert.alert_time ? new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                            <td>
                              <button className="liquid-btn liquid-btn-sm" onClick={() => openInterveneModal(alert)} title="干预操作" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', height: '1.75rem', fontSize: '0.6875rem' }}>
                                <Pencil size={11} />干预
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
                <ShieldAlert size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block', paintOrder: 'stroke fill' }} />
                <p className="text-tertiary">{riskFilter || statusFilter || searchKeyword ? '当前筛选条件下暂无预警记录' : '暂无预警数据，请点击"重新生成预警"'}</p>
              </div>
            )}
          </LiquidCard>
        </div>
      </div>

      {/* 干预弹窗 */}
      {modalOpen && interveneAlert && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModal}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
          <div className="liquid-scroll" style={{ position: 'relative', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', border: '0.5px solid rgba(11,101,101,0.08)', borderRadius: 16, padding: '1.75rem', width: 520, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(11,101,101,0.35)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}><X size={18} /></button>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.0625rem' }}>干预操作</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(11,101,101,0.03)', borderRadius: 10, fontSize: '0.8125rem', color: 'rgba(11,101,101,0.65)' }}>
              <span>预警 ID: <strong style={{ color: 'var(--primary-dark)' }}>{interveneAlert.alert_id}</strong></span>
              <span>学生: <strong style={{ color: 'var(--primary-dark)' }}>{interveneAlert.student_name || '--'}</strong></span>
              <span>风险等级: <span className={'risk-badge ' + (interveneAlert.risk_level === 'high' ? 'risk-high' : interveneAlert.risk_level === 'medium' ? 'risk-medium' : 'risk-low')}>{RISK_LABELS[interveneAlert.risk_level] || interveneAlert.risk_level}</span></span>
              <span>风险评分: <strong style={{ color: interveneAlert.risk_score >= 5 ? 'var(--danger)' : interveneAlert.risk_score >= 3 ? 'var(--warning)' : 'var(--primary-dark)' }}>{interveneAlert.risk_score ?? '--'}</strong></span>
              <span>预警时间: <strong style={{ color: 'var(--primary-dark)' }}>{interveneAlert.alert_time ? new Date(interveneAlert.alert_time).toLocaleString('zh-CN') : '--'}</strong></span>
            </div>
            {studentSummary && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(11,101,101,0.02)', borderRadius: 10, border: '0.5px solid rgba(11,101,101,0.06)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><GraduationCap size={13} /> 学生概览</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.55)' }}>
                  {studentSummary.student_gender && <span>性别: {studentSummary.student_gender === 'M' ? '男' : '女'}</span>}
                  {studentSummary.student_age && <span>年龄: {studentSummary.student_age}</span>}
                  {studentSummary.student_class_id && <span>班级: {studentSummary.student_class_id}</span>}
                  {studentSummary.behavior?.attendance_rate != null && <span style={{ color: studentSummary.behavior.attendance_rate < 80 ? 'var(--danger)' : 'var(--success)' }}><BookOpen size={9} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} />出勤: {studentSummary.behavior.attendance_rate}%</span>}
                  {studentSummary.behavior?.motivation_level && <span>动力: {studentSummary.behavior.motivation_level === 'Low' ? '低' : '中'}</span>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.375rem' }}>干预状态</label>
                <LiquidSelect value={interveneStatus} onChange={setInterveneStatus} options={[{ value: 'pending', label: '待处理' }, { value: 'in_progress', label: '进行中' }, { value: 'completed', label: '已完成' }]} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.375rem' }}>快捷模板</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {INTERVENTION_TEMPLATES.map((tpl, i) => (
                    <button key={i} className="liquid-btn liquid-btn-sm liquid-btn-pill" onClick={() => setInterveneMeasure(tpl)} style={{ fontSize: '0.625rem', padding: '0.1875rem 0.5rem' }}>{tpl.slice(0, 15)}...</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.375rem' }}>干预措施</label>
                <textarea className="liquid-input" placeholder="请输入干预措施..." value={interveneMeasure} onChange={(e) => setInterveneMeasure(e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical', minHeight: 72 }} />
              </div>
            </div>
            {interveneMsg && (
              <div className={'liquid-alert liquid-alert-' + (interveneMsg.type === 'error' ? 'error' : 'success')} style={{ marginTop: '0.75rem' }}>
                {interveneMsg.type === 'error' ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}{interveneMsg.text}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="liquid-btn" onClick={closeModal}>取消</button>
              <button className="liquid-btn liquid-btn-primary" onClick={handleIntervene}>确认更新</button>
            </div>
          </div>
        </div>
      )}

      <style>{'@keyframes spin-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
