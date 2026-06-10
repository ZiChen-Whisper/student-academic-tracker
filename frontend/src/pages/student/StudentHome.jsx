import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  User, Clock, MessageCircle, TrendingUp, ArrowRight, CalendarClock, BookOpen, Moon,
  AlertTriangle, CheckCircle, Brain, Home, Wifi, Dumbbell, ShieldAlert, ShieldCheck, HeartPulse,
} from 'lucide-react';
import WelcomeBanner from '../../components/WelcomeBanner';
import LiquidCard from '../../components/LiquidCard';
import MetricCard from '../../components/MetricCard';
import ChartTooltip from '../../components/ChartTooltip';
import { useRole } from '../../contexts/RoleContext';
import { getStudent, getScoreTrend, getSuggestions, getAlerts, getClassStats } from '../../api';

const SUBJECT_MAP = { SUBJ_MATH: '数学', SUBJ_PORTUGUESE: '葡萄牙语', SUBJ_GENERAL: '综合' };
const SUBJECT_COLORS = { SUBJ_MATH: '#0b6565', SUBJ_PORTUGUESE: '#c9933a', SUBJ_GENERAL: '#1a8a5a' };
const SUBJECT_FULL_SCORE = { SUBJ_MATH: 20, SUBJ_PORTUGUESE: 20, SUBJ_GENERAL: 100 };
const RISK_LABELS = { low: '低风险', medium: '中风险', high: '高风险' };
const FAMILY_VALUE_MAP = {
  'Primary': '小学', 'Middle School': '初中', 'High School': '高中',
  'College': '大学', 'Postgraduate': '研究生', 'None': '无',
  'at_home': '居家', 'health': '医疗', 'other': '其他', 'services': '服务业', 'teacher': '教师',
  'High': '高', 'Medium': '中', 'Low': '低',
  'yes': '是', 'no': '否',
};

export default function StudentHome() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [scoreData, setScoreData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [alertData, setAlertData] = useState([]);
  const [classStats, setClassStats] = useState([]);
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
        const info = studentRes.data;
        setStudentInfo(info);
        setScoreData(trendRes.data?.scores || []);
        setSuggestions(suggestionsRes.data || []);
        setAlertData(Array.isArray(alertsRes.data) ? alertsRes.data : []);
        // 获取班级均值用于对比
        if (info?.student_class_id) {
          getClassStats({ class_id: info.student_class_id })
            .then((r) => setClassStats(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
            .catch(() => setClassStats([]));
        }
      })
      .catch((err) => console.error('加载学生主页数据失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  // 最新各科成绩
  const latestScores = (() => {
    if (!scoreData.length) return [];
    const map = {};
    scoreData.forEach((item) => {
      const subj = item.subject_id;
      const order = { G3: 3, G2: 2, G1: 1 };
      if (!map[subj] || (order[item.exam_stage] || 0) > (order[map[subj].exam_stage] || 0)) {
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

  // 综合得分率
  const generalScoreRate = (() => {
    const general = latestScores.find((s) => s.subjectId === 'SUBJ_GENERAL');
    return general ? parseFloat(general.scoreRate) : null;
  })();

  // 出勤率
  const attendanceRate = studentInfo?.behavior?.attendance_rate ?? null;

  // 风险等级
  const worstRisk = alertData.length > 0
    ? alertData.reduce((worst, a) => {
        const order = { high: 3, medium: 2, low: 1 };
        return order[a.risk_level] > order[worst] ? a.risk_level : worst;
      }, 'low')
    : null;

  // 班级均值映射
  const classAvgMap = (() => {
    const map = {};
    classStats.forEach((item) => {
      const subj = item.subject_id;
      if (!map[subj]) map[subj] = { totalScore: 0, totalCount: 0 };
      map[subj].totalScore += (item.avg_score || 0) * (item.student_count || 0);
      map[subj].totalCount += item.student_count || 0;
    });
    const result = {};
    Object.entries(map).forEach(([key, val]) => {
      const fullScore = SUBJECT_FULL_SCORE[key] || 100;
      const avgScore = val.totalCount ? val.totalScore / val.totalCount : 0;
      result[key] = ((avgScore / fullScore) * 100).toFixed(1);
    });
    return result;
  })();

  // 成绩趋势图数据
  const trendChartData = (() => {
    if (!scoreData.length) return [];
    const stages = ['G1', 'G2', 'G3'];
    const bySubject = {};
    scoreData.forEach((item) => {
      const subj = item.subject_id;
      if (!bySubject[subj]) bySubject[subj] = {};
      bySubject[subj][item.exam_stage] = item.score;
    });
    return stages.map((stage) => {
      const row = { exam_stage: stage };
      Object.keys(bySubject).forEach((subj) => {
        row[subj] = bySubject[subj][stage] ?? null;
      });
      return row;
    });
  })();

  // 学习行为雷达图数据
  const radarData = (() => {
    const b = studentInfo?.behavior;
    if (!b) return [];
    return [
      { dimension: '出勤率', value: Math.min(b.attendance_rate ?? 0, 100), fullMark: 100 },
      { dimension: '学习时长', value: Math.min((b.study_hours ?? 0) * 5, 100), fullMark: 100 },
      { dimension: '睡眠时长', value: Math.min((b.sleep_hours ?? 0) * 10, 100), fullMark: 100 },
      { dimension: '运动时长', value: Math.min((b.physical_activity ?? 0) * 10, 100), fullMark: 100 },
      { dimension: '辅导次数', value: Math.min((b.tutoring_sessions ?? 0) * 25, 100), fullMark: 100 },
    ];
  })();

  // 家庭背景数据
  const familyData = studentInfo?.family || null;

  // 翻译家庭字段值
  const translateFamily = (val) => {
    if (val == null) return '--';
    return FAMILY_VALUE_MAP[val] || val;
  };

  // 数字素养
  const digitalLiteracy = studentInfo?.behavior?.digital_literacy ?? null;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中...</p>
      </div>
    );
  }

  // 未选择学生
  if (!selectedStudentId) {
    return (
      <div>
        <WelcomeBanner role="student" title="同学" subtitle="查看你的成绩趋势与学习数据" />
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

  // 风险等级颜色
  const riskColor = worstRisk === 'high' ? 'var(--danger)' : worstRisk === 'medium' ? 'var(--warning)' : 'var(--success)';
  const riskBadgeClass = worstRisk ? `risk-badge risk-${worstRisk}` : '';

  // 得分率颜色判断
  const scoreColor = (rate) => {
    if (rate == null) return 'default';
    const r = parseFloat(rate);
    if (r < 60) return 'danger';
    if (r < 80) return 'warning';
    return 'success';
  };

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 欢迎横幅 */}
      <WelcomeBanner
        role="student"
        title={selectedStudentName}
        subtitle="查看你的成绩趋势与学习数据"
        stats={[
          ...(generalScoreRate != null ? [{ value: `${generalScoreRate.toFixed(1)}%`, label: '综合得分率' }] : []),
          ...(worstRisk ? [{ value: RISK_LABELS[worstRisk], label: '风险等级', color: riskColor }] : []),
          { value: suggestions.length, label: '学习建议' },
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
          <span className={riskBadgeClass} style={{ fontSize: '0.6875rem' }}>
            {RISK_LABELS[worstRisk]}
          </span>
        )}
      </div>

      {/* 核心指标卡片 */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
        <MetricCard
          icon="trend"
          label="综合得分率"
          value={generalScoreRate != null ? `${generalScoreRate.toFixed(1)}%` : '--'}
          color={scoreColor(generalScoreRate)}
        />
        <MetricCard
          icon="alert"
          label="风险等级"
          value={worstRisk ? RISK_LABELS[worstRisk] : '--'}
          color={worstRisk === 'high' ? 'danger' : worstRisk === 'medium' ? 'warning' : 'success'}
        />
        <MetricCard
          icon="brain"
          label="学习建议数"
          value={suggestions.length}
          color="default"
        />
        <MetricCard
          icon="clock"
          label="出勤率"
          value={attendanceRate != null ? `${attendanceRate}%` : '--'}
          color={attendanceRate != null ? (attendanceRate < 80 ? 'danger' : 'success') : 'default'}
        />
      </div>

      {/* 各科目得分率 */}
      {latestScores.length > 0 && (
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
          {latestScores.map((item) => (
            <MetricCard
              key={item.subjectId}
              icon="check"
              label={`${item.subjectName}得分率`}
              value={`${item.scoreRate}%`}
              color={scoreColor(item.scoreRate)}
            />
          ))}
        </div>
      )}

      {/* 两栏：成绩趋势 + 预警与建议 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 成绩趋势 mini chart */}
        <LiquidCard
          title="成绩趋势"
          action={
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/trends')}>
              详细趋势 <ArrowRight size={12} />
            </button>
          }
        >
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendChartData} margin={{ top: 4, right: 16, bottom: 4, left: -10 }}>
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
                  wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}
                />
                {Object.keys(SUBJECT_MAP).map((subj, idx) => (
                  <Line
                    key={subj}
                    type="monotone"
                    dataKey={subj}
                    name={subj}
                    stroke={SUBJECT_COLORS[subj]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: SUBJECT_COLORS[subj], stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                    strokeDasharray={idx > 0 ? '6 3' : undefined}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0' }}>
              <TrendingUp size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary">暂无成绩趋势数据</p>
            </div>
          )}
        </LiquidCard>

        {/* 预警与建议摘要 */}
        <LiquidCard
          title="预警与建议"
          action={
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/student-view/suggestions')}>
              查看全部 <ArrowRight size={12} />
            </button>
          }
        >
          {/* 预警摘要 */}
          {alertData.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <ShieldAlert size={13} style={{ color: riskColor }} />
                预警信息
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {alertData.slice(0, 2).map((alert) => {
                  const aRiskColor = alert.risk_level === 'high' ? '#c0392b' : alert.risk_level === 'medium' ? '#d4880f' : '#1a8a5a';
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
                      <div style={{ width: 3, flexShrink: 0, background: aRiskColor, borderRadius: '3px 0 0 3px' }} />
                      <div style={{ flex: 1, padding: '0.5rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: aRiskColor }}>
                            {RISK_LABELS[alert.risk_level] || alert.risk_level}
                          </span>
                          <span style={{ flex: 1 }} />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)', whiteSpace: 'nowrap' }}>
                            <Clock size={9} />
                            {alert.alert_time ? new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                          </span>
                        </div>
                        {alert.risk_factors && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {(() => {
                              try {
                                const factors = typeof alert.risk_factors === 'string' ? JSON.parse(alert.risk_factors) : alert.risk_factors;
                                const arr = Array.isArray(factors) ? factors : [String(factors)];
                                return arr.map((f, i) => (
                                  <span key={i} style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)' }}>{f}</span>
                                ));
                              } catch { return null; }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 建议摘要 */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <MessageCircle size={13} style={{ color: 'var(--primary)' }} />
              学习建议
            </div>
            {suggestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {suggestions.slice(0, 2).map((s) => (
                  <div
                    key={s.suggestion_id}
                    style={{
                      padding: '0.625rem',
                      borderRadius: '0.5rem',
                      border: '0.5px solid rgba(11,101,101,0.06)',
                      background: 'rgba(11,101,101,0.015)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)' }}>
                        <Clock size={9} />
                        {s.generate_time ? new Date(s.generate_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                      </span>
                      {s.student_feedback && (
                        <span style={{
                          fontSize: '0.625rem',
                          padding: '0.0625rem 0.375rem',
                          borderRadius: '9999px',
                          background: s.student_feedback === 'satisfied' ? 'rgba(26,138,90,0.08)' : s.student_feedback === 'unsatisfied' ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.06)',
                          color: s.student_feedback === 'satisfied' ? 'var(--success)' : s.student_feedback === 'unsatisfied' ? 'var(--danger)' : 'rgba(11,101,101,0.65)',
                        }}>
                          {s.student_feedback === 'satisfied' ? '满意' : s.student_feedback === 'unsatisfied' ? '不满意' : '一般'}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0' }}>
                <MessageCircle size={28} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.5rem' }} />
                <p className="text-tertiary" style={{ fontSize: '0.8125rem' }}>暂无学习建议</p>
              </div>
            )}
          </div>

          {/* 无预警无建议的空状态 */}
          {alertData.length === 0 && suggestions.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0' }}>
              <CheckCircle size={32} style={{ color: 'rgba(26,138,90,0.2)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary">暂无预警与建议，表现良好</p>
            </div>
          )}
        </LiquidCard>
      </div>

      {/* 学习行为分析 */}
      {studentInfo?.behavior && (
        <LiquidCard title="学习行为分析" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* 行为指标 */}
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <div className="stat-grid" style={{ marginBottom: '0.5rem' }}>
                {[
                  { icon: CalendarClock, label: '出勤率', value: `${studentInfo.behavior.attendance_rate ?? '--'}%`, color: (studentInfo.behavior.attendance_rate ?? 100) < 80 ? 'var(--danger)' : 'var(--primary)', iconBg: (studentInfo.behavior.attendance_rate ?? 100) < 80 ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.08)' },
                  { icon: BookOpen, label: '学习时长', value: `${studentInfo.behavior.study_hours ?? '--'}h`, color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                  { icon: Moon, label: '睡眠时长', value: `${studentInfo.behavior.sleep_hours ?? '--'}h`, color: (studentInfo.behavior.sleep_hours ?? 8) < 6 ? 'var(--danger)' : 'var(--primary-lighter)', iconBg: (studentInfo.behavior.sleep_hours ?? 8) < 6 ? 'rgba(192,57,43,0.08)' : 'rgba(14,143,143,0.08)' },
                  { icon: Dumbbell, label: '运动时长', value: `${studentInfo.behavior.physical_activity ?? '--'}h`, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
                  { icon: Brain, label: '辅导次数', value: `${studentInfo.behavior.tutoring_sessions ?? '--'}次`, color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                  { icon: Wifi, label: '数字素养', value: digitalLiteracy != null ? translateFamily(digitalLiteracy) : '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
                ].map((item, i) => (
                  <div key={i} className="stat-metric-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: item.iconBg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <item.icon size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.3 }}>{item.label}</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 雷达图 */}
            {radarData.length > 0 && (
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="rgba(11,101,101,0.08)" strokeWidth={0.5} />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: 'rgba(11,101,101,0.5)', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: 'rgba(11,101,101,0.3)', fontSize: 10 }}
                      axisLine={false}
                    />
                    <Radar
                      name="行为指标"
                      dataKey="value"
                      stroke="#0b6565"
                      fill="#0b6565"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </LiquidCard>
      )}

      {/* 数字素养与资源 */}
      <LiquidCard title="数字素养与资源" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-grid">
          {[
            { icon: Wifi, label: '数字素养水平', value: digitalLiteracy != null ? translateFamily(digitalLiteracy) : '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
            { icon: Home, label: '家庭支持', value: familyData ? translateFamily(familyData.home_support) : '--', color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
            { icon: BookOpen, label: '母亲教育', value: familyData ? translateFamily(familyData.mother_education) : '--', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
            { icon: BookOpen, label: '父亲教育', value: familyData ? translateFamily(familyData.father_education) : '--', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
          ].map((item, i) => (
            <div key={i} className="stat-metric-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: item.iconBg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </LiquidCard>

      {/* 家庭背景 */}
      {familyData && (
        <LiquidCard title="家庭背景" style={{ marginBottom: '1.25rem' }}>
          <div style={{ overflowX: 'auto', borderRadius: '0.625rem', border: '0.5px solid rgba(11,101,101,0.08)' }}>
            <table className="liquid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: '母亲教育水平', value: translateFamily(familyData.mother_education) },
                  { label: '父亲教育水平', value: translateFamily(familyData.father_education) },
                  { label: '母亲职业', value: translateFamily(familyData.mother_job) },
                  { label: '父亲职业', value: translateFamily(familyData.father_job) },
                  { label: '家庭支持', value: translateFamily(familyData.home_support) },
                  { label: '家庭关系质量', value: translateFamily(familyData.family_relationship) },
                  { label: '是否免费午餐', value: translateFamily(familyData.free_lunch) },
                  { label: '是否课外活动', value: translateFamily(familyData.extracurricular_activities) },
                  { label: '是否互联网接入', value: translateFamily(familyData.internet_access) },
                ].filter((row) => row.value !== '--').map((row, i) => (
                  <tr key={i}>
                    <td style={{ width: '40%', fontWeight: 500, color: 'rgba(11,101,101,0.65)', fontSize: '0.8125rem' }}>{row.label}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#2a3d3d' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LiquidCard>
      )}
    </div>
  );
}
