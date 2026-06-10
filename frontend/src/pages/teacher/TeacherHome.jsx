import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, TrendingUp, AlertTriangle, CheckCircle, Trophy, BarChart3, BookOpen,
  CalendarClock, Moon, HeartPulse, ClipboardCheck, ShieldAlert, ShieldCheck,
  X, Loader2, ChevronRight, GraduationCap, Flame, Dumbbell
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import WelcomeBanner from '../../components/WelcomeBanner';
import LiquidCard from '../../components/LiquidCard';
import LiquidSelect from '../../components/LiquidSelect';
import { useRole } from '../../contexts/RoleContext';
import { getOverview, getAlertStats, getClassStats, getTeacherStats } from '../../api';

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

const SUBJECT_COLORS = {
  SUBJ_GENERAL: '#1a8a5a',
  SUBJ_MATH: '#0b6565',
  SUBJ_PORTUGUESE: '#c9933a',
};

const RISK_COLORS = { high: '#c0392b', medium: '#d4880f', low: '#1a8a5a' };

const RANKING_OPTIONS = [
  { value: 'top5_general', label: '综合成绩排名', icon: Trophy, accentColor: 'var(--success)', scoreUnit: '分' },
  { value: 'top5_math', label: '数学成绩排名', icon: BarChart3, accentColor: 'var(--primary)', scoreUnit: '分' },
  { value: 'top5_portuguese', label: '葡萄牙语排名', icon: BookOpen, accentColor: 'var(--accent)', scoreUnit: '分' },
  { value: 'top5_attendance', label: '出勤率排名', icon: CalendarClock, accentColor: 'var(--primary)', scoreUnit: '%' },
  { value: 'top5_study_hours', label: '学习时长排名', icon: BookOpen, accentColor: 'var(--accent-light)', scoreUnit: 'h' },
  { value: 'top5_improvement', label: '成绩进步排名', icon: TrendingUp, accentColor: 'var(--success)', scoreUnit: '分' },
];

// 图表 Tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '0.5px solid rgba(11,101,101,0.1)', borderRadius: '0.625rem',
      boxShadow: '0 2px 8px rgba(11,101,101,0.08), 0 4px 16px rgba(11,101,101,0.04)',
      padding: '0.5rem 0.75rem', fontSize: '0.8125rem', lineHeight: 1.5,
    }}>
      <div style={{ fontWeight: 600, color: '#095050', marginBottom: 2 }}>{label}</div>
      {payload.map((item, i) => (
        <div key={i} style={{ color: item.color, fontWeight: 500 }}>{item.name}: {item.value}</div>
      ))}
    </div>
  );
}

export default function TeacherHome() {
  const { selectedTeacherClassId, selectedTeacherName } = useRole();
  const classId = selectedTeacherClassId || '';

  const [overview, setOverview] = useState(null);
  const [alertStats, setAlertStats] = useState(null);
  const [classStats, setClassStats] = useState([]);
  const [teacherStats, setTeacherStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rankingType, setRankingType] = useState('top5_general');
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [fullRankingData, setFullRankingData] = useState([]);

  useEffect(() => {
    const params = classId ? { class_id: classId } : {};
    const p1 = getOverview(params).then((res) => setOverview(res.data)).catch((e) => console.error(e));
    const p2 = getAlertStats(params).then((res) => setAlertStats(res.data)).catch((e) => console.error(e));
    const p3 = getClassStats(params).then((res) => setClassStats(res.data?.data || (Array.isArray(res.data) ? res.data : []))).catch((e) => console.error(e));
    const p4 = getTeacherStats(params).then((res) => setTeacherStats(res.data)).catch((e) => console.error(e));
    Promise.allSettled([p1, p2, p3, p4]).finally(() => setLoading(false));
  }, [classId]);

  // 及格率
  const passRate = (() => {
    if (!classStats.length) return '--';
    let totalPass = 0, totalStudents = 0;
    classStats.forEach((item) => {
      const count = item.student_count || 0;
      const rate = (item.pass_rate || 0) / 100;
      totalPass += count * rate;
      totalStudents += count;
    });
    if (totalStudents === 0) return '--';
    return ((totalPass / totalStudents) * 100).toFixed(1) + '%';
  })();

  // 各科得分率
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
      { name: '高风险', value: stats.high || 0, key: 'high' },
      { name: '中风险', value: stats.medium || 0, key: 'medium' },
      { name: '低风险', value: stats.low || 0, key: 'low' },
    ];
  })();
  const totalRisk = riskData.reduce((s, d) => s + d.value, 0);

  // 成绩趋势数据
  const scoreTrendData = (() => {
    if (!teacherStats?.score_trend) return [];
    const map = {};
    teacherStats.score_trend.forEach((item) => {
      if (!map[item.exam_stage]) map[item.exam_stage] = { name: item.exam_stage };
      map[item.exam_stage][SUBJECT_MAP[item.subject_id] || item.subject_id] = item.avg_score;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // 学习动力分布
  const motivationData = (() => {
    if (!teacherStats?.motivation) return [];
    return [
      { name: '高动力', value: teacherStats.motivation.high || 0, key: 'high', color: '#1a8a5a' },
      { name: '中动力', value: teacherStats.motivation.medium || 0, key: 'medium', color: '#d4880f' },
      { name: '低动力', value: teacherStats.motivation.low || 0, key: 'low', color: '#c0392b' },
    ];
  })();
  const totalMotivation = motivationData.reduce((s, d) => s + d.value, 0);

  // 排行榜
  const currentRankingOpt = RANKING_OPTIONS.find(o => o.value === rankingType) || RANKING_OPTIONS[0];
  const rankingData = teacherStats?.[rankingType] || [];
  const rankingPreview = rankingData.slice(0, 5);
  const medalColors = ['var(--accent)', 'rgba(11,101,101,0.5)', 'rgba(11,101,101,0.3)'];

  const handleRankingTypeChange = (type) => {
    setRankingType(type);
    setShowFullRanking(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 欢迎横幅 */}
      <WelcomeBanner
        role="teacher"
        title={`${selectedTeacherName || ''}老师`}
        subtitle="班级学情数据一览"
        stats={[
          { value: overview?.total_students ?? '--', label: '学生总数' },
          { value: overview?.high_risk_count ?? '--', label: '高风险', color: 'var(--danger)' },
          { value: passRate, label: '及格率', color: 'var(--success)' },
        ]}
      />

      {/* 统计数据 — 与管理员主页结构一致 */}
      <LiquidCard style={{ marginBottom: '1.25rem', overflow: 'visible' }}>
        {/* 悬浮排行榜 */}
        <div className="ranking-float-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Trophy size={13} style={{ color: 'var(--primary)' }} />
              排行榜
            </div>
            <LiquidSelect
              value={rankingType}
              onChange={handleRankingTypeChange}
              options={RANKING_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              style={{ width: 'auto' }}
              triggerStyle={{ minWidth: 'unset', padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
            />
          </div>
          <div className="liquid-scroll ranking-float-content" style={{ overflowY: 'auto', paddingRight: '0.25rem' }}>
            {rankingPreview.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {rankingPreview.map((stu, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3125rem 0.5rem', borderRadius: '0.375rem', background: i === 0 ? 'rgba(201,147,58,0.06)' : 'transparent', transition: 'background 0.2s' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stu.student_name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--primary)', minWidth: 36, textAlign: 'right' }}>{stu.score}{currentRankingOpt.scoreUnit || ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.4)', textAlign: 'center', padding: '0.75rem 0' }}>暂无数据</div>
            )}
          </div>
          <button className="ranking-view-all-btn" onClick={() => { setFullRankingData(rankingData); setShowFullRanking(true); }}>
            查看全部排名 <ChevronRight size={12} />
          </button>
        </div>

        <h2 style={{ margin: 0, marginBottom: '0.875rem' }}>统计数据</h2>

        <div>
          {/* 板块1: 基础概况 */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
            基础概况
          </div>
          <div className="stat-grid" style={{ marginBottom: '1rem' }}>
            {[
              { icon: Users, label: '学生总数', value: overview?.total_students ?? '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
              { icon: GraduationCap, label: '男女比例', value: teacherStats?.gender ? `${teacherStats.gender.male}:${teacherStats.gender.female}` : '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
              { icon: AlertTriangle, label: '高风险学生', value: overview?.high_risk_count ?? '--', color: 'var(--danger)', iconBg: 'rgba(192,57,43,0.08)' },
              { icon: CheckCircle, label: '及格率', value: passRate, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
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

          {/* 板块2: 成绩指标 */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
            成绩指标
          </div>
          <div className="stat-grid" style={{ marginBottom: '0.75rem' }}>
            {[
              { icon: TrendingUp, label: '平均得分率', value: overview?.average_score_rate != null ? Number(overview.average_score_rate).toFixed(1) + '%' : '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
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
          {/* 各科得分率 */}
          {subjectScoreRateData.length > 0 && (
            <div className="stat-grid" style={{ marginBottom: '1rem' }}>
              {subjectScoreRateData.map((item) => {
                const barColor = SUBJECT_COLORS[item.subjectId] || 'var(--primary)';
                return (
                  <div key={item.subjectId} className="stat-fill-card"
                    onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = `${item.scoreRate}%`; }}
                    onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = '0'; }}
                  >
                    <div className="stat-fill-bar" style={{ background: barColor }} />
                    <div className="stat-fill-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500 }}>{item.subject}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: barColor }}>{item.scoreRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 板块3: 学习行为 */}
          {teacherStats?.behavior && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
                学习行为
              </div>
              <div className="stat-grid" style={{ marginBottom: '1rem' }}>
                {[
                  { icon: CalendarClock, label: '平均出勤率', value: teacherStats.behavior.avg_attendance + '%', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
                  { icon: BookOpen, label: '平均学习时长', value: teacherStats.behavior.avg_study_hours + 'h', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                  { icon: Moon, label: '平均睡眠时长', value: teacherStats.behavior.avg_sleep_hours + 'h', color: 'var(--primary-lighter)', iconBg: 'rgba(14,143,143,0.08)' },
                  { icon: Flame, label: '平均辅导次数', value: teacherStats.behavior.avg_tutoring + '次', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                  { icon: Dumbbell, label: '平均运动时长', value: teacherStats.behavior.avg_physical + 'h', color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
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
            </>
          )}

          {/* 板块4: 风险预警 */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
            风险预警
          </div>
          <div className="stat-grid" style={{ marginBottom: '0.75rem' }}>
            {riskData.map((item) => {
              const total = overview?.total_students || 1;
              const pct = ((item.value / total) * 100).toFixed(1);
              const iconMap = { high: ShieldAlert, medium: AlertTriangle, low: ShieldCheck };
              const Icon = iconMap[item.key];
              return (
                <div key={item.key} className="stat-fill-card"
                  onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = `${Math.min(parseFloat(pct), 100)}%`; }}
                  onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = '0'; }}
                >
                  <div className="stat-fill-bar" style={{ background: RISK_COLORS[item.key] }} />
                  <div className="stat-fill-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Icon size={13} style={{ color: RISK_COLORS[item.key] }} />
                        <span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500 }}>{item.name}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: RISK_COLORS[item.key] }}>{item.value}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.4)' }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* 干预进度 */}
          {teacherStats?.intervention && (
            <div className="stat-grid">
              {[
                { icon: ClipboardCheck, label: '已干预', value: teacherStats.intervention.completed, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
                { icon: HeartPulse, label: '待干预', value: teacherStats.intervention.pending, color: 'var(--danger)', iconBg: 'rgba(192,57,43,0.08)' },
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
          )}
        </div>
      </LiquidCard>

      {/* 图表区域：成绩趋势 + 学习动力 + 风险分布 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* 成绩趋势 */}
        <LiquidCard title="成绩趋势">
          {scoreTrendData.length > 0 ? (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={scoreTrendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradGeneral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a8a5a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1a8a5a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradMath" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b6565" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0b6565" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradPortuguese" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9933a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#c9933a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(11,101,101,0.4)' }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(11,101,101,0.4)' }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="综合" stroke="#1a8a5a" strokeWidth={2} fill="url(#gradGeneral)" dot={{ r: 3, fill: '#1a8a5a' }} />
                  <Area type="monotone" dataKey="数学" stroke="#0b6565" strokeWidth={2} fill="url(#gradMath)" dot={{ r: 3, fill: '#0b6565' }} />
                  <Area type="monotone" dataKey="葡萄牙语" stroke="#c9933a" strokeWidth={2} fill="url(#gradPortuguese)" dot={{ r: 3, fill: '#c9933a' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>暂无数据</div>
          )}
        </LiquidCard>

        {/* 学习动力 + 风险分布 */}
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          {/* 学习动力分布 */}
          <LiquidCard title="学习动力" style={{ flex: 1 }}>
            {motivationData.length > 0 && totalMotivation > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 140, height: 140 }}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={motivationData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                        {motivationData.map((entry) => (<Cell key={entry.key} fill={entry.color} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#095050', lineHeight: 1.2 }}>{totalMotivation}</span>
                    <span style={{ fontSize: '0.5rem', color: 'rgba(11,101,101,0.45)' }}>总人数</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', width: '100%' }}>
                  {motivationData.map((entry) => (
                    <div key={entry.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                        {entry.name}
                      </span>
                      <span style={{ fontWeight: 600, color: entry.color }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>暂无数据</div>
            )}
          </LiquidCard>

          {/* 风险分布 */}
          <LiquidCard title="风险分布" style={{ flex: 1 }}>
            {riskData.length > 0 && totalRisk > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 140, height: 140 }}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={riskData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                        {riskData.map((entry) => (<Cell key={entry.key} fill={RISK_COLORS[entry.key]} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#095050', lineHeight: 1.2 }}>{totalRisk}</span>
                    <span style={{ fontSize: '0.5rem', color: 'rgba(11,101,101,0.45)' }}>预警数</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', width: '100%' }}>
                  {riskData.map((entry) => (
                    <div key={entry.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLORS[entry.key], flexShrink: 0 }} />
                        {entry.name}
                      </span>
                      <span style={{ fontWeight: 600, color: RISK_COLORS[entry.key] }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>暂无数据</div>
            )}
          </LiquidCard>
        </div>
      </div>

      {/* 全量排行模态框 */}
      {showFullRanking && createPortal(
        <div className="ranking-modal-overlay" onClick={() => setShowFullRanking(false)}>
          <div className="ranking-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={16} style={{ color: 'var(--accent)' }} />
                <h2 style={{ margin: 0, fontSize: '1rem' }}>{currentRankingOpt.label} - 全部排名</h2>
              </div>
              <button className="liquid-btn liquid-btn-sm" onClick={() => setShowFullRanking(false)} style={{ padding: '0.25rem', minWidth: 28, minHeight: 28 }}>
                <X size={14} />
              </button>
            </div>
            <div className="liquid-scroll" style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 80px)', paddingRight: '0.25rem' }}>
              {fullRankingData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {fullRankingData.map((stu, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: i === 0 ? 'rgba(201,147,58,0.06)' : 'transparent', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = 'rgba(11,101,101,0.03)'; }}
                      onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '0.8125rem', color: '#1a2b2b', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stu.student_name}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.4)' }}>{stu.class_name}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : currentRankingOpt.accentColor, minWidth: 40, textAlign: 'right' }}>{stu.score}{currentRankingOpt.scoreUnit || ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.4)', textAlign: 'center', padding: '1rem 0' }}>暂无数据</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
