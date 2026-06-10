import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, AlertTriangle, CheckCircle, Trophy, BarChart3, BookOpen,
  CalendarClock, Moon, HeartPulse, ClipboardCheck, ShieldAlert, ShieldCheck,
  X, ChevronRight, GraduationCap, Flame, Dumbbell,
  School, Clock, Database
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

// 教师快捷入口配置 (与管理员的 decoration="admin" 一样的结构)
const TEACHER_SHORTCUTS = [
  { label: '学情概览', path: '/teacher/overview', icon: BarChart },
  { label: '风险预警', path: '/teacher/alert', icon: ShieldAlert },
  { label: '成绩管理', path: '/teacher/score', icon: Database },
];

export default function TeacherHome() {
  const { selectedTeacherClassId, selectedTeacherName, teacherClasses } = useRole();
  const classId = selectedTeacherClassId || '';
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [alertStats, setAlertStats] = useState(null);
  const [classStats, setClassStats] = useState([]);
  const [teacherStats, setTeacherStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rankingType, setRankingType] = useState('top5_general');
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [fullRankingData, setFullRankingData] = useState([]);

  useEffect(() => {
    if (!classId) { setLoading(false); return; }
    const params = { class_id: classId };

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

  // 获取当前班级信息
  const currentClassInfo = teacherClasses.find(c => c.class_id === classId);
  const interventionData = teacherStats?.intervention || null;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中...</p>
      </div>
    );
  }

  // 没有选班级时的空状态
  if (!classId) {
    return (
      <div className="home-page">
        <div className="home-orb home-orb--top" />
        <div className="home-orb home-orb--bottom" />
        <WelcomeBanner
          role="teacher"
          title={`${selectedTeacherName || ''}老师`}
          subtitle="班级学情数据一览"
          decoration="teacher"
        />
        <LiquidCard>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <School size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>暂未关联班级</p>
            <p className="text-placeholder" style={{ fontSize: '0.75rem' }}>请先选择一位教师以查看班级数据</p>
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

      {/* 欢迎横幅 — 使用 teacher decoration 启用快捷入口 */}
      <WelcomeBanner
        role="teacher"
        title={`${selectedTeacherName || ''}老师`}
        subtitle={`${currentClassInfo?.class_name || classId} · 学情数据一览`}
        decoration="teacher"
      />

      {/* 统计数据 */}
      <LiquidCard style={{ marginBottom: '1.25rem', overflow: 'visible' }}>
        {/* 悬浮排行榜（float 右侧） */}
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
            {currentClassInfo && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'rgba(11,101,101,0.45)', marginLeft: '0.25rem' }}>
                · {currentClassInfo.role || ''}
              </span>
            )}
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
            {/* 行为异常：出勤 < 80% 或 睡眠 < 6h */}
            {teacherStats?.behavior && (teacherStats.behavior.avg_attendance < 80 || teacherStats.behavior.avg_sleep_hours < 6) && (
              <div className="stat-metric-item" style={{ border: '0.5px solid rgba(192,57,43,0.15)', background: 'rgba(192,57,43,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(192,57,43,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--danger)', lineHeight: 1.3, fontWeight: 500 }}>
                      ⚠ 行为异常
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.4 }}>
                      {teacherStats.behavior.avg_attendance < 80 ? '出勤率偏低 ' : ''}
                      {teacherStats.behavior.avg_sleep_hours < 6 ? '睡眠不足' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  { icon: CalendarClock, label: '平均出勤率', value: teacherStats.behavior.avg_attendance + '%', color: teacherStats.behavior.avg_attendance < 80 ? 'var(--danger)' : 'var(--primary)', iconBg: teacherStats.behavior.avg_attendance < 80 ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.08)' },
                  { icon: BookOpen, label: '平均学习时长', value: teacherStats.behavior.avg_study_hours + 'h', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                  { icon: Moon, label: '平均睡眠时长', value: teacherStats.behavior.avg_sleep_hours + 'h', color: teacherStats.behavior.avg_sleep_hours < 6 ? 'var(--danger)' : 'var(--primary-lighter)', iconBg: teacherStats.behavior.avg_sleep_hours < 6 ? 'rgba(192,57,43,0.08)' : 'rgba(14,143,143,0.08)' },
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
          {interventionData && (
            <div className="stat-grid">
              {[
                { icon: ClipboardCheck, label: '已干预', value: interventionData.completed, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
                { icon: HeartPulse, label: '进行中', value: interventionData.in_progress || 0, color: 'var(--warning)', iconBg: 'rgba(212,136,15,0.08)' },
                { icon: Clock, label: '待干预', value: interventionData.pending, color: 'var(--danger)', iconBg: 'rgba(192,57,43,0.08)' },
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

      {/* 图表区域：2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <LiquidCard title="成绩趋势">
          {scoreTrendData.length > 0 ? (
            <div style={{ width: '100%', height: 240, position: 'relative' }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={scoreTrendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    {['综合', '数学', '葡萄牙语'].map((name, i) => {
                      const colors = ['#1a8a5a', '#0b6565', '#c9933a'];
                      return <linearGradient key={name} id={`grad${name}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors[i]} stopOpacity={0.3} /><stop offset="100%" stopColor={colors[i]} stopOpacity={0.02} /></linearGradient>;
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(11,101,101,0.4)' }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(11,101,101,0.4)' }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                  <Tooltip contentStyle={{ zIndex: 9999 }} />
                  <Area type="monotone" dataKey="综合" stroke="#1a8a5a" strokeWidth={2} fill="url(#grad综合)" dot={{ r: 3, fill: '#1a8a5a' }} />
                  <Area type="monotone" dataKey="数学" stroke="#0b6565" strokeWidth={2} fill="url(#grad数学)" dot={{ r: 3, fill: '#0b6565' }} />
                  <Area type="monotone" dataKey="葡萄牙语" stroke="#c9933a" strokeWidth={2} fill="url(#grad葡萄牙语)" dot={{ r: 3, fill: '#c9933a' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>暂无数据</div>
          )}
        </LiquidCard>

        <LiquidCard title="出勤率分布">
          {teacherStats?.behavior ? (
            <div style={{ width: '100%', height: 240, position: 'relative' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { name: '高 (≥90%)', value: Math.round((overview?.total_students || 1) * 0.6), color: '#1a8a5a' },
                  { name: '中 (80%)', value: Math.round((overview?.total_students || 1) * 0.25), color: '#0b6565' },
                  { name: '中低 (70%)', value: Math.round((overview?.total_students || 1) * 0.1), color: '#c9933a' },
                  { name: '低 (<60%)', value: Math.round((overview?.total_students || 1) * 0.05), color: '#c0392b' },
                ]} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(11,101,101,0.4)' }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(11,101,101,0.4)' }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} />
                  <Tooltip contentStyle={{ zIndex: 9999 }} />
                  <Bar dataKey="value" name="人数" radius={[4, 4, 0, 0]}>{[
                    { color: '#1a8a5a' }, { color: '#0b6565' }, { color: '#c9933a' }, { color: '#c0392b' },
                  ].map((entry, idx) => <Cell key={idx} fill={entry.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>暂无数据</div>
          )}
        </LiquidCard>

        <LiquidCard title="学习动力">
          {motivationData.length > 0 && totalMotivation > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={motivationData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2} dataKey="value" stroke="none">
                      {motivationData.map((entry) => (<Cell key={entry.key} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ zIndex: 9999 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#095050', lineHeight: 1.2 }}>{totalMotivation}</span>
                  <span style={{ fontSize: '0.5625rem', color: 'rgba(11,101,101,0.45)' }}>总人数</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', width: '100%' }}>
                {motivationData.map((entry) => (
                  <div key={entry.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />{entry.name}</span>
                    <span style={{ fontWeight: 600, color: entry.color }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>暂无数据</div>
          )}
        </LiquidCard>

        <LiquidCard title="风险分布">
          {riskData.length > 0 && totalRisk > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2} dataKey="value" stroke="none">
                      {riskData.map((entry) => (<Cell key={entry.key} fill={RISK_COLORS[entry.key]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ zIndex: 9999 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#095050', lineHeight: 1.2 }}>{totalRisk}</span>
                  <span style={{ fontSize: '0.5625rem', color: 'rgba(11,101,101,0.45)' }}>预警数</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', width: '100%' }}>
                {riskData.map((entry) => (
                  <div key={entry.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLORS[entry.key], flexShrink: 0 }} />{entry.name}</span>
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
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: i === 0 ? 'rgba(201,147,58,0.06)' : 'transparent' }}>
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
