import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert, ChevronDown, User, ArrowRight, TrendingUp, BookOpen } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import { useRole } from '../../contexts/RoleContext';
import { getStudent, getAlerts } from '../../api';
import { useNavigate } from 'react-router-dom';

const RISK_LABELS = { low: '低风险', medium: '中风险', high: '高风险' };
const STATUS_MAP = {
  pending: { label: '待处理', color: 'rgba(11,101,101,0.45)', icon: 'ShieldAlert' },
  in_progress: { label: '进行中', color: '#d4880f', icon: 'Clock' },
  completed: { label: '已完成', color: '#1a8a5a', icon: 'CheckCircle2' },
};

const FACTOR_DESCRIPTIONS = {
  '出勤率低': '出勤率低于正常水平，可能影响学习连续性和知识掌握',
  '出勤率偏低': '出勤率低于正常水平，可能影响学习连续性和知识掌握',
  '学习时长不足': '课后学习时间不够，难以充分消化课堂内容',
  '睡眠不足': '睡眠时间不足可能影响注意力和学习效率',
  '缺乏辅导': '缺少课外辅导支持，疑难问题可能得不到及时解决',
  '缺乏运动': '运动不足可能影响身体健康和学习精力',
  '学习动力不足': '学习积极性不高，需要更多激励和引导',
  '成绩下降': '近期成绩出现下滑趋势，需要关注原因',
};

function parseRiskFactors(factors) {
  if (!factors) return [];
  try {
    const parsed = typeof factors === 'string' ? JSON.parse(factors) : factors;
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [String(factors)];
  }
}

function getScoreColor(score) {
  if (score >= 7) return 'var(--danger)';
  if (score >= 4) return 'var(--warning)';
  return 'var(--success)';
}

function getProgressGradient(score) {
  if (score >= 7) return 'linear-gradient(90deg, var(--danger), var(--danger-light))';
  if (score >= 4) return 'linear-gradient(90deg, var(--warning), var(--warning-light))';
  return 'linear-gradient(90deg, var(--primary), var(--primary-lighter))';
}

function getImpactLevel(riskLevel) {
  if (riskLevel === 'high') return { label: '高影响', color: 'var(--danger)', bg: 'rgba(192,57,43,0.06)' };
  if (riskLevel === 'medium') return { label: '中影响', color: 'var(--warning)', bg: 'rgba(212,136,15,0.06)' };
  return { label: '低影响', color: 'var(--success)', bg: 'rgba(26,138,90,0.06)' };
}

function StatusIcon({ status, size = 12 }) {
  switch (status) {
    case 'completed': return <CheckCircle2 size={size} />;
    case 'in_progress': return <Clock size={size} />;
    default: return <ShieldAlert size={size} />;
  }
}

export default function ParentAlert() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    Promise.all([
      getStudent(selectedStudentId),
      getAlerts({ student_id: selectedStudentId }),
    ])
      .then(([studentRes, alertsRes]) => {
        setStudentInfo(studentRes.data);
        setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      })
      .catch((err) => console.error('获取预警数据失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  // 按预警时间降序排列
  const sortedAlerts = [...alerts].sort((a, b) => {
    const ta = a.alert_time ? new Date(a.alert_time).getTime() : 0;
    const tb = b.alert_time ? new Date(b.alert_time).getTime() : 0;
    return tb - ta;
  });

  // 最新预警
  const latestAlert = sortedAlerts[0] || null;
  const currentRiskLevel = latestAlert?.risk_level || null;
  const currentRiskScore = latestAlert?.risk_score ?? null;

  // 当前风险等级对应的 badge class
  const riskBadgeCls = currentRiskLevel === 'high' ? 'risk-high' : currentRiskLevel === 'medium' ? 'risk-medium' : 'risk-low';

  // 收集所有不重复的风险因素
  const allFactors = [...new Set(sortedAlerts.flatMap((a) => parseRiskFactors(a.risk_factors)))];

  // 干预状态统计
  const interventionCounts = sortedAlerts.reduce(
    (acc, a) => {
      const status = a.intervention_status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { pending: 0, in_progress: 0, completed: 0 }
  );

  // 有干预记录的预警
  const interventionsWithAction = sortedAlerts.filter(
    (a) => (a.intervention_status && a.intervention_status !== 'pending') || a.intervention_measure
  );

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 未选择学生
  if (!selectedStudentId) {
    return (
      <div className="home-page">
        <div className="home-orb home-orb--top" />
        <div className="home-orb home-orb--bottom" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <h1 style={{ margin: 0 }}>风险预警</h1>
        </div>
        <LiquidCard>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <User size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary">请先在右上角选择孩子身份</p>
          </div>
        </LiquidCard>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 页面标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
        </div>
        <h1 style={{ margin: 0 }}>风险预警</h1>
        {selectedStudentName && (
          <span className="text-tertiary" style={{ fontSize: '0.8125rem', marginLeft: '0.25rem' }}>
            {selectedStudentName}
          </span>
        )}
        {currentRiskLevel && (
          <span className={`risk-badge ${riskBadgeCls}`} style={{ fontSize: '0.8125rem', padding: '0.25rem 0.875rem', marginLeft: '0.25rem' }}>
            {RISK_LABELS[currentRiskLevel]}
          </span>
        )}
      </div>

      {loading ? (
        <LiquidCard>
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>加载中...</p>
        </LiquidCard>
      ) : sortedAlerts.length === 0 ? (
        <>
          <LiquidCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
              <ShieldAlert size={40} style={{ color: 'rgba(26,138,90,0.25)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary" style={{ fontSize: '0.9375rem' }}>孩子暂无预警记录，表现良好</p>
            </div>
          </LiquidCard>
          {/* 快捷操作 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/parent/suggestions')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              生成学习建议 <ArrowRight size={12} />
            </button>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/parent/scores')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              查看成绩分析 <ArrowRight size={12} />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 风险概览卡片 */}
          <LiquidCard title="风险概览">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* 风险评分 */}
              <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, color: getScoreColor(currentRiskScore), lineHeight: 1.2 }}>
                  {currentRiskScore ?? '--'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', marginTop: '0.25rem' }}>风险评分</div>
              </div>

              {/* 进度条 */}
              <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(11,101,101,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 2,
                    background: getProgressGradient(currentRiskScore),
                    width: `${(currentRiskScore / 10) * 100}%`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)' }}>
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>

              {/* 风险等级 + 最后预警时间 */}
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                {currentRiskLevel && (
                  <span className={`risk-badge ${riskBadgeCls}`}>
                    {RISK_LABELS[currentRiskLevel]}
                  </span>
                )}
                {latestAlert?.alert_time && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)' }}>
                    <Clock size={10} />
                    最后预警：{new Date(latestAlert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </LiquidCard>

          {/* 风险因素分析 */}
          {allFactors.length > 0 && (
            <LiquidCard title="风险因素分析" style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allFactors.map((factor, idx) => {
                  const impact = getImpactLevel(currentRiskLevel);
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.5rem',
                      background: impact.bg,
                      border: '0.5px solid rgba(11,101,101,0.06)',
                    }}>
                      <AlertTriangle size={14} style={{ color: impact.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', fontWeight: 500 }}>{factor}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.55)', marginTop: '0.125rem' }}>
                          {FACTOR_DESCRIPTIONS[factor] || '该因素可能影响孩子的学业表现'}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: impact.color,
                        flexShrink: 0,
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        background: impact.bg,
                        border: `0.5px solid ${impact.color}33`,
                      }}>
                        {impact.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </LiquidCard>
          )}

          {/* 干预跟踪 */}
          <LiquidCard title="干预跟踪" style={{ marginTop: '1.25rem' }}>
            {/* 干预状态统计 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: interventionsWithAction.length > 0 ? '1rem' : 0 }}>
              {[
                { key: 'pending', label: '待处理', color: 'rgba(11,101,101,0.45)', icon: <ShieldAlert size={14} /> },
                { key: 'in_progress', label: '进行中', color: '#d4880f', icon: <Clock size={14} /> },
                { key: 'completed', label: '已完成', color: '#1a8a5a', icon: <CheckCircle2 size={14} /> },
              ].map((item) => (
                <div key={item.key} className="metric-card" style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(11,101,101,0.08)', marginBottom: '0.375rem', color: item.color }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: '1.375rem', fontWeight: 700, color: item.color }}>{interventionCounts[item.key] || 0}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', marginTop: '0.125rem' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* 干预记录列表 */}
            {interventionsWithAction.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {interventionsWithAction.map((alert) => {
                  const statusInfo = STATUS_MAP[alert.intervention_status] || STATUS_MAP.pending;
                  return (
                    <div key={alert.alert_id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(11,101,101,0.015)',
                      border: '0.5px solid rgba(11,101,101,0.06)',
                    }}>
                      <div style={{ flexShrink: 0, color: statusInfo.color, marginTop: '0.0625rem' }}>
                        <StatusIcon status={alert.intervention_status} size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: statusInfo.color }}>{statusInfo.label}</span>
                          {alert.alert_time && (
                            <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)' }}>
                              {new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.6 }}>
                          {alert.intervention_measure || '暂无具体措施'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p className="text-tertiary" style={{ fontSize: '0.8125rem' }}>暂无干预记录</p>
              </div>
            )}
          </LiquidCard>

          {/* 预警历史表格 */}
          <LiquidCard title="预警历史" style={{ marginTop: '1.25rem' }}>
            <div style={{ overflowX: 'auto', borderRadius: '0.625rem', border: '0.5px solid rgba(11,101,101,0.08)' }}>
              <table className="liquid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>预警时间</th>
                    <th>风险等级</th>
                    <th>风险评分</th>
                    <th>风险因素</th>
                    <th>干预状态</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAlerts.map((alert) => {
                    const riskCls = alert.risk_level === 'high' ? 'risk-high' : alert.risk_level === 'medium' ? 'risk-medium' : 'risk-low';
                    const factors = parseRiskFactors(alert.risk_factors);
                    const isExpanded = expandedRows.has(alert.alert_id);
                    const statusInfo = STATUS_MAP[alert.intervention_status] || STATUS_MAP.pending;

                    return (
                      <React.Fragment key={alert.alert_id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleRow(alert.alert_id)}
                        >
                          <td style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.55)', whiteSpace: 'nowrap' }}>
                            {alert.alert_time ? new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                          </td>
                          <td>
                            <span className={`risk-badge ${riskCls}`}>{RISK_LABELS[alert.risk_level] || alert.risk_level}</span>
                          </td>
                          <td style={{ fontWeight: 600, color: getScoreColor(alert.risk_score) }}>
                            {alert.risk_score ?? '--'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {factors.slice(0, 2).map((f, i) => (
                                <span key={i} style={{
                                  fontSize: '0.6875rem',
                                  padding: '0.0625rem 0.375rem',
                                  borderRadius: '0.25rem',
                                  background: 'rgba(11,101,101,0.04)',
                                  color: 'rgba(11,101,101,0.6)',
                                }}>{f}</span>
                              ))}
                              {factors.length > 2 && (
                                <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)' }}>+{factors.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: statusInfo.color, fontWeight: 500 }}>
                              <StatusIcon status={alert.intervention_status} size={12} />
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>
                            <ChevronDown size={14} style={{
                              color: 'rgba(11,101,101,0.35)',
                              transition: 'transform 0.25s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              display: 'inline-block',
                            }} />
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={6} style={{ padding: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                            <div
                              style={{
                                maxHeight: isExpanded ? 400 : 0,
                                opacity: isExpanded ? 1 : 0,
                                overflow: 'hidden',
                                transition: 'max-height 0.3s ease, opacity 0.25s ease',
                              }}
                            >
                              <div style={{ padding: '0.875rem 1.25rem', background: 'rgba(11,101,101,0.015)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.375rem' }}>干预措施</div>
                                <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.6 }}>
                                  {alert.intervention_measure || '暂无干预措施'}
                                </div>
                                {factors.length > 2 && (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.375rem' }}>全部风险因素</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                      {factors.map((f, i) => (
                                        <span key={i} style={{
                                          fontSize: '0.6875rem',
                                          padding: '0.125rem 0.5rem',
                                          borderRadius: '0.25rem',
                                          background: 'rgba(11,101,101,0.04)',
                                          color: 'rgba(11,101,101,0.6)',
                                        }}>{f}</span>
                                      ))}
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
          </LiquidCard>

          {/* 快捷操作 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/parent/suggestions')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <BookOpen size={12} />
              生成学习建议 <ArrowRight size={12} />
            </button>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/parent/scores')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={12} />
              查看成绩分析 <ArrowRight size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
