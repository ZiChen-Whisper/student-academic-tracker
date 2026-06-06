import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, MessageCircle, TrendingUp, ArrowRight } from 'lucide-react';
import WelcomeBanner from '../components/WelcomeBanner';
import LiquidCard from '../components/LiquidCard';
import MetricCard from '../components/MetricCard';
import { useRole } from '../contexts/RoleContext';
import { getStudent, getScoreTrend, getSuggestions, getAlerts } from '../api';

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

export default function StudentHome() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    Promise.all([
      getStudent(selectedStudentId),
      getScoreTrend(selectedStudentId),
      getSuggestions(selectedStudentId),
      getAlerts({ student_id: selectedStudentId }),
    ])
      .then(([studentRes, trendRes, suggestionsRes, alertsRes]) => {
        setStudentInfo(studentRes.data);
        setScoreData(trendRes.data?.scores || []);
        setSuggestions(suggestionsRes.data || []);
        setAlertData(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      })
      .catch((err) => console.error('加载学生主页数据失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  // 最新各科成绩
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
      examStage: item.exam_stage,
    }));
  })();

  // 风险等级
  const worstRisk = alertData.length > 0
    ? alertData.reduce((worst, a) => {
        const order = { high: 3, medium: 2, low: 1 };
        return order[a.risk_level] > order[worst] ? a.risk_level : worst;
      }, 'low')
    : null;

  if (!selectedStudentId) {
    return (
      <div>
        <WelcomeBanner
          role="student"
          title="同学"
          subtitle="查看你的成绩趋势与学习数据"
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
              请先在右上角选择学生身份
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
        role="student"
        title={selectedStudentName}
        subtitle="查看你的成绩趋势与学习数据"
        stats={[
          ...(latestScores.find(s => s.subjectId === 'SUBJ_GENERAL') ? [{ value: `${latestScores.find(s => s.subjectId === 'SUBJ_GENERAL').scoreRate}%`, label: '综合得分率' }] : []),
          { value: suggestions.length, label: '学习建议' },
          ...(worstRisk ? [{ value: worstRisk === 'high' ? '高风险' : worstRisk === 'medium' ? '中风险' : '低风险', label: '风险等级', color: worstRisk === 'high' ? 'var(--danger)' : worstRisk === 'medium' ? 'var(--warning)' : 'var(--success)' }] : []),
        ]}
      />

      {/* 个人信息条 */}
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

      {/* 两栏：学习建议 + 预警摘要 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 学习建议概览 */}
        <LiquidCard
          title="学习建议"
          action={
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/suggestions')}>
              查看全部 <ArrowRight size={12} />
            </button>
          }
        >
          {suggestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {suggestions.slice(0, 2).map((s) => (
                <div
                  key={s.suggestion_id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '0.5px solid rgba(11,101,101,0.06)',
                    background: 'rgba(11,101,101,0.015)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.625rem',
                      color: 'rgba(11,101,101,0.35)',
                    }}>
                      <Clock size={9} />
                      {s.generate_time ? new Date(s.generate_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                    </span>
                    {s.student_feedback && (
                      <span style={{
                        fontSize: '0.625rem',
                        padding: '0.0625rem 0.375rem',
                        borderRadius: '9999px',
                        background: s.student_feedback === 'satisfied'
                          ? 'rgba(26,138,90,0.08)'
                          : s.student_feedback === 'unsatisfied'
                          ? 'rgba(192,57,43,0.08)'
                          : 'rgba(11,101,101,0.06)',
                        color: s.student_feedback === 'satisfied'
                          ? 'var(--success)'
                          : s.student_feedback === 'unsatisfied'
                          ? 'var(--danger)'
                          : 'rgba(11,101,101,0.65)',
                      }}>
                        {s.student_feedback === 'satisfied' ? '满意' :
                         s.student_feedback === 'unsatisfied' ? '不满意' : '一般'}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.8125rem',
                    color: '#2a3d3d',
                    lineHeight: 1.6,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {s.suggestion_content}
                  </div>
                </div>
              ))}
              {suggestions.length > 2 && (
                <p className="text-tertiary" style={{ textAlign: 'center', fontSize: '0.75rem', padding: '0.25rem 0' }}>
                  还有 {suggestions.length - 2} 条建议
                </p>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2rem 0',
            }}>
              <MessageCircle size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary">暂无学习建议</p>
            </div>
          )}
        </LiquidCard>

        {/* 预警摘要 */}
        <LiquidCard
          title="预警信息"
          action={
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/trends')}>
              成绩趋势 <ArrowRight size={12} />
            </button>
          }
        >
          {alertData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {alertData.slice(0, 3).map((alert) => {
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
              <TrendingUp size={32} style={{ color: 'rgba(26,138,90,0.2)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary">暂无预警记录，表现良好</p>
            </div>
          )}
        </LiquidCard>
      </div>
    </div>
  );
}
