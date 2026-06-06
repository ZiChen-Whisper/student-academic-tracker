import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, GraduationCap, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import WelcomeBanner from '../components/WelcomeBanner';
import LiquidCard from '../components/LiquidCard';
import MetricCard from '../components/MetricCard';
import { useRole } from '../contexts/RoleContext';
import { getOverview, getAlertStats, getAlerts, getClassStats } from '../api';

const RISK_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const SUBJECT_FULL_SCORE = {
  SUBJ_MATH: 20,
  SUBJ_PORTUGUESE: 20,
  SUBJ_GENERAL: 100,
};

const SUBJECT_MAP = {
  SUBJ_GENERAL: '综合',
  SUBJ_MATH: '数学',
  SUBJ_PORTUGUESE: '葡萄牙语',
};

export default function Home() {
  const { role, selectedTeacherClassId, selectedTeacherName } = useRole();
  const navigate = useNavigate();
  const classId = role === 'teacher' && selectedTeacherClassId ? selectedTeacherClassId : '';
  const [overview, setOverview] = useState(null);
  const [alertStats, setAlertStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = classId ? { class_id: classId } : {};
    Promise.all([
      getOverview(params),
      getAlertStats(params),
      getAlerts({ ...params, page_size: 5 }),
      getClassStats(params),
    ])
      .then(([ovRes, alRes, alertsRes, csRes]) => {
        setOverview(ovRes.data);
        setAlertStats(alRes.data);
        setRecentAlerts(Array.isArray(alertsRes.data) ? alertsRes.data.slice(0, 5) : (alertsRes.data?.alerts || alertsRes.data?.data || []).slice(0, 5));
        setClassStats(csRes.data?.data || (Array.isArray(csRes.data) ? csRes.data : []));
      })
      .catch((err) => console.error('加载主页数据失败:', err))
      .finally(() => setLoading(false));
  }, [classId]);

  // 及格率
  const passRate = (() => {
    if (!classStats.length) return '--';
    let totalPass = 0;
    let totalStudents = 0;
    classStats.forEach((item) => {
      const count = item.student_count || 0;
      const rate = (item.pass_rate || 0) / 100;
      totalPass += count * rate;
      totalStudents += count;
    });
    if (totalStudents === 0) return '--';
    return ((totalPass / totalStudents) * 100).toFixed(1) + '%';
  })();

  // 各科目得分率
  const subjectScoreRateData = (() => {
    const map = {};
    classStats.forEach((item) => {
      const subj = item.subject_id || '未知';
      if (!map[subj]) map[subj] = { totalScore: 0, totalCount: 0 };
      map[subj].totalScore += (item.avg_score || 0) * (item.student_count || 0);
      map[subj].totalCount += item.student_count || 0;
    });
    return Object.entries(map).map(([key, val]) => {
      const fullScore = SUBJECT_FULL_SCORE[key] || 100;
      const avgScore = val.totalCount ? +(val.totalScore / val.totalCount).toFixed(1) : 0;
      const scoreRate = +(avgScore / fullScore * 100).toFixed(1);
      return { subject: SUBJECT_MAP[key] || key, subjectId: key, avgScore, fullScore, scoreRate };
    });
  })();

  // 风险分布
  const riskData = (() => {
    if (!alertStats) return [];
    const stats = alertStats.stats || alertStats;
    return [
      { name: '高风险', value: stats.high || 0, key: 'high', color: '#c0392b' },
      { name: '中风险', value: stats.medium || 0, key: 'medium', color: '#d4880f' },
      { name: '低风险', value: stats.low || 0, key: 'low', color: '#1a8a5a' },
    ];
  })();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* 装饰光晕 */}
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 欢迎横幅 */}
      <WelcomeBanner
        role={role}
        title={role === 'admin' ? '系统管理员' : `${selectedTeacherName || ''}老师`}
        subtitle={role === 'admin' ? '全校学情数据一览' : '班级学情数据一览'}
        stats={[
          { value: overview?.total_students ?? '--', label: '学生总数' },
          { value: overview?.high_risk_count ?? '--', label: '高风险', color: 'var(--danger)' },
          { value: passRate, label: '及格率', color: 'var(--success)' },
        ]}
      />

      {/* 核心指标 */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.25rem' }}>
        <MetricCard icon="users" label="学生总数" value={overview?.total_students ?? '--'} />
        <MetricCard icon="trend" label="平均得分率" value={overview?.average_score_rate != null ? Number(overview.average_score_rate).toFixed(1) + '%' : '--'} />
        <MetricCard icon="alert" label="高风险学生" value={overview?.high_risk_count ?? '--'} color="danger" />
        <MetricCard icon="check" label="及格率" value={passRate} color="success" />
      </div>

      {/* 两栏布局：科目得分率 + 风险概览 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 各科目得分率 */}
        <LiquidCard title="各科目得分率">
          {subjectScoreRateData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              {subjectScoreRateData.map((item) => (
                <div key={item.subjectId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#095050' }}>{item.subject}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.5)' }}>
                      平均 {item.avgScore} / {item.fullScore}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ flex: 1, height: 20, background: 'rgba(11,101,101,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.scoreRate}%`,
                          background: 'linear-gradient(90deg, #0b6565, rgba(11,101,101,0.5))',
                          borderRadius: 10,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0b6565', minWidth: 48, textAlign: 'right' }}>
                      {item.scoreRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>
          )}
        </LiquidCard>

        {/* 风险概览 */}
        <LiquidCard title="风险概览">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {riskData.map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${item.color}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={16} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1a2b2b' }}>{item.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(11,101,101,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${riskData.reduce((s, d) => s + d.value, 0) ? (item.value / riskData.reduce((s, d) => s + d.value, 0) * 100) : 0}%`,
                      background: item.color,
                      borderRadius: 2,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </LiquidCard>
      </div>

      {/* 最近预警 */}
      <LiquidCard
        title="最近预警"
        action={
          <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/alert')}>
            查看全部 <ArrowRight size={12} />
          </button>
        }
      >
        {recentAlerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentAlerts.map((alert) => {
              const riskColor = alert.risk_level === 'high' ? '#c0392b' : alert.risk_level === 'medium' ? '#d4880f' : '#1a8a5a';
              const riskLabel = RISK_LABELS[alert.risk_level] || alert.risk_level;
              return (
                <div
                  key={alert.alert_id}
                  style={{
                    display: 'flex',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    border: '0.5px solid rgba(11,101,101,0.06)',
                    background: 'rgba(11,101,101,0.015)',
                  }}
                >
                  <div style={{
                    width: 3,
                    flexShrink: 0,
                    background: riskColor,
                    borderRadius: '3px 0 0 3px',
                  }} />
                  <div style={{ flex: 1, padding: '0.625rem 0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: riskColor }}>{riskLabel}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#1a2b2b' }}>
                        {alert.student_name || alert.student_id || '--'}
                      </span>
                      <span style={{ flex: 1 }} />
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.625rem',
                        color: 'rgba(11,101,101,0.35)',
                        whiteSpace: 'nowrap',
                      }}>
                        <Clock size={9} />
                        {alert.alert_time ? new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                      </span>
                    </div>
                    {alert.risk_factors && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {(() => {
                          try {
                            const factors = typeof alert.risk_factors === 'string'
                              ? JSON.parse(alert.risk_factors)
                              : alert.risk_factors;
                            const arr = Array.isArray(factors) ? factors : [String(factors)];
                            return arr.map((f, i) => (
                              <span key={i} style={{
                                fontSize: '0.6875rem',
                                padding: '0.0625rem 0.375rem',
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
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem 0',
          }}>
            <CheckCircle size={32} style={{ color: 'rgba(26,138,90,0.2)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary">暂无预警记录</p>
          </div>
        )}
      </LiquidCard>
    </div>
  );
}
