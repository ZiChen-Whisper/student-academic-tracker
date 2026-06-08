import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Clock, Plus, Pencil, Trash2, User, ChevronRight, ChevronDown, Code, Users, School, GraduationCap, TrendingUp, CircleCheckBig, AlertTriangle, ShieldAlert, ShieldCheck, CalendarClock, Moon, BookOpen, HeartPulse, ClipboardCheck, Trophy, Medal, BarChart3, X, Loader2 } from 'lucide-react';
import WelcomeBanner from '../../components/WelcomeBanner';
import LiquidCard from '../../components/LiquidCard';
import LiquidSelect from '../../components/LiquidSelect';
import { useRole } from '../../contexts/RoleContext';
import { getOverview, getAlertStats, getClassStats, getChangeHistory, getTeachers, getAdminStats, getAdminRankings } from '../../api';

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

export default function AdminHome() {
  const { selectedAdminId, selectedAdminName } = useRole();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [alertStats, setAlertStats] = useState(null);
  const [changeHistory, setChangeHistory] = useState([]);
  const [expandedChangeId, setExpandedChangeId] = useState(null);
  const [classStats, setClassStats] = useState([]);
  const [teacherCount, setTeacherCount] = useState(0);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankingType, setRankingType] = useState('class_ranking');
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [fullRankingData, setFullRankingData] = useState([]);
  const [fullRankingLoading, setFullRankingLoading] = useState(false);

  useEffect(() => {
    const p1 = getOverview({})
      .then((res) => setOverview(res.data))
      .catch((err) => console.error('加载概览数据失败:', err));

    const p2 = getAlertStats({})
      .then((res) => setAlertStats(res.data))
      .catch((err) => console.error('加载预警统计失败:', err));

    const p3 = getClassStats({})
      .then((res) => setClassStats(res.data?.data || (Array.isArray(res.data) ? res.data : [])))
      .catch((err) => console.error('加载班级统计失败:', err));

    const p4 = getChangeHistory({ limit: 5 })
      .then((res) => setChangeHistory(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch((err) => console.error('加载变更历史失败:', err));

    const p5 = getTeachers()
      .then((res) => setTeacherCount(Array.isArray(res.data?.data) ? res.data.data.length : 0))
      .catch((err) => console.error('加载教师数据失败:', err));

    const p6 = getAdminStats()
      .then((res) => setAdminStats(res.data))
      .catch((err) => console.error('加载管理员统计失败:', err));

    Promise.allSettled([p1, p2, p3, p4, p5, p6]).finally(() => setLoading(false));
  }, []);

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

  // 班级数
  const classCount = (() => {
    const ids = new Set(classStats.map((item) => item.class_id));
    return ids.size;
  })();

  // 排名类型配置
  const RANKING_OPTIONS = [
    { value: 'class_ranking', label: '班级排名', icon: School, accentColor: 'var(--accent)', isClass: true },
    { value: 'top5_general', label: '综合成绩排名', icon: Trophy, accentColor: 'var(--success)', scoreUnit: '分' },
    { value: 'top5_math', label: '数学成绩排名', icon: BarChart3, accentColor: 'var(--primary)', scoreUnit: '分' },
    { value: 'top5_portuguese', label: '葡萄牙语成绩排名', icon: BookOpen, accentColor: 'var(--accent)', scoreUnit: '分' },
    { value: 'top5_attendance', label: '出勤率排名', icon: CalendarClock, accentColor: 'var(--primary)', scoreUnit: '%' },
    { value: 'top5_study_hours', label: '学习时长排名', icon: BookOpen, accentColor: 'var(--accent-light)', scoreUnit: 'h' },
    { value: 'top5_improvement', label: '成绩进步排名', icon: TrendingUp, accentColor: 'var(--success)', scoreUnit: '分' },
  ];

  // 打开全量排名浮窗
  const openFullRanking = async () => {
    setShowFullRanking(true);
    setFullRankingLoading(true);
    try {
      const res = await getAdminRankings(rankingType);
      setFullRankingData(res.data?.data || []);
    } catch (err) {
      console.error('加载全量排名失败:', err);
      setFullRankingData([]);
    } finally {
      setFullRankingLoading(false);
    }
  };

  // 切换排名类型时关闭浮窗
  const handleRankingTypeChange = (type) => {
    setRankingType(type);
    if (showFullRanking) {
      setShowFullRanking(false);
    }
  };

  // 渲染班级排名
  const renderClassRanking = () => {
    const data = adminStats?.class_ranking || [];
    if (!data.length) return <div style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.4)', textAlign: 'center', padding: '0.75rem 0' }}>暂无数据</div>;
    const maxScore = Math.max(...data.map(c => c.avg_score));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {data.map((cls, i) => {
          const pct = (cls.avg_score / maxScore * 100).toFixed(0);
          const medalColors = ['var(--accent)', 'rgba(11,101,101,0.5)', 'rgba(11,101,101,0.3)'];
          return (
            <div key={i} className="stat-fill-card ranking-item-compact"
              onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = pct + '%'; }}
              onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = '0'; }}
            >
              <div className="stat-fill-bar" style={{ background: i === 0 ? 'var(--accent)' : 'var(--primary)' }} />
              <div className="stat-fill-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500 }}>{cls.class_name}</span>
                  <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.4)' }}>{cls.student_count}人</span>
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--primary)' }}>{cls.avg_score}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染学生Top10排名
  const renderStudentTop5 = (data, accentColor, scoreUnit) => {
    if (!data?.length) return <div style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.4)', textAlign: 'center', padding: '0.75rem 0' }}>暂无数据</div>;
    const medalColors = ['var(--accent)', 'rgba(11,101,101,0.5)', 'rgba(11,101,101,0.3)'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {data.map((stu, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3125rem 0.5rem', borderRadius: '0.375rem', background: i === 0 ? 'rgba(201,147,58,0.06)' : 'transparent', transition: 'background 0.2s' }}
            onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = 'rgba(11,101,101,0.03)'; }}
            onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stu.student_name}</span>
            <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.4)' }}>{stu.class_name}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : accentColor, minWidth: 36, textAlign: 'right' }}>{stu.score}{scoreUnit}</span>
          </div>
        ))}
      </div>
    );
  };

  // 根据排名类型渲染内容
  const renderRankingContent = () => {
    const opt = RANKING_OPTIONS.find(o => o.value === rankingType);
    if (!opt) return null;
    if (opt.isClass) return renderClassRanking();
    return renderStudentTop5(adminStats?.[rankingType], opt.accentColor, opt.scoreUnit || '');
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
      {/* 装饰光晕 */}
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 欢迎横幅 */}
      <WelcomeBanner
        role="admin"
        title="系统管理员"
        subtitle="全校学情数据一览"
        decoration="admin"
      />

      {/* 统计数据 */}
      <LiquidCard style={{ marginBottom: '1.25rem', overflow: 'visible' }}>
        {/* ── 悬浮排行榜（float 右侧，放在最前确保从内容区顶部开始浮动） ── */}
        <div className="ranking-float-panel">
          {/* 标题行 + 下拉选择 */}
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
          {/* 排名内容 */}
          <div className="liquid-scroll ranking-float-content" style={{ overflowY: 'auto', paddingRight: '0.25rem' }}>
            {renderRankingContent()}
          </div>
          {/* 查看全部按钮 */}
          <button
            className="ranking-view-all-btn"
            onClick={openFullRanking}
          >
            查看全部排名
            <ChevronRight size={12} />
          </button>
        </div>

        {/* 卡片标题（手动渲染，在 float 之后，内容会环绕浮块） */}
        <h2 style={{ margin: 0, marginBottom: '0.875rem' }}>统计数据</h2>

        {/* 指标卡片 */}
        <div>
            {/* 板块1: 基础概况 */}
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
              基础概况
            </div>
            <div className="stat-grid" style={{ marginBottom: '1rem' }}>
              {[
                { icon: Users, label: '学生总数', value: overview?.total_students ?? '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
                { icon: School, label: '班级数', value: classCount || '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
                { icon: GraduationCap, label: '教师数', value: teacherCount || '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
                { icon: Users, label: '男女比例', value: adminStats?.gender ? `${adminStats.gender.male}:${adminStats.gender.female}` : '--', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
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
                { icon: CircleCheckBig, label: '及格率', value: passRate, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
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
            {/* 各科目得分率 */}
            {subjectScoreRateData.length > 0 && (
              <div className="stat-grid" style={{ marginBottom: '1rem' }}>
                {subjectScoreRateData.map((item) => {
                  const barColor = item.subjectId === 'SUBJ_GENERAL' ? 'var(--success)' : item.subjectId === 'SUBJ_MATH' ? 'var(--primary)' : 'var(--accent)';
                  return (
                    <div key={item.subjectId} className="stat-fill-card"
                      onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) { bar.style.width = `${item.scoreRate}%`; } }}
                      onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) { bar.style.width = '0'; } }}
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
            {adminStats?.behavior && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
                  学习行为
                </div>
                <div className="stat-grid" style={{ marginBottom: '1rem' }}>
                  {[
                    { icon: CalendarClock, label: '平均出勤率', value: adminStats.behavior.avg_attendance + '%', color: 'var(--primary)', iconBg: 'rgba(11,101,101,0.08)' },
                    { icon: BookOpen, label: '平均学习时长', value: adminStats.behavior.avg_study_hours + 'h', color: 'var(--accent)', iconBg: 'rgba(201,147,58,0.08)' },
                    { icon: Moon, label: '平均睡眠时长', value: adminStats.behavior.avg_sleep_hours + 'h', color: 'var(--primary-lighter)', iconBg: 'rgba(14,143,143,0.08)' },
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
                    onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) { bar.style.width = `${Math.min(parseFloat(pct), 100)}%`; } }}
                    onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) { bar.style.width = '0'; } }}
                  >
                    <div className="stat-fill-bar" style={{ background: item.color }} />
                    <div className="stat-fill-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Icon size={13} style={{ color: item.color }} />
                          <span style={{ fontSize: '0.75rem', color: '#1a2b2b', fontWeight: 500 }}>{item.name}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: item.color }}>{item.value}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.4)' }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 干预进度 */}
            {adminStats?.intervention && (
              <div className="stat-grid">
                {[
                  { icon: ClipboardCheck, label: '已干预', value: adminStats.intervention.completed, color: 'var(--success)', iconBg: 'rgba(26,138,90,0.08)' },
                  { icon: HeartPulse, label: '待干预', value: adminStats.intervention.pending, color: 'var(--danger)', iconBg: 'rgba(192,57,43,0.08)' },
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

      {/* 全量排名浮窗 — Portal 渲染到 body */}
      {showFullRanking && createPortal(
        <div className="ranking-modal-overlay" onClick={() => setShowFullRanking(false)}>
          <div className="ranking-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={16} style={{ color: 'var(--accent)' }} />
                <h2 style={{ margin: 0, fontSize: '1rem' }}>
                  {RANKING_OPTIONS.find(o => o.value === rankingType)?.label} - 全部排名
                </h2>
              </div>
              <button
                className="liquid-btn liquid-btn-sm"
                onClick={() => setShowFullRanking(false)}
                style={{ padding: '0.25rem', minWidth: 28, minHeight: 28 }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="liquid-scroll" style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 80px)', paddingRight: '0.25rem' }}>
              {fullRankingLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 0' }}>
                  <Loader2 size={20} className="spin" style={{ color: 'var(--primary)', marginRight: '0.5rem' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.5)' }}>加载中...</span>
                </div>
              ) : fullRankingData.length > 0 ? (
                (() => {
                  const opt = RANKING_OPTIONS.find(o => o.value === rankingType);
                  if (opt?.isClass) {
                    const maxScore = Math.max(...fullRankingData.map(c => c.avg_score));
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {fullRankingData.map((cls, i) => {
                          const pct = (cls.avg_score / maxScore * 100).toFixed(0);
                          const medalColors = ['var(--accent)', 'rgba(11,101,101,0.5)', 'rgba(11,101,101,0.3)'];
                          return (
                            <div key={i} className="stat-fill-card"
                              onMouseEnter={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = pct + '%'; }}
                              onMouseLeave={(e) => { const bar = e.currentTarget.querySelector('.stat-fill-bar'); if (bar) bar.style.width = '0'; }}
                            >
                              <div className="stat-fill-bar" style={{ background: i === 0 ? 'var(--accent)' : 'var(--primary)' }} />
                              <div className="stat-fill-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                                  <span style={{ fontSize: '0.8125rem', color: '#1a2b2b', fontWeight: 500 }}>{cls.class_name}</span>
                                  <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.4)' }}>{cls.student_count}人</span>
                                </div>
                                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--primary)' }}>{cls.avg_score}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  const medalColors = ['var(--accent)', 'rgba(11,101,101,0.5)', 'rgba(11,101,101,0.3)'];
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {fullRankingData.map((stu, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: i === 0 ? 'rgba(201,147,58,0.06)' : 'transparent', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = 'rgba(11,101,101,0.03)'; }}
                          onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: i < 3 ? medalColors[i] : 'rgba(11,101,101,0.08)', color: i < 3 ? '#fff' : 'rgba(11,101,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: '0.8125rem', color: '#1a2b2b', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stu.student_name}</span>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.4)' }}>{stu.class_name}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: i === 0 ? 'var(--accent)' : opt?.accentColor || 'var(--primary)', minWidth: 40, textAlign: 'right' }}>{stu.score}{opt?.scoreUnit || ''}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div style={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.4)', textAlign: 'center', padding: '1rem 0' }}>暂无数据</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 变更历史（最多5项） */}
      <LiquidCard
        title="变更历史"
        action={
          <button
            className="liquid-btn liquid-btn-sm"
            onClick={() => navigate('/admin/history')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            查看详情
            <ChevronRight size={12} />
          </button>
        }
      >
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
                  <th style={{ width: 28 }}></th>
                </tr>
              </thead>
              <tbody>
                {changeHistory.map((item) => {
                  const opIcon = item.operation === 'INSERT' || item.operation === 'GENERATE'
                    ? <Plus size={12} style={{ color: item.op_color }} />
                    : item.operation === 'UPDATE'
                      ? <Pencil size={12} style={{ color: item.op_color }} />
                      : <Trash2 size={12} style={{ color: item.op_color }} />;
                  const isExpanded = expandedChangeId === item.change_id;
                  return (
                    <React.Fragment key={item.change_id}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedChangeId(isExpanded ? null : item.change_id)}
                      >
                        <td style={{ verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: item.op_color, verticalAlign: 'middle' }}>
                            {opIcon}
                            {item.op_label}
                          </span>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)', verticalAlign: 'middle' }}>
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
                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <ChevronDown
                            size={14}
                            style={{
                              color: 'rgba(11,101,101,0.35)',
                              transition: 'transform 0.25s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              display: 'inline-block',
                            }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={6} style={{ padding: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                          <div
                            style={{
                              maxHeight: isExpanded ? 400 : 0,
                              opacity: isExpanded ? 1 : 0,
                              overflow: 'hidden',
                              transition: 'max-height 0.3s ease, opacity 0.25s ease',
                            }}
                          >
                            <div style={{ padding: '0.75rem 1rem 1rem', background: 'rgba(11,101,101,0.015)' }}>
                              {item.change_detail && typeof item.change_detail === 'object' && Object.keys(item.change_detail).length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.25rem' }}>变更字段</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.25rem' }}>
                                    {Object.entries(item.change_detail).map(([k, v]) => (
                                      <div key={k} style={{ fontSize: '0.75rem', display: 'flex', gap: '0.25rem' }}>
                                        <span style={{ color: 'rgba(11,101,101,0.45)', flexShrink: 0 }}>{k}:</span>
                                        <span style={{ color: '#1a2b2b', fontWeight: 500, wordBreak: 'break-all' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.sql_statement && (
                                <div>
                                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(11,101,101,0.5)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Code size={10} style={{ color: 'rgba(11,101,101,0.35)' }} />
                                    SQL 语句
                                  </div>
                                  <div className="liquid-code" style={{ fontSize: '0.75rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {item.sql_statement}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
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
    </div>
  );
}
