import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import WelcomeBanner from '../components/WelcomeBanner';
import LiquidCard from '../components/LiquidCard';
import MetricCard from '../components/MetricCard';
import { useRole } from '../contexts/RoleContext';
import { getStudent, getScoreTrend, getAlerts, getAlertStats } from '../api';

const SUBJECT_MAP = {
  SUBJ_MATH: '数学',
  SUBJ_PORTUGUESE: '葡萄牙语',
  SUBJ_GENERAL: '综合',
};

const SUBJECT_COLORS = {
  SUBJ_MATH: '#0b6565',
  SUBJ_PORTUGUESE: '#c9933a',
  SUBJ_GENERAL: '#1a8a5a',
};

const SUBJECT_FULL_SCORE = {
  SUBJ_MATH: 20,
  SUBJ_PORTUGUESE: 20,
  SUBJ_GENERAL: 100,
};

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

export default function ParentHome() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [alertData, setAlertData] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    Promise.all([
      getStudent(selectedStudentId),
      getScoreTrend(selectedStudentId),
      getAlerts({ student_id: selectedStudentId }),
      getAlertStats(),
    ])
      .then(([studentRes, trendRes, alertsRes, statsRes]) => {
        setStudentInfo(studentRes.data);
        setScoreData(trendRes.data?.scores || []);
        setAlertData(Array.isArray(alertsRes.data) ? alertsRes.data : []);
        setAlertStats(statsRes.data);
      })
      .catch((err) => console.error('加载数据失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  // 各科目最新成绩
  const latestScores = (() => {
    if (!scoreData || !scoreData.length) return [];
    const map = {};
    scoreData.forEach((item) => {
      const subj = item.subject_id;
      if (!map[subj]) map[subj] = item;
      const order = { G3: 3, G2: 2, G1: 1 };
      if ((order[item.exam_stage] || 0) > (order[map[subj].exam_stage] || 0)) {
        map[subj] = item;
      }
    });
    return Object.entries(map).map(([subj, item]) => ({
      subjectId: subj,
      subjectName: SUBJECT_MAP[subj] || subj,
      score: item.score,
      fullScore: SUBJECT_FULL_SCORE[subj] || 100,
      scoreRate: ((item.score / (SUBJECT_FULL_SCORE[subj] || 100)) * 100).toFixed(1),
    }));
  })();

  // 风险等级
  const worstRisk = alertData.length > 0
    ? alertData.reduce((worst, a) => {
        const order = { high: 3, medium: 2, low: 1 };
        return order[a.risk_level] > order[worst] ? a.risk_level : worst;
      }, 'low')
    : null;

  // 风险分布
  const riskSummary = (() => {
    const summary = { high: 0, medium: 0, low: 0 };
    alertData.forEach((a) => { if (summary[a.risk_level] !== undefined) summary[a.risk_level]++; });
    return summary;
  })();

  if (!selectedStudentId) {
    return (
      <div>
        <WelcomeBanner
          role="parent"
          title="家长"
          subtitle="关注孩子的学业表现与预警信息"
        />
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

  return (
    <div className="home-page">
      {/* 装饰光晕 */}
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 欢迎横幅 */}
      <WelcomeBanner
        role="parent"
        title={`${selectedStudentName}的家长`}
        subtitle="关注孩子的学业表现与预警信息"
        stats={[
          { value: alertData.length, label: '预警总数' },
          ...(worstRisk ? [{ value: worstRisk === 'high' ? '高' : worstRisk === 'medium' ? '中' : '低', label: '风险等级', color: worstRisk === 'high' ? 'var(--danger)' : worstRisk === 'medium' ? 'var(--warning)' : 'var(--success)' }] : []),
        ]}
      />

      {/* 孩子信息条 */}
      <div className="home-info-bar">
        <span className="home-info-item">
          <span className="home-info-label">学号</span>
          <span className="home-info-value">{selectedStudentId}</span>
        </span>
        {studentInfo?.student_gender && (
          <>
            <span className="home-info-divider" />
            <span className="home-info-item">
              <span className="home-info-label">性别</span>
              <span className="home-info-value">{studentInfo.student_gender === 'M' ? '男' : '女'}</span>
            </span>
          </>
        )}
        {studentInfo?.student_age && (
          <>
            <span className="home-info-divider" />
            <span className="home-info-item">
              <span className="home-info-label">年龄</span>
              <span className="home-info-value">{studentInfo.student_age}</span>
            </span>
          </>
        )}
        {studentInfo?.student_class_id && (
          <>
            <span className="home-info-divider" />
            <span className="home-info-item">
              <span className="home-info-label">班级</span>
              <span className="home-info-value">{studentInfo.student_class_id}</span>
            </span>
          </>
        )}
        {worstRisk && (
          <span className={`risk-badge risk-${worstRisk}`} style={{ fontSize: '0.6875rem' }}>
            {worstRisk === 'high' ? '高风险' : worstRisk === 'medium' ? '中风险' : '低风险'}
          </span>
        )}
      </div>

      {/* 各科目最新成绩 */}
      {latestScores.length > 0 && (
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
          {latestScores.map((item) => (
            <MetricCard
              key={item.subjectId}
              icon="check"
              label={`${item.subjectName}得分率`}
              value={`${item.scoreRate}%`}
              color={parseFloat(item.scoreRate) < 60 ? 'danger' : parseFloat(item.scoreRate) < 80 ? 'warning' : 'success'}
            />
          ))}
        </div>
      )}

      {/* 两栏：预警统计 + 最近预警 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 预警统计 */}
        <LiquidCard title="预警统计">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { level: 'high', label: '高风险', color: '#c0392b', count: riskSummary.high },
              { level: 'medium', label: '中风险', color: '#d4880f', count: riskSummary.medium },
              { level: 'low', label: '低风险', color: '#1a8a5a', count: riskSummary.low },
            ].map((item) => (
              <div key={item.level} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1a2b2b' }}>{item.label}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color }}>{item.count}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(11,101,101,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${alertData.length ? (item.count / alertData.length * 100) : 0}%`,
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

        {/* 最近预警 */}
        <LiquidCard
          title="最近预警"
          action={
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/parent-view/alerts')}>
              查看全部 <ArrowRight size={12} />
            </button>
          }
        >
          {alertData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {alertData.slice(0, 3).map((alert) => {
                const riskColor = alert.risk_level === 'high' ? '#c0392b' : alert.risk_level === 'medium' ? '#d4880f' : '#1a8a5a';
                const riskLabel = RISK_LABELS[alert.risk_level] || alert.risk_level;
                const statusInfo = STATUS_MAP[alert.intervention_status] || { label: '--', color: 'rgba(11,101,101,0.45)' };
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
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.625rem',
                          color: statusInfo.color,
                        }}>
                          <span style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: statusInfo.color,
                            display: 'inline-block',
                          }} />
                          {statusInfo.label}
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
              <CheckCircle2 size={32} style={{ color: 'rgba(26,138,90,0.2)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary">孩子暂无预警记录，表现良好</p>
            </div>
          )}
        </LiquidCard>
      </div>
    </div>
  );
}
