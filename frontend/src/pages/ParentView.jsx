import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { User, AlertTriangle, Clock } from 'lucide-react';
import LiquidCard from '../components/LiquidCard';
import MetricCard from '../components/MetricCard';
import ChartTooltip from '../components/ChartTooltip';
import ChartFilterBtn from '../components/ChartFilterBtn';
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

const STATUS_MAP = {
  pending: { label: '待处理', color: 'rgba(11,101,101,0.45)' },
  in_progress: { label: '进行中', color: '#d4880f' },
  completed: { label: '已完成', color: '#1a8a5a' },
};

export default function ParentView() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const [studentInfo, setStudentInfo] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [alertData, setAlertData] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [visibleSubjects, setVisibleSubjects] = useState(['SUBJ_MATH', 'SUBJ_PORTUGUESE', 'SUBJ_GENERAL']);
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

  // 成绩趋势数据
  const chartDataBySubject = (() => {
    if (!scoreData || !scoreData.length) return {};
    const map = {};
    scoreData.forEach((item) => {
      const subj = item.subject_id;
      if (!map[subj]) map[subj] = [];
      map[subj].push({ exam_stage: item.exam_stage, score: item.score });
    });
    return map;
  })();

  const mergedChartData = (() => {
    if (!scoreData || !scoreData.length) return [];
    const stages = ['G1', 'G2', 'G3'];
    const subjects = Object.keys(chartDataBySubject);
    return stages.map((stage) => {
      const row = { exam_stage: stage };
      subjects.forEach((subj) => {
        const found = chartDataBySubject[subj]?.find((s) => s.exam_stage === stage);
        row[subj] = found ? found.score : null;
      });
      return row;
    });
  })();

  // 各科目最新成绩指标
  const latestScores = (() => {
    if (!scoreData || !scoreData.length) return [];
    const map = {};
    scoreData.forEach((item) => {
      const subj = item.subject_id;
      if (!map[subj]) map[subj] = item;
      // 取最新的（G3 > G2 > G1）
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

  if (!selectedStudentId) {
    return (
      <div>
        <h1 style={{ marginBottom: '1.25rem' }}>孩子成绩报告</h1>
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
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>孩子成绩报告</h1>

      {/* 学生信息 */}
      <LiquidCard style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="liquid-avatar" style={{ width: 48, height: 48, fontSize: '1.125rem' }}>
            {selectedStudentName?.charAt(0) || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1a2b2b' }}>
              {selectedStudentName}
            </div>
            <div className="text-tertiary" style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
              学号：{selectedStudentId}
              {studentInfo?.student_gender && ` · 性别：${studentInfo.student_gender === 'M' ? '男' : '女'}`}
              {studentInfo?.student_age && ` · 年龄：${studentInfo.student_age}`}
              {studentInfo?.student_class_id && ` · 班级：${studentInfo.student_class_id}`}
            </div>
          </div>
          {worstRisk && (
            <div style={{ marginLeft: 'auto' }}>
              <span className={`risk-badge risk-${worstRisk}`}>
                {worstRisk === 'high' ? '高风险' : worstRisk === 'medium' ? '中风险' : '低风险'}
              </span>
            </div>
          )}
        </div>
      </LiquidCard>

      {loading ? (
        <LiquidCard>
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>加载中...</p>
        </LiquidCard>
      ) : (
        <>
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

          {/* 成绩趋势图 */}
          <LiquidCard title="成绩趋势" style={{ marginBottom: '1.25rem' }}>
            {mergedChartData.length > 0 ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {Object.keys(SUBJECT_MAP).map((subj) => (
                    <ChartFilterBtn
                      key={subj}
                      mode="multi"
                      active={visibleSubjects.includes(subj)}
                      color={SUBJECT_COLORS[subj]}
                      onClick={() => {
                        setVisibleSubjects((prev) =>
                          prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
                        );
                      }}
                    >
                      {SUBJECT_MAP[subj]}
                    </ChartFilterBtn>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={mergedChartData} margin={{ top: 8, right: 16, bottom: 4, left: -10 }}>
                    <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
                    <XAxis
                      dataKey="exam_stage"
                      tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(value) => SUBJECT_MAP[value] || value}
                      wrapperStyle={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.65)' }}
                    />
                    {Object.keys(chartDataBySubject)
                      .filter((subj) => visibleSubjects.includes(subj))
                      .map((subj, idx) => (
                        <Line
                          key={subj}
                          type="monotone"
                          dataKey={subj}
                          name={subj}
                          stroke={SUBJECT_COLORS[subj] || (idx === 0 ? '#0b6565' : '#c9933a')}
                          strokeWidth={2}
                          dot={{ r: 4, fill: SUBJECT_COLORS[subj] || '#0b6565', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6 }}
                          strokeDasharray={idx > 0 ? '6 3' : undefined}
                          connectNulls
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无成绩数据</p>
            )}
          </LiquidCard>

          {/* 预警信息摘要 */}
          <LiquidCard title="预警信息">
            {alertData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alertData.map((alert) => {
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
                      <div style={{ flex: 1, padding: '0.75rem 0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
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
                                return (
                                  <span style={{
                                    fontSize: '0.6875rem',
                                    padding: '0.0625rem 0.375rem',
                                    borderRadius: '0.25rem',
                                    background: 'rgba(11,101,101,0.04)',
                                    color: 'rgba(11,101,101,0.6)',
                                  }}>{String(alert.risk_factors)}</span>
                                );
                              }
                            })()}
                          </div>
                        )}
                        {alert.intervention_measure && (
                          <div style={{
                            fontSize: '0.6875rem',
                            color: 'var(--primary)',
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(11,101,101,0.03)',
                            borderRadius: '0.25rem',
                            borderLeft: '2px solid var(--primary)',
                            marginTop: '0.25rem',
                          }}>
                            {alert.intervention_measure}
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
                <AlertTriangle size={32} style={{ color: 'rgba(26,138,90,0.3)', marginBottom: '0.75rem' }} />
                <p className="text-tertiary">孩子暂无预警记录，表现良好</p>
              </div>
            )}
          </LiquidCard>
        </>
      )}
    </div>
  );
}
