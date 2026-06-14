import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine,
} from 'recharts';
import {
  User, Clock, MessageCircle, TrendingUp, ArrowRight, CheckCircle2,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import WelcomeBanner from '../../components/WelcomeBanner';
import LiquidCard from '../../components/LiquidCard';
import MetricCard from '../../components/MetricCard';
import ChartTooltip from '../../components/ChartTooltip';
import { useRole } from '../../contexts/RoleContext';
import { getParentSummary, getScoreTrend, getAlerts, getSuggestions, getClassStats } from '../../api';

const SUBJECT_MAP = { SUBJ_MATH: '数学', SUBJ_PORTUGUESE: '葡萄牙语', SUBJ_GENERAL: '综合' };
const SUBJECT_COLORS = { SUBJ_MATH: '#0b6565', SUBJ_PORTUGUESE: '#c9933a', SUBJ_GENERAL: '#1a8a5a' };
const SUBJECT_FULL_SCORE = { SUBJ_MATH: 20, SUBJ_PORTUGUESE: 20, SUBJ_GENERAL: 100 };
const RISK_LABELS = { low: '低风险', medium: '中风险', high: '高风险' };
const FAMILY_VALUE_MAP = {
  'Primary': '小学', 'Middle School': '初中', 'High School': '高中',
  'College': '大学', 'Postgraduate': '研究生', 'None': '无',
  '小学': '小学', '初中': '初中', '高中': '高中', '大学': '大学', '研究生': '研究生',
  'at_home': '居家', 'health': '医疗', 'other': '其他', 'services': '服务业', 'teacher': '教师',
  'High': '高', 'Medium': '中', 'Low': '低',
  '高': '高', '中': '中', '低': '低',
  'yes': '是', 'no': '否',
};

// 得分率颜色判断
const scoreColor = (rate) => {
  if (rate == null) return 'default';
  const r = parseFloat(rate);
  if (r < 60) return 'danger';
  if (r < 80) return 'warning';
  return 'success';
};

// 班级对比文字
const classCompareText = (studentRate, classAvgRate) => {
  if (classAvgRate == null) return null;
  const diff = (studentRate - parseFloat(classAvgRate)).toFixed(1);
  if (diff > 0) return <span style={{ color: 'var(--success)' }}>↑ {diff}% 高于班级</span>;
  if (diff < 0) return <span style={{ color: 'var(--danger)' }}>↓ {Math.abs(diff)}% 低于班级</span>;
  return <span style={{ color: 'rgba(11,101,101,0.5)' }}>与班级持平</span>;
};

export default function ParentHome() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [scoreData, setScoreData] = useState([]);
  const [alertData, setAlertData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    Promise.allSettled([
      getParentSummary(selectedStudentId),
      getScoreTrend(selectedStudentId),
      getAlerts({ student_id: selectedStudentId }),
      getSuggestions(selectedStudentId),
    ]).then(([summaryRes, trendRes, alertsRes, suggestionsRes]) => {
      const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null;
      setSummary(summaryData);

      const scores = trendRes.status === 'fulfilled' ? (trendRes.value.data?.scores || []) : [];
      setScoreData(scores);

      const alerts = alertsRes.status === 'fulfilled'
        ? (Array.isArray(alertsRes.value.data) ? alertsRes.value.data : []) : [];
      setAlertData(alerts);

      const sugs = suggestionsRes.status === 'fulfilled' ? (suggestionsRes.value.data || []) : [];
      setSuggestions(sugs);

      // 获取班级均值
      const classId = summaryData?.student?.student_class_id;
      if (classId) {
        getClassStats({ class_id: classId })
          .then((r) => setClassStats(r.data?.data || (Array.isArray(r.data) ? r.data : [])))
          .catch(() => setClassStats([]));
      }
    }).catch((err) => console.error('加载家长主页数据失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  // 学生信息
  const studentInfo = summary?.student || null;
  const behavior = summary?.behavior || studentInfo?.behavior || null;
  const familyData = summary?.family || studentInfo?.family || null;

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
    }));
  })();

  // 综合得分率
  const generalScoreRate = (() => {
    const general = latestScores.find((s) => s.subjectId === 'SUBJ_GENERAL');
    return general ? parseFloat(general.scoreRate) : null;
  })();

  // 出勤率
  const attendanceRate = behavior?.attendance_rate ?? null;

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

  // 班级出勤率均值
  const classAttendanceAvg = summary?.class_comparison?.class_avg_attendance ?? null;

  // 成绩趋势图数据（转换为得分率百分比）
  const trendChartData = (() => {
    if (!scoreData.length) return [];
    const stages = ['G1', 'G2', 'G3'];
    const bySubject = {};
    scoreData.forEach((item) => {
      const subj = item.subject_id;
      if (!bySubject[subj]) bySubject[subj] = {};
      const fullScore = SUBJECT_FULL_SCORE[subj] || 100;
      bySubject[subj][item.exam_stage] = ((item.score / fullScore) * 100).toFixed(1);
    });
    return stages.map((stage) => {
      const row = { exam_stage: stage };
      Object.keys(bySubject).forEach((subj) => {
        row[subj] = bySubject[subj][stage] != null ? parseFloat(bySubject[subj][stage]) : null;
      });
      return row;
    });
  })();

  // 学习行为雷达图数据
  const radarData = (() => {
    if (!behavior) return [];
    return [
      { dimension: '出勤率', value: Math.min(behavior.attendance_rate ?? 0, 100), fullMark: 100 },
      { dimension: '学习时长', value: Math.min((behavior.study_hours ?? 0) * 5, 100), fullMark: 100 },
      { dimension: '睡眠', value: Math.min((behavior.sleep_hours ?? 0) * 10, 100), fullMark: 100 },
      { dimension: '运动', value: Math.min((behavior.physical_activity ?? 0) * 10, 100), fullMark: 100 },
      { dimension: '辅导', value: Math.min((behavior.tutoring_sessions ?? 0) * 25, 100), fullMark: 100 },
    ];
  })();

  // 班级均值雷达数据
  const classRadarData = (() => {
    const cr = summary?.class_comparison?.behavior_radar;
    if (!cr) return [];
    return [
      { dimension: '出勤率', value: Math.min(cr.attendance ?? 0, 100), fullMark: 100 },
      { dimension: '学习时长', value: Math.min(cr.study ?? 0, 100), fullMark: 100 },
      { dimension: '睡眠', value: Math.min(cr.sleep ?? 0, 100), fullMark: 100 },
      { dimension: '运动', value: Math.min(cr.sport ?? 0, 100), fullMark: 100 },
      { dimension: '辅导', value: Math.min(cr.tutoring ?? 0, 100), fullMark: 100 },
    ];
  })();

  // 合并雷达图数据（学生 + 班级均值）
  const mergedRadarData = radarData.map((item) => {
    const classItem = classRadarData.find((c) => c.dimension === item.dimension);
    return { ...item, classValue: classItem?.value ?? 0 };
  });

  // 家长行动建议
  const parentActions = summary?.parent_actions || [];

  // 建议反馈统计
  const feedbackStats = (() => {
    const total = suggestions.length;
    const feedbacked = suggestions.filter((s) => s.student_feedback).length;
    const notFeedbacked = total - feedbacked;
    return { total, feedbacked, notFeedbacked };
  })();

  // 翻译家庭字段值
  const translateFamily = (val) => {
    if (val == null) return '--';
    return FAMILY_VALUE_MAP[val] || val;
  };

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
        <WelcomeBanner
          role="parent"
          title="家长"
          subtitle="关注孩子的学业表现与成长"
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
        subtitle="关注孩子的学业表现与成长"
        stats={[
          { value: generalScoreRate != null ? `${generalScoreRate.toFixed(1)}%` : '--', label: '综合得分率' },
          ...(worstRisk ? [{
            value: RISK_LABELS[worstRisk],
            label: '风险等级',
            color: worstRisk === 'high' ? 'var(--danger)' : worstRisk === 'medium' ? 'var(--warning)' : 'var(--success)',
          }] : []),
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
          sub={generalScoreRate != null ? classCompareText(generalScoreRate, classAvgMap.SUBJ_GENERAL) : null}
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
          value={feedbackStats.total}
          color="default"
          sub={feedbackStats.total > 0 ? `已反馈 ${feedbackStats.feedbacked} / 未反馈 ${feedbackStats.notFeedbacked}` : null}
        />
        <MetricCard
          icon="clock"
          label="出勤率"
          value={attendanceRate != null ? `${attendanceRate}%` : '--'}
          color={attendanceRate != null ? (attendanceRate < 80 ? 'danger' : 'success') : 'default'}
          sub={attendanceRate != null && classAttendanceAvg != null
            ? (() => {
                const diff = (attendanceRate - parseFloat(classAttendanceAvg)).toFixed(1);
                if (diff > 0) return <span style={{ color: 'var(--success)' }}>↑ {diff}% 高于班级</span>;
                if (diff < 0) return <span style={{ color: 'var(--danger)' }}>↓ {Math.abs(diff)}% 低于班级</span>;
                return <span style={{ color: 'rgba(11,101,101,0.5)' }}>与班级持平</span>;
              })()
            : null}
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
              sub={classCompareText(parseFloat(item.scoreRate), classAvgMap[item.subjectId])}
            />
          ))}
        </div>
      )}

      {/* 成绩趋势 + 学习行为雷达 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 成绩趋势 */}
        <LiquidCard
          title="成绩趋势"
          action={
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/parent-view/scores')}>
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
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  formatter={(value) => SUBJECT_MAP[value] || value}
                  wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}
                />
                {Object.keys(SUBJECT_MAP).map((subj) => (
                  <Line
                    key={subj}
                    type="monotone"
                    dataKey={subj}
                    name={subj}
                    stroke={SUBJECT_COLORS[subj]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: SUBJECT_COLORS[subj], stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
                {/* 班级均值参考线 */}
                {Object.keys(SUBJECT_MAP).map((subj) => {
                  const avg = classAvgMap[subj];
                  if (avg == null) return null;
                  return (
                    <ReferenceLine
                      key={`ref-${subj}`}
                      y={parseFloat(avg)}
                      stroke={SUBJECT_COLORS[subj]}
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      strokeOpacity={0.4}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0' }}>
              <TrendingUp size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary">暂无成绩趋势数据</p>
            </div>
          )}
        </LiquidCard>

        {/* 学习行为雷达 */}
        <LiquidCard title="学习行为">
          {mergedRadarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={mergedRadarData} cx="50%" cy="50%" outerRadius="65%">
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
                  name="我的孩子"
                  dataKey="value"
                  stroke="#0b6565"
                  fill="#0b6565"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
                <Radar
                  name="班级均值"
                  dataKey="classValue"
                  stroke="#c9933a"
                  fill="#c9933a"
                  fillOpacity={0.06}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}
                />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0' }}>
              <AlertTriangle size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
              <p className="text-tertiary">暂无行为数据</p>
            </div>
          )}
        </LiquidCard>
      </div>

      {/* 最近预警 + 最近建议 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
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
              {alertData.slice(0, 2).map((alert) => {
                const riskColor = alert.risk_level === 'high' ? '#c0392b' : alert.risk_level === 'medium' ? '#d4880f' : '#1a8a5a';
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
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: riskColor }}>
                          {RISK_LABELS[alert.risk_level] || alert.risk_level}
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
                            } catch { return null; }
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
              <p className="text-tertiary">孩子暂无预警记录</p>
            </div>
          )}
        </LiquidCard>

        {/* 最近建议 */}
        <LiquidCard
          title="最近建议"
          action={
            <button className="liquid-btn liquid-btn-sm" onClick={() => navigate('/parent-view/suggestions')}>
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
      </div>

      {/* 家长行动建议 */}
      <LiquidCard title="家长行动建议" style={{ marginBottom: '1.25rem' }}>
        {parentActions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {parentActions.map((action, i) => {
              const priorityColor = action.priority === 'high' ? '#c0392b' : '#d4880f';
              const priorityLabel = action.priority === 'high' ? '高' : '中';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '0.5px solid rgba(11,101,101,0.06)',
                    background: 'rgba(11,101,101,0.015)',
                  }}
                >
                  <span style={{
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    background: `${priorityColor}14`,
                    color: priorityColor,
                    border: `0.5px solid ${priorityColor}30`,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    lineHeight: 1.6,
                  }}>
                    {priorityLabel}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {action.factor && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                        {action.factor}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.6 }}>
                      {action.action}
                    </div>
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
            <p className="text-tertiary">孩子表现良好，暂无特别建议</p>
          </div>
        )}
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
                  { label: '母亲职业', value: translateFamily(familyData.mother_occupation) },
                  { label: '父亲职业', value: translateFamily(familyData.father_occupation) },
                  { label: '家庭收入水平', value: translateFamily(familyData.family_income_level) },
                  { label: '家庭支持程度', value: translateFamily(familyData.family_support_level) },
                  { label: '家长参与度', value: translateFamily(familyData.parent_involvement_level) },
                  { label: '家庭关系', value: translateFamily(familyData.family_relationship) },
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
