import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, ArrowRight, User, ChevronDown, ChevronUp } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import { useRole } from '../../contexts/RoleContext';
import { getStudent, getAlerts } from '../../api';
import { useNavigate } from 'react-router-dom';

const RISK_LABELS = { low: '低风险', medium: '中风险', high: '高风险' };
const RISK_COLORS = { high: '#c0392b', medium: '#d4880f', low: '#1a8a5a' };
const INTERVENTION_LABELS = { pending: '待处理', in_progress: '进行中', completed: '已完成' };
const INTERVENTION_COLORS = { pending: 'rgba(11,101,101,0.45)', in_progress: '#d4880f', completed: '#1a8a5a' };

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
  if (score >= 5) return 'var(--danger)';
  if (score >= 3) return 'var(--warning)';
  return 'var(--success)';
}

function getProgressGradient(score) {
  if (score >= 5) return 'linear-gradient(90deg, var(--danger), var(--danger-light))';
  if (score >= 3) return 'linear-gradient(90deg, var(--warning), var(--warning-light))';
  return 'linear-gradient(90deg, var(--primary), var(--primary-lighter))';
}

export default function StudentAlert() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

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

  // 未选择学生
  if (!selectedStudentId) {
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
        <LiquidCard>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <User size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary">请先在右上角选择学生身份</p>
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
          <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
        </div>
        <h1 style={{ margin: 0 }}>风险预警</h1>
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
              <CheckCircle size={40} style={{ color: 'rgba(26,138,90,0.25)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary" style={{ fontSize: '0.9375rem' }}>暂无预警记录，表现良好</p>
            </div>
          </LiquidCard>
          {/* 快捷操作 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/suggestions')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              生成学习建议 <ArrowRight size={12} />
            </button>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/trends')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
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
          {latestAlert?.risk_factors && (() => {
            const factors = parseRiskFactors(latestAlert.risk_factors);
            if (factors.length === 0) return null;
            return (
              <LiquidCard title="风险因素分析" style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {factors.map((factor, idx) => {
                    const isHigh = currentRiskLevel === 'high';
                    const isMedium = currentRiskLevel === 'medium';
                    const iconColor = isHigh ? 'var(--danger)' : isMedium ? 'var(--warning)' : 'var(--success)';
                    const bgColor = isHigh ? 'rgba(192,57,43,0.06)' : isMedium ? 'rgba(212,136,15,0.06)' : 'rgba(26,138,90,0.06)';
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '0.5rem',
                        background: bgColor,
                        border: '0.5px solid rgba(11,101,101,0.06)',
                      }}>
                        <AlertTriangle size={14} style={{ color: iconColor, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8125rem', color: '#2a3d3d' }}>{factor}</span>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          color: iconColor,
                          flexShrink: 0,
                        }}>
                          {isHigh ? '高影响' : isMedium ? '中影响' : '低影响'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </LiquidCard>
            );
          })()}

          {/* 预警历史表格 */}
          <LiquidCard title="预警历史" style={{ marginTop: '1.25rem', padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="liquid-table">
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
                    const isExpanded = expandedId === alert.alert_id;
                    const statusColor = INTERVENTION_COLORS[alert.intervention_status] || 'rgba(11,101,101,0.45)';
                    const statusLabel = INTERVENTION_LABELS[alert.intervention_status] || alert.intervention_status || '--';

                    return (
                      <tr key={alert.alert_id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : alert.alert_id)}>
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: statusColor, fontWeight: 500 }}>
                            {alert.intervention_status === 'completed' ? <CheckCircle size={12} /> :
                             alert.intervention_status === 'in_progress' ? <Clock size={12} /> :
                             <AlertTriangle size={12} />}
                            {statusLabel}
                          </span>
                        </td>
                        <td>
                          {isExpanded ? <ChevronUp size={14} style={{ color: 'rgba(11,101,101,0.35)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(11,101,101,0.35)' }} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 展开的干预措施详情 */}
            {expandedId && (() => {
              const alert = sortedAlerts.find(a => a.alert_id === expandedId);
              if (!alert) return null;
              return (
                <div style={{
                  padding: '0.875rem 1.25rem',
                  borderTop: '0.5px solid rgba(11,101,101,0.05)',
                  background: 'rgba(11,101,101,0.015)',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.375rem' }}>干预措施</div>
                  <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.6 }}>
                    {alert.intervention_measure || '暂无干预措施'}
                  </div>
                  {alert.risk_factors && (() => {
                    const factors = parseRiskFactors(alert.risk_factors);
                    if (factors.length <= 2) return null;
                    return (
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
                    );
                  })()}
                </div>
              );
            })()}
          </LiquidCard>

          {/* 快捷操作 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/suggestions')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              生成学习建议 <ArrowRight size={12} />
            </button>
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/trends')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              查看成绩分析 <ArrowRight size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
