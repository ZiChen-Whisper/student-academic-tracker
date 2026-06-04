import { useState, useEffect } from 'react';
import { ShieldAlert, Clock, CheckCircle2, User } from 'lucide-react';
import LiquidCard from '../components/LiquidCard';
import { useRole } from '../contexts/RoleContext';
import { getAlerts } from '../api';

const RISK_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const STATUS_MAP = {
  pending: { label: '待处理', color: 'rgba(11,101,101,0.45)' },
  in_progress: { label: '进行中', color: '#d4880f' },
  completed: { label: '已完成', color: '#1a8a5a' },
};

export default function ParentAlerts() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    getAlerts({ student_id: selectedStudentId })
      .then((res) => setAlertData(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('获取预警失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  if (!selectedStudentId) {
    return (
      <div>
        <h1 style={{ marginBottom: '1.25rem' }}>预警通知</h1>
        <LiquidCard>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
          }}>
            <User size={48} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '1rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.9375rem' }}>
              请先在右上角选择孩子身份
            </p>
          </div>
        </LiquidCard>
      </div>
    );
  }

  // 按风险等级排序
  const sortedAlerts = [...alertData].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.risk_level] || 2) - (order[b.risk_level] || 2);
  });

  return (
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>预警通知</h1>

      {loading ? (
        <LiquidCard>
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>加载中...</p>
        </LiquidCard>
      ) : sortedAlerts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* 统计摘要 */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '0.5rem' }}>
            {[
              { level: 'high', label: '高风险', color: 'var(--danger)' },
              { level: 'medium', label: '中风险', color: 'var(--warning)' },
              { level: 'low', label: '低风险', color: 'var(--success)' },
            ].map((item) => {
              const count = sortedAlerts.filter((a) => a.risk_level === item.level).length;
              return (
                <div key={item.level} className="metric-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.375rem', fontWeight: 700, color: item.color }}>{count}</div>
                  <div className="metric-label">{item.label}预警</div>
                </div>
              );
            })}
          </div>

          {/* 预警列表 */}
          {sortedAlerts.map((alert) => {
            const riskColor = alert.risk_level === 'high' ? '#c0392b' : alert.risk_level === 'medium' ? '#d4880f' : '#1a8a5a';
            const riskLabel = RISK_LABELS[alert.risk_level] || alert.risk_level;
            const statusInfo = STATUS_MAP[alert.intervention_status] || { label: '--', color: 'rgba(11,101,101,0.45)' };

            return (
              <LiquidCard key={alert.alert_id}>
                <div style={{ display: 'flex', gap: '0.875rem' }}>
                  {/* 左侧风险等级指示 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    paddingTop: '0.125rem',
                  }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: riskColor,
                    }} />
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: riskColor, writingMode: 'vertical-rl' }}>
                      {riskLabel}
                    </span>
                  </div>

                  {/* 右侧内容 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        color: statusInfo.color,
                        fontWeight: 500,
                      }}>
                        {alert.intervention_status === 'completed' ? (
                          <CheckCircle2 size={12} />
                        ) : alert.intervention_status === 'in_progress' ? (
                          <Clock size={12} />
                        ) : (
                          <ShieldAlert size={12} />
                        )}
                        干预状态：{statusInfo.label}
                      </span>
                      <span style={{ flex: 1 }} />
                      <span style={{
                        fontSize: '0.6875rem',
                        color: 'rgba(11,101,101,0.35)',
                        whiteSpace: 'nowrap',
                      }}>
                        {alert.alert_time ? new Date(alert.alert_time).toLocaleString('zh-CN') : '--'}
                      </span>
                    </div>

                    {/* 风险因素 */}
                    {alert.risk_factors && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                        {(() => {
                          try {
                            const factors = typeof alert.risk_factors === 'string'
                              ? JSON.parse(alert.risk_factors)
                              : alert.risk_factors;
                            const arr = Array.isArray(factors) ? factors : [String(factors)];
                            return arr.map((f, i) => (
                              <span key={i} style={{
                                fontSize: '0.6875rem',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.25rem',
                                background: 'rgba(11,101,101,0.04)',
                                color: 'rgba(11,101,101,0.6)',
                              }}>{f}</span>
                            ));
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    )}

                    {/* 干预措施 */}
                    {alert.intervention_measure && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--primary)',
                        padding: '0.375rem 0.625rem',
                        background: 'rgba(11,101,101,0.03)',
                        borderRadius: '0.375rem',
                        borderLeft: '2px solid var(--primary)',
                      }}>
                        <span style={{ fontWeight: 500 }}>干预措施：</span>
                        {alert.intervention_measure}
                      </div>
                    )}
                  </div>
                </div>
              </LiquidCard>
            );
          })}
        </div>
      ) : (
        <LiquidCard>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
          }}>
            <ShieldAlert size={48} style={{ color: 'rgba(26,138,90,0.2)', marginBottom: '1rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.9375rem' }}>
              孩子暂无预警记录，表现良好
            </p>
          </div>
        </LiquidCard>
      )}
    </div>
  );
}
