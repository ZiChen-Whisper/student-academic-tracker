import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, TrendingUp, AlertTriangle, CheckCircle, Trophy, BarChart3, BookOpen,
  CalendarClock, Moon, HeartPulse, ClipboardCheck, ShieldAlert, ShieldCheck,
  X, ChevronRight, GraduationCap, Dumbbell, School, Clock, Flame, RefreshCw,
  Plus, Pencil, Trash2, User
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import WelcomeBanner from '../../components/WelcomeBanner';
import LiquidCard from '../../components/LiquidCard';
import LiquidSelect from '../../components/LiquidSelect';
import ChartTooltip from '../../components/ChartTooltip';
import ChartFilterBtn from '../../components/ChartFilterBtn';
import { useRole } from '../../contexts/RoleContext';
import { getOverview, getAlertStats, getClassStats, getTeacherStats, getChangeHistory, getScoreDistribution } from '../../api';

const SUBJECT_FULL_SCORE = { SUBJ_MATH: 20, SUBJ_PORTUGUESE: 20, SUBJ_GENERAL: 100 };
const SUBJECT_MAP = { SUBJ_GENERAL: '综合', SUBJ_MATH: '数学', SUBJ_PORTUGUESE: '葡萄牙语' };
const SUBJECT_COLORS = { SUBJ_GENERAL: '#1a8a5a', SUBJ_MATH: '#0b6565', SUBJ_PORTUGUESE: '#c9933a' };
const RISK_COLORS = { high: '#c0392b', medium: '#d4880f', low: '#1a8a5a' };

const RANKING_OPTIONS = [
  { value: 'top5_general', label: '综合成绩排名', icon: Trophy, accentColor: 'var(--success)', scoreUnit: '分' },
  { value: 'top5_math', label: '数学成绩排名', icon: BarChart3, accentColor: 'var(--primary)', scoreUnit: '分' },
  { value: 'top5_portuguese', label: '葡萄牙语排名', icon: BookOpen, accentColor: 'var(--accent)', scoreUnit: '分' },
  { value: 'top5_attendance', label: '出勤率排名', icon: CalendarClock, accentColor: 'var(--primary)', scoreUnit: '%' },
  { value: 'top5_study_hours', label: '学习时长排名', icon: BookOpen, accentColor: 'var(--accent-light)', scoreUnit: 'h' },
  { value: 'top5_improvement', label: '成绩进步排名', icon: TrendingUp, accentColor: 'var(--success)', scoreUnit: '分' },
];

const OPERATOR_SUFFIX = {
  system: '',
  admin: '管理员',
  teacher: '老师',
  student: '同学',
  parent: '家长',
};

function formatTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatOperator(item) {
  const role = item.operator_role || 'system';
  const name = item.operator_name || '未知';
  const id = item.operator_id;
  if (role === 'system') return '未知';
  const suffix = OPERATOR_SUFFIX[role] || '';
  const idPart = id ? `(${id})` : '';
  return `${name}${suffix}${idPart}`;
}

export default function TeacherHome() {
  const { selectedTeacherClassId, selectedTeacherName, teacherClasses } = useRole();
  const classId = selectedTeacherClassId || '';
  const refreshTimerRef = useRef(null);

  const [overview, setOverview] = useState(null);
  const [alertStats, setAlertStats] = useState(null);
  const [classStats, setClassStats] = useState([]);
  const [teacherStats, setTeacherStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [changeHistory, setChangeHistory] = useState([]);

  const [rankingType, setRankingType] = useState('top5_general');
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [fullRankingData, setFullRankingData] = useState([]);

  // 成绩分布相关状态
  const [distribution, setDistribution] = useState([]);
  const [distSubject, setDistSubject] = useState('SUBJ_GENERAL');

  const fetchData = (silent = false) => {
    if (!classId) { setLoading(false); return; }
    if (!silent) setLoading(true);
    const params = { class_id: classId };
    const p1 = getOverview(params).then(r => setOverview(r.data)).catch(e => console.error('overview:', e));
    const p2 = getAlertStats(params).then(r => setAlertStats(r.data)).catch(e => console.error('alertStats:', e));
    const p3 = getClassStats(params).then(r => setClassStats(r.data?.data || (Array.isArray(r.data) ? r.data : []))).catch(e => console.error('classStats:', e));
    const p4 = getTeacherStats(params).then(r => setTeacherStats(r.data)).catch(e => console.error('teacherStats:', e));
    const p5 = getChangeHistory({ limit: 5, class_id: classId }).then(r => setChangeHistory(Array.isArray(r.data?.data) ? r.data.data : [])).catch(e => console.error('changeHistory:', e));
    const p6 = getScoreDistribution({ subject_id: distSubject, granularity: 1, ...params }).then(r => setDistribution(r.data?.value || r.data?.data || (Array.isArray(r.data) ? r.data : []))).catch(e => console.error('distribution:', e));
    Promise.allSettled([p1, p2, p3, p4, p5, p6]).finally(() => { if (!silent) setLoading(false); setLastUpdated(new Date()); setRefreshing(false); });
  };

  useEffect(() => { fetchData(); }, [classId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 科目切换时单独获取分布数据
  useEffect(() => {
    if (!classId) return;
    getScoreDistribution({ subject_id: distSubject, granularity: 1, class_id: classId }).then(r => setDistribution(r.data?.value || r.data?.data || (Array.isArray(r.data) ? r.data : []))).catch(e => console.error('distribution:', e));
  }, [distSubject, classId]);

  // 30秒自动刷新（静默，不触发loading状态）
  useEffect(() => {
    if (!classId) return;
    refreshTimerRef.current = setInterval(() => { setRefreshing(true); fetchData(true); }, 30000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 及格率
  const passRate = (() => {
    if (!classStats.length) return '--';
    let totalPass = 0, totalStudents = 0;
    classStats.forEach((item) => { const count = item.student_count || 0; totalPass += count * ((item.pass_rate || 0) / 100); totalStudents += count; });
    if (totalStudents === 0) return '--';
    return ((totalPass / totalStudents) * 100).toFixed(1) + '%';
  })();

  // 各科得分率
  const subjectScoreRateData = (() => {
    const map = {};
    classStats.forEach((item) => { const subj = item.subject_id || '未知'; if (!map[subj]) map[subj] = { totalScore: 0, totalCount: 0 }; map[subj].totalScore += (item.avg_score || 0) * (item.student_count || 0); map[subj].totalCount += item.student_count || 0; });
    return Object.entries(map).map(([key, val]) => { const fullScore = SUBJECT_FULL_SCORE[key] || 100; const avgScore = val.totalCount ? +(val.totalScore / val.totalCount).toFixed(1) : 0; return { subject: SUBJECT_MAP[key] || key, subjectId: key, avgScore, fullScore, scoreRate: +(avgScore / fullScore * 100).toFixed(1) }; });
  })();

  // 风险分布
  const riskData = (() => {
    if (!alertStats) return [];
    const stats = alertStats.stats || alertStats;
    return [{ name: '高风险', value: stats.high || 0, key: 'high' }, { name: '中风险', value: stats.medium || 0, key: 'medium' }, { name: '低风险', value: stats.low || 0, key: 'low' }];
  })();
  // 优秀率
  const excellenceRate = (() => {
    if (!distribution.length) return null;
    const fs = SUBJECT_FULL_SCORE[distSubject] || 100;
    const t = fs * 0.8;
    const exc = distribution.filter(d => d.score >= t).reduce((s, d) => s + (d.count || 0), 0);
    const total = distribution.reduce((s, d) => s + (d.count || 0), 0);
    if (total === 0) return null;
    return { count: exc, rate: ((exc / total) * 100).toFixed(1) };
  })();

  // 排行榜
  const currentRankingOpt = RANKING_OPTIONS.find(o => o.value === rankingType) || RANKING_OPTIONS[0];
  const rankingData = teacherStats?.[rankingType] || [];
  const medalColors = ['var(--accent)', 'rgba(11,101,101,0.5)', 'rgba(11,101,101,0.3)'];

  const handleRankingTypeChange = (type) => { setRankingType(type); setShowFullRanking(false); };
  const teacherName = (selectedTeacherName || '').replace(/老师$/, '');
  const currentClassInfo = teacherClasses.find(c => c.class_id === classId);
  const subtitleText = `${currentClassInfo?.class_name || classId} · 学情数据一览`;
  const interventionData = teacherStats?.intervention || null;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><p className="text-tertiary">加载中...</p></div>;
  }

  if (!classId) {
    return (
      <div className="home-page"><div className="home-orb home-orb--top" /><div className="home-orb home-orb--bottom" />
        <WelcomeBanner role="teacher" title={`${teacherName}老师`} subtitle="班级学情数据一览" decoration="teacher" />
        <LiquidCard><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}><School size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block', paintOrder: 'stroke fill' }} /><p className="text-tertiary">暂未关联班级，请先选择教师身份</p></div></LiquidCard>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      <WelcomeBanner
        role="teacher"
        title={`${teacherName}老师`}
        subtitle={subtitleText}
        decoration="teacher"
      />

      {/* 统计数据 */}
      <LiquidCard style={{ marginBottom: '1.25rem', overflow: 'visible' }}>
        {/* 排行榜浮动面板 */}
        <div className="ranking-float-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Trophy size={13} style={{ color: 'var(--primary)' }} />
              排行榜
            </div>
            <LiquidSelect value={rankingType} onChange={handleRankingTypeChange} options={RANKING_OPTIONS.map(o => ({ value: o.value, label: o.label }))} style={{ width: 'auto' }} triggerStyle={{ minWidth: 'unset', padding: '0.375rem 0.625rem', fontSize: '0.75rem' }} />
          </div>
          <div className="liquid-scroll ranking-float-content" style={{ overflowY: 'auto', paddingRight: '0.25rem' }}>
            {rankingData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {rankingData.slice(0, 10).map((stu, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3125rem 0.5rem', borderRadius: '0.375rem', background: i === 0 ? 'rgba(201,147,58,0.06)' : 'transparent', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = 'rgba(11,101,101,0.03)'; }} onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stu.student_name}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--primary)', minWidth: 36, textAlign: 'right' }}>{stu.score}{currentRankingOpt.scoreUnit || ''}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.4)', textAlign: 'center', padding: '0.75rem 0' }}>暂无数据</div>}
          </div>
          <button className="ranking-view-all-btn" onClick={() => { setFullRankingData(rankingData); setShowFullRanking(true); }}>查看全部排名 <ChevronRight size={12} /></button>
        </div>

        <h2 style={{ margin: 0, marginBottom: '0.875rem' }}>统计数据</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {lastUpdated && <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={9} />更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          <button className="liquid-btn liquid-btn-sm" onClick={() => { setRefreshKey(k => k + 1); setRefreshing(true); }} disabled={refreshing} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', height: '1.5rem', fontSize: '0.625rem' }} title="刷新数据"><RefreshCw size={10} style={refreshing ? { animation: 'spin-rotate 0.6s linear infinite' } : {}} /></button>
        </div>

          {/* 板块1: 基础概况 */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />基础概况</div>
          <div className="stat-grid" style={{ marginBottom: '1rem' }}>
            {[
              { icon: Users, label: '学生总数', value: overview?.total_students ?? '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
              { icon: GraduationCap, label: '男女比例', value: teacherStats?.gender ? `${teacherStats.gender.male}:${teacherStats.gender.female}` : '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
              { icon: AlertTriangle, label: '高风险学生', value: overview?.high_risk_count ?? '--', color: 'var(--danger)', iconBg: 'rgba(192,57,43,0.08)' },
              { icon: CheckCircle, label: '及格率', value: passRate, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
            ].map((item, i) => (<div key={i} className="stat-metric-item"><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: item.iconBg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={15} /></div><div><div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.3 }}>{item.label}</div><div style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div></div></div></div>))}
            {teacherStats?.behavior && (teacherStats.behavior.avg_attendance < 80 || teacherStats.behavior.avg_sleep_hours < 6) && (
              <div className="stat-metric-item" style={{ border: '0.5px solid rgba(192,57,43,0.15)', background: 'rgba(192,57,43,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(192,57,43,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={15} /></div><div><div style={{ fontSize: '0.6875rem', color: 'var(--danger)', lineHeight: 1.3, fontWeight: 500 }}>⚠ 行为异常</div><div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.4 }}>{teacherStats.behavior.avg_attendance < 80 ? '出勤率偏低 ' : ''}{teacherStats.behavior.avg_sleep_hours < 6 ? '睡眠不足' : ''}</div></div></div>
              </div>
            )}
          </div>

          {/* 板块2: 成绩指标 */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />成绩指标</div>
          <div className="stat-grid" style={{ marginBottom: '0.75rem' }}>
            {[{ icon: TrendingUp, label: '平均得分率', value: overview?.average_score_rate != null ? Number(overview.average_score_rate).toFixed(1) + '%' : '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' }].map((item, i) => (<div key={i} className="stat-metric-item"><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: item.iconBg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={15} /></div><div><div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.3 }}>{item.label}</div><div style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div></div></div></div>))}
          </div>
          {subjectScoreRateData.length > 0 && (
            <div className="stat-grid" style={{ marginBottom: '1rem' }}>
              {subjectScoreRateData.map((item) => {
                const barColor = SUBJECT_COLORS[item.subjectId] || 'var(--primary)';
                return (<div key={item.subjectId} className="stat-fill-card" onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = `${item.scoreRate}%`; }} onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = '0'; }}><div className="stat-fill-bar" style={{ background: barColor }} /><div className="stat-fill-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500 }}>{item.subject}</span><span style={{ fontSize: '1rem', fontWeight: 700, color: barColor }}>{item.scoreRate}%</span></div></div>);
              })}
            </div>
          )}

          {/* 板块3: 学习行为 */}
          {teacherStats?.behavior && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />学习行为</div>
              <div className="stat-grid" style={{ marginBottom: '1rem' }}>
                {[
                  { icon: CalendarClock, label: '平均出勤率', value: teacherStats.behavior.avg_attendance + '%', color: teacherStats.behavior.avg_attendance < 80 ? 'var(--danger)' : 'var(--primary)', iconBg: teacherStats.behavior.avg_attendance < 80 ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.08)' },
                  { icon: BookOpen, label: '平均学习时长', value: teacherStats.behavior.avg_study_hours + 'h', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                  { icon: Moon, label: '平均睡眠时长', value: teacherStats.behavior.avg_sleep_hours + 'h', color: teacherStats.behavior.avg_sleep_hours < 6 ? 'var(--danger)' : 'var(--primary-lighter)', iconBg: teacherStats.behavior.avg_sleep_hours < 6 ? 'rgba(192,57,43,0.08)' : 'rgba(14,143,143,0.08)' },
                  { icon: Flame, label: '平均辅导次数', value: teacherStats.behavior.avg_tutoring + '次', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                  { icon: Dumbbell, label: '平均运动时长', value: teacherStats.behavior.avg_physical + 'h', color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
                ].map((item, i) => (<div key={i} className="stat-metric-item"><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: item.iconBg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={15} /></div><div><div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.3 }}>{item.label}</div><div style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div></div></div></div>))}
              </div>
            </>
          )}

          {/* 板块4: 风险预警 */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />风险预警</div>
          <div className="stat-grid" style={{ marginBottom: '0.75rem' }}>
            {riskData.map((item) => {
              const total = overview?.total_students || 1;
              const pct = ((item.value / total) * 100).toFixed(1);
              const iconMap = { high: ShieldAlert, medium: AlertTriangle, low: ShieldCheck }; const Icon = iconMap[item.key];
              return (<div key={item.key} className="stat-fill-card" onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = `${Math.min(parseFloat(pct), 100)}%`; }} onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = '0'; }}><div className="stat-fill-bar" style={{ background: RISK_COLORS[item.key] }} /><div className="stat-fill-content"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Icon size={13} style={{ color: RISK_COLORS[item.key] }} /><span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500 }}>{item.name}</span></div></div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: '1rem', fontWeight: 700, color: RISK_COLORS[item.key] }}>{item.value}</span><span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.4)' }}>{pct}%</span></div></div></div>);
            })}
          </div>
          {interventionData && (
            <div className="stat-grid">
              {[
                { icon: ClipboardCheck, label: '已干预', value: interventionData.completed, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
                { icon: HeartPulse, label: '进行中', value: interventionData.in_progress || 0, color: 'var(--warning)', iconBg: 'rgba(212,136,15,0.08)' },
                { icon: Clock, label: '待干预', value: interventionData.pending, color: 'var(--danger)', iconBg: 'rgba(192,57,43,0.08)' },
              ].map((item, i) => (<div key={i} className="stat-metric-item"><div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><div style={{ width: 32, height: 32, borderRadius: 8, background: item.iconBg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={15} /></div><div><div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', lineHeight: 1.3 }}>{item.label}</div><div style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div></div></div></div>))}
            </div>
          )}
      </LiquidCard>

      {/* 成绩分布 */}
      <LiquidCard title="成绩分布" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          {Object.entries(SUBJECT_MAP).map(([id, name]) => <ChartFilterBtn key={id} active={distSubject === id} color={SUBJECT_COLORS[id]} onClick={() => setDistSubject(id)}>{name}</ChartFilterBtn>)}
          {excellenceRate && <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Trophy size={10} style={{ color: 'var(--accent)' }} />优秀率 {excellenceRate.rate}% ({excellenceRate.count}人 ≥ 80%)</span>}
        </div>
        {distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={distribution} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <defs><linearGradient id="teacherDistGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b6565" stopOpacity={0.3} /><stop offset="100%" stopColor="#0b6565" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
              <XAxis dataKey="score" type="number" domain={[0, SUBJECT_FULL_SCORE[distSubject] || 100]} tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} label={{ value: '分数', position: 'insideBottomRight', offset: -4, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }} ticks={distSubject === 'SUBJ_GENERAL' ? [0, 20, 40, 60, 80, 100] : [0, 5, 10, 15, 20]} />
              <YAxis tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} label={{ value: '人数', angle: -90, position: 'insideTopLeft', offset: 16, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} labelFormatter={(l) => '分数: ' + l} />
              <Area type="monotone" dataKey="count" name="人数" stroke="#0b6565" strokeWidth={2} fill="url(#teacherDistGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>暂无数据</div>}
      </LiquidCard>

      {/* 变更历史（最多5项） */}
      <LiquidCard title="变更历史" style={{ marginBottom: '1.25rem' }}>
        {changeHistory.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: '0.625rem', border: '0.5px solid rgba(11,101,101,0.08)' }}>
            <table className="liquid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>操作类型</th>
                  <th>目标表</th>
                  <th>描述</th>
                  <th>操作人</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {changeHistory.map((item) => {
                  const opIcon = item.operation === 'INSERT' || item.operation === 'GENERATE'
                    ? <Plus size={12} style={{ color: item.op_color }} />
                    : item.operation === 'UPDATE'
                      ? <Pencil size={12} style={{ color: item.op_color }} />
                      : <Trash2 size={12} style={{ color: item.op_color }} />;
                  return (
                    <tr key={item.change_id}>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: item.op_color, verticalAlign: 'middle' }}>
                          {opIcon}
                          {item.op_label}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.5rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)', verticalAlign: 'middle' }}>
                          {item.table_label}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || '--'}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)', verticalAlign: 'middle' }}>
                          <User size={12} style={{ color: 'rgba(11,101,101,0.35)' }} />
                          {formatOperator(item)}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <Clock size={10} />
                          {formatTime(item.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0' }}>
            <p className="text-tertiary">暂无变更记录</p>
          </div>
        )}
      </LiquidCard>

      {/* 全量排行模态框 */}
      {showFullRanking && createPortal(
        <div className="ranking-modal-overlay" onClick={() => setShowFullRanking(false)}>
          <div className="ranking-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={16} style={{ color: 'var(--accent)' }} /><h2 style={{ margin: 0, fontSize: '1rem' }}>{currentRankingOpt.label} - 全部排名</h2></div><button className="liquid-btn liquid-btn-sm" onClick={() => setShowFullRanking(false)} style={{ padding: '0.25rem', minWidth: 28, minHeight: 28 }}><X size={14} /></button></div>
            <div className="liquid-scroll" style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 80px)', paddingRight: '0.25rem' }}>
              {fullRankingData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>{fullRankingData.map((stu, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: i === 0 ? 'rgba(201,147,58,0.06)' : 'transparent' }}><span style={{ width: 20, height: 20, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span><span style={{ fontSize: '0.8125rem', color: '#1a2b2b', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stu.student_name}</span><span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.4)' }}>{stu.class_name}</span><span style={{ fontSize: '0.875rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : currentRankingOpt.accentColor, minWidth: 40, textAlign: 'right' }}>{stu.score}{currentRankingOpt.scoreUnit || ''}</span></div>)}</div>
              ) : <div style={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.4)', textAlign: 'center', padding: '1rem 0' }}>暂无数据</div>}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{'@keyframes spin-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
