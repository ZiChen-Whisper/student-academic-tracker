import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, ShieldAlert, Clock, CheckCircle2, Loader, X, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import LiquidCard from '../components/LiquidCard';
import LiquidSelect from '../components/LiquidSelect';
import ChartTooltip from '../components/ChartTooltip';
import { getAlerts, generateAlerts, updateIntervention, getAlertStats } from '../api';

const RISK_COLORS = {
  low: '#1a8a5a',
  medium: '#d4880f',
  high: '#c0392b',
};

const RISK_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

const STATUS_MAP = {
  pending: { label: '待处理', color: 'rgba(11,101,101,0.45)' },
  in_progress: { label: '进行中', color: '#d4880f' },
  completed: { label: '已完成', color: '#1a8a5a' },
};

const SORT_DIR = { asc: 'asc', desc: 'desc' };

export default function Alert() {
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
  const pageSize = 15;

  // 干预弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [interveneAlert, setInterveneAlert] = useState(null);
  const [interveneStatus, setInterveneStatus] = useState('pending');
  const [interveneMeasure, setInterveneMeasure] = useState('');
  const [interveneMsg, setInterveneMsg] = useState(null);

  // 加载预警数据
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (riskFilter) params.risk_level = riskFilter;
      if (statusFilter) params.intervention_status = statusFilter;
      const [alertsRes, statsRes] = await Promise.all([
        getAlerts(params),
        getAlertStats(),
      ]);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setAlertStats(statsRes.data);
    } catch (err) {
      console.error('获取预警数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [riskFilter, statusFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // 重新生成预警
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateAlerts();
      await fetchAlerts();
    } catch (err) {
      console.error('生成预警失败:', err);
    } finally {
      setGenerating(false);
    }
  };

  // 打开干预弹窗
  const openInterveneModal = (alert) => {
    setInterveneAlert(alert);
    setInterveneStatus(alert.intervention_status || 'pending');
    setInterveneMeasure(alert.intervention_measure || '');
    setInterveneMsg(null);
    setModalOpen(true);
  };

  // 关闭弹窗
  const closeModal = () => {
    setModalOpen(false);
    setInterveneAlert(null);
    setInterveneStatus('pending');
    setInterveneMeasure('');
    setInterveneMsg(null);
  };

  // 更新干预状态
  const handleIntervene = async () => {
    const id = interveneAlert?.alert_id;
    if (!id) {
      setInterveneMsg({ type: 'error', text: '预警 ID 无效' });
      return;
    }
    if (!interveneMeasure.trim()) {
      setInterveneMsg({ type: 'error', text: '请输入干预措施' });
      return;
    }
    try {
      await updateIntervention(id, {
        intervention_status: interveneStatus,
        intervention_measure: interveneMeasure.trim(),
      });
      setInterveneMsg({ type: 'success', text: '干预状态更新成功' });
      await fetchAlerts();
      setTimeout(() => closeModal(), 1200);
    } catch (err) {
      const errorMsg = err.response?.data?.error || '更新失败';
      setInterveneMsg({ type: 'error', text: errorMsg });
    }
  };

  // 饼图数据
  const riskData = (() => {
    if (!alertStats) return [];
    return [
      { name: RISK_LABELS.low, value: alertStats.low || 0, key: 'low' },
      { name: RISK_LABELS.medium, value: alertStats.medium || 0, key: 'medium' },
      { name: RISK_LABELS.high, value: alertStats.high || 0, key: 'high' },
    ].filter((d) => d.value > 0);
  })();

  const totalAlerts = riskData.reduce((sum, d) => sum + d.value, 0);

  // 模糊搜索过滤（姓名 + 学生ID）
  const filteredAlerts = alerts.filter((a) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.trim().toLowerCase();
    return (
      (a.student_id && a.student_id.toLowerCase().includes(kw)) ||
      (a.student_name && a.student_name.toLowerCase().includes(kw))
    );
  });

  // 排序
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    let va = a[sortField];
    let vb = b[sortField];
    // 风险等级特殊排序
    if (sortField === 'risk_level') {
      va = RISK_ORDER[va] ?? 99;
      vb = RISK_ORDER[vb] ?? 99;
      return sortDir === SORT_DIR.asc ? va - vb : vb - va;
    }
    // 干预状态排序
    if (sortField === 'intervention_status') {
      const order = { pending: 0, in_progress: 1, completed: 2 };
      va = order[va] ?? 99;
      vb = order[vb] ?? 99;
      return sortDir === SORT_DIR.asc ? va - vb : vb - va;
    }
    // 数值排序
    if (sortField === 'risk_score') {
      return sortDir === SORT_DIR.asc ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    }
    // 时间排序
    if (sortField === 'alert_time') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
      return sortDir === SORT_DIR.asc ? va - vb : vb - va;
    }
    // 字符串排序
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === SORT_DIR.asc ? -1 : 1;
    if (va > vb) return sortDir === SORT_DIR.asc ? 1 : -1;
    return 0;
  });

  // 切换排序
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === SORT_DIR.asc ? SORT_DIR.desc : SORT_DIR.asc));
    } else {
      setSortField(field);
      setSortDir(field === 'alert_time' ? SORT_DIR.desc : SORT_DIR.asc);
    }
    setPage(1);
  };

  // 排序指示图标
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 2 }} />;
    return sortDir === SORT_DIR.asc
      ? <ArrowUp size={10} style={{ marginLeft: 2 }} />
      : <ArrowDown size={10} style={{ marginLeft: 2 }} />;
  };

  // 分页
  const totalPages = Math.ceil(sortedAlerts.length / pageSize);
  const pagedAlerts = sortedAlerts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>风险预警管理</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.25rem' }}>
        {/* ===== 左侧 ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 重新生成预警按钮 */}
          <button
            className={generating ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'}
            onClick={handleGenerate}
            disabled={generating}
            style={{ width: '100%', height: '40px' }}
          >
            {generating ? (
              <>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                生成中...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                重新生成预警
              </>
            )}
          </button>

          {/* 风险分布饼图 */}
          <LiquidCard title="风险分布">
            {riskData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 200, height: 200 }}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={riskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {riskData.map((entry) => (
                          <Cell key={entry.key} fill={RISK_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* 中心镂空 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#095050', lineHeight: 1.2, textShadow: '0 0 8px rgba(255,255,255,0.9)' }}>
                      {totalAlerts}
                    </span>
                    <span style={{ fontSize: '0.5625rem', color: 'rgba(11,101,101,0.45)', textShadow: '0 0 8px rgba(255,255,255,0.9)' }}>预警总数</span>
                  </div>
                </div>
                {/* 图例 */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  {riskData.map((entry) => (
                    <div key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: RISK_COLORS[entry.key],
                          flexShrink: 0,
                        }}
                      />
                      {entry.name} {entry.value}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-tertiary" style={{ textAlign: 'center', padding: '2rem 0' }}>
                {loading ? '加载中...' : '暂无数据'}
              </p>
            )}
          </LiquidCard>
        </div>

        {/* ===== 右侧 ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 筛选栏 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
            <LiquidSelect
              value={riskFilter}
              onChange={(val) => { setRiskFilter(val); setPage(1); }}
              options={[
                { value: '', label: '全部等级' },
                { value: 'high', label: '高风险' },
                { value: 'medium', label: '中风险' },
                { value: 'low', label: '低风险' },
              ]}
              style={{ width: 130, flexShrink: 0 }}
            />
            <LiquidSelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'pending', label: '待处理' },
                { value: 'in_progress', label: '进行中' },
                { value: 'completed', label: '已完成' },
              ]}
              style={{ width: 130, flexShrink: 0 }}
            />
            <input
              className="liquid-input"
              placeholder="搜索姓名/学生ID..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              style={{ width: 160, fontSize: '0.8125rem', flexShrink: 0 }}
            />
            <span className="text-tertiary" style={{ fontSize: '0.75rem', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              共 {sortedAlerts.length} 条预警
            </span>
          </div>

          {/* 预警列表表格 */}
          <LiquidCard style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p className="text-tertiary">加载中...</p>
              </div>
            ) : pagedAlerts.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="liquid-table">
                    <thead>
                      <tr>
                        <th className="sortable-th" onClick={() => handleSort('student_id')}>
                          学生ID <SortIcon field="student_id" />
                        </th>
                        <th>姓名</th>
                        <th className="sortable-th" onClick={() => handleSort('risk_level')}>
                          风险等级 <SortIcon field="risk_level" />
                        </th>
                        <th className="sortable-th" onClick={() => handleSort('risk_score')}>
                          风险评分 <SortIcon field="risk_score" />
                        </th>
                        <th className="sortable-th" onClick={() => handleSort('intervention_status')}>
                          干预状态 <SortIcon field="intervention_status" />
                        </th>
                        <th className="sortable-th" onClick={() => handleSort('alert_time')}>
                          预警时间 <SortIcon field="alert_time" />
                        </th>
                        <th style={{ width: 60 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedAlerts.map((alert) => {
                        const riskCls = alert.risk_level === 'high' ? 'risk-high' : alert.risk_level === 'medium' ? 'risk-medium' : 'risk-low';
                        const riskLabel = RISK_LABELS[alert.risk_level] || alert.risk_level;
                        const statusInfo = STATUS_MAP[alert.intervention_status] || { label: alert.intervention_status || '--', color: 'rgba(11,101,101,0.45)' };

                        return (
                          <tr key={alert.alert_id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{alert.student_id}</td>
                            <td style={{ fontWeight: 500 }}>{alert.student_name || '--'}</td>
                            <td>
                              <span className={`risk-badge ${riskCls}`}>{riskLabel}</span>
                            </td>
                            <td style={{ fontWeight: 600, color: alert.risk_score >= 5 ? 'var(--danger)' : alert.risk_score >= 3 ? 'var(--warning)' : 'var(--primary-dark)' }}>
                              {alert.risk_score ?? '--'}
                            </td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: statusInfo.color }}>
                                {alert.intervention_status === 'completed' ? (
                                  <CheckCircle2 size={12} />
                                ) : alert.intervention_status === 'in_progress' ? (
                                  <Clock size={12} />
                                ) : (
                                  <ShieldAlert size={12} />
                                )}
                                {statusInfo.label}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', whiteSpace: 'nowrap' }}>
                              {alert.alert_time
                                ? new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : '--'}
                            </td>
                            <td>
                              <button
                                className="liquid-btn liquid-btn-sm"
                                onClick={() => openInterveneModal(alert)}
                                title="干预操作"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem' }}
                              >
                                <Pencil size={12} />
                                <span className="btn-label">干预</span>
                              </button>
                            </td>
                          </tr>
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
                <ShieldAlert size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
                <p className="text-tertiary">
                  {riskFilter || statusFilter || searchKeyword ? '当前筛选条件下暂无预警记录' : '暂无预警数据，请点击"重新生成预警"'}
                </p>
              </div>
            )}
          </LiquidCard>
        </div>
      </div>

      {/* ===== 干预操作弹窗 ===== */}
      {modalOpen && interveneAlert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={closeModal}
        >
          {/* 遮罩层 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          />
          {/* 弹窗内容 */}
          <div
            className="liquid-scroll"
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(24px)',
              border: '0.5px solid rgba(11,101,101,0.08)',
              borderRadius: 16,
              padding: '1.75rem',
              width: 480,
              maxWidth: '90vw',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={closeModal}
              style={{
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
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}
            >
              <X size={18} />
            </button>

            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.0625rem' }}>干预操作</h2>

            {/* 预警完整信息展示 */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem 1.25rem',
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'rgba(11,101,101,0.03)',
              borderRadius: 10,
              fontSize: '0.8125rem',
              color: 'rgba(11,101,101,0.65)',
            }}>
              <span>预警 ID: <strong style={{ color: '#095050' }}>{interveneAlert.alert_id}</strong></span>
              <span>学生ID: <strong style={{ color: '#095050', fontFamily: 'var(--font-mono)' }}>{interveneAlert.student_id}</strong></span>
              <span>姓名: <strong style={{ color: '#095050' }}>{interveneAlert.student_name || '--'}</strong></span>
              <span>风险等级: <span className={`risk-badge ${interveneAlert.risk_level === 'high' ? 'risk-high' : interveneAlert.risk_level === 'medium' ? 'risk-medium' : 'risk-low'}`}>{RISK_LABELS[interveneAlert.risk_level] || interveneAlert.risk_level}</span></span>
              <span>风险评分: <strong style={{ color: interveneAlert.risk_score >= 5 ? 'var(--danger)' : interveneAlert.risk_score >= 3 ? 'var(--warning)' : 'var(--primary-dark)' }}>{interveneAlert.risk_score ?? '--'}</strong></span>
              <span>预警时间: <strong style={{ color: '#095050' }}>{interveneAlert.alert_time ? new Date(interveneAlert.alert_time).toLocaleString('zh-CN') : '--'}</strong></span>
            </div>

            {/* 表单 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.375rem' }}>
                  干预状态
                </label>
                <LiquidSelect
                  value={interveneStatus}
                  onChange={setInterveneStatus}
                  options={[
                    { value: 'pending', label: '待处理' },
                    { value: 'in_progress', label: '进行中' },
                    { value: 'completed', label: '已完成' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.375rem' }}>
                  干预措施
                </label>
                <textarea
                  className="liquid-input"
                  placeholder="请输入干预措施..."
                  value={interveneMeasure}
                  onChange={(e) => setInterveneMeasure(e.target.value)}
                  rows={3}
                  style={{ width: '100%', resize: 'vertical', minHeight: 72 }}
                />
              </div>
            </div>

            {/* 反馈消息 */}
            {interveneMsg && (
              <div
                className={`liquid-alert ${interveneMsg.type === 'error' ? 'liquid-alert-error' : 'liquid-alert-success'}`}
                style={{ marginTop: '0.75rem' }}
              >
                {interveneMsg.type === 'error' ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
                {interveneMsg.text}
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="liquid-btn" onClick={closeModal}>
                取消
              </button>
              <button className="liquid-btn liquid-btn-primary" onClick={handleIntervene}>
                确认更新
              </button>
            </div>
          </div>
        </div>
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
