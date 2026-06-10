import { useState, useEffect, useRef, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3, RefreshCw, ArrowUp, ArrowDown, Minus, Trophy } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import ChartTooltip from '../../components/ChartTooltip';
import ChartFilterBtn from '../../components/ChartFilterBtn';
import { useRole } from '../../contexts/RoleContext';
import { getOverview, getScoreDistribution, getClassStats, getAlertStats } from '../../api';

const SUBJECT_FULL_SCORE = { SUBJ_MATH: 20, SUBJ_PORTUGUESE: 20, SUBJ_GENERAL: 100 };
const SUBJECT_MAP = { SUBJ_GENERAL: '综合', SUBJ_MATH: '数学', SUBJ_PORTUGUESE: '葡萄牙语' };
const SUBJECT_COLORS = { SUBJ_GENERAL: '#1a8a5a', SUBJ_MATH: '#0b6565', SUBJ_PORTUGUESE: '#c9933a' };
const RISK_COLORS = { low: '#1a8a5a', medium: '#d4880f', high: '#c0392b' };
const RISK_LABELS = { low: '低风险', medium: '中风险', high: '高风险' };

export default function TeacherOverview() {
  const { selectedTeacherClassId, teacherClasses } = useRole();
  const classId = selectedTeacherClassId || '';
  const refreshTimerRef = useRef(null);

  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [allClassStats, setAllClassStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distSubject, setDistSubject] = useState('SUBJ_GENERAL');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const currentClassInfo = teacherClasses.find(c => c.class_id === classId);
  const currentGrade = currentClassInfo?.class_grade || '';

  const fetchData = useCallback(async () => {
    if (!classId) { setLoading(false); return; }
    const params = { class_id: classId };
    const p1 = getOverview(params).then((res) => setOverview(res.data)).catch((e) => console.error(e));
    const p2 = getScoreDistribution({ subject_id: distSubject, granularity: 1, ...params }).then((res) => { const d = res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []); setDistribution(d); }).catch((e) => console.error(e));
    const p3 = getClassStats(params).then((res) => setClassStats(res.data?.data || (Array.isArray(res.data) ? res.data : []))).catch((e) => console.error(e));
    const p4 = getAlertStats(params).then((res) => setAlertStats(res.data)).catch((e) => console.error(e));
    const p5 = getClassStats({}).then((res) => setAllClassStats(res.data?.data || (Array.isArray(res.data) ? res.data : []))).catch((e) => console.error(e));
    await Promise.allSettled([p1, p2, p3, p4, p5]);
    setLastUpdated(new Date());
    setLoading(false);
  }, [classId, distSubject]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData, refreshKey]);

  // 30秒自动刷新
  useEffect(() => {
    if (!classId) return;
    refreshTimerRef.current = setInterval(() => { setRefreshKey(k => k + 1); setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }, 30000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [classId]);

  const handleRefresh = () => { setRefreshKey(k => k + 1); setRefreshing(true); setTimeout(() => setRefreshing(false), 600); };

  const passRate = (() => {
    if (!classStats.length) return '--';
    let totalPass = 0, totalStudents = 0;
    classStats.forEach((item) => { const count = item.student_count || 0; const rate = (item.pass_rate || 0) / 100; totalPass += count * rate; totalStudents += count; });
    if (totalStudents === 0) return '--';
    return ((totalPass / totalStudents) * 100).toFixed(1) + '%';
  })();

  const subjectScoreRateData = (() => {
    const map = {};
    classStats.forEach((item) => { const subj = item.subject_id || '未知'; if (!map[subj]) map[subj] = { totalScore: 0, totalCount: 0 }; map[subj].totalScore += (item.avg_score || 0) * (item.student_count || 0); map[subj].totalCount += item.student_count || 0; });
    return Object.entries(map).map(([key, val]) => { const fullScore = SUBJECT_FULL_SCORE[key] || 100; const avgScore = val.totalCount ? +(val.totalScore / val.totalCount).toFixed(1) : 0; const scoreRate = +(avgScore / fullScore * 100).toFixed(1); return { subject: SUBJECT_MAP[key] || key, subjectId: key, avgScore, fullScore, scoreRate }; });
  })();

  const riskData = (() => {
    if (!alertStats) return [];
    const stats = alertStats.stats || alertStats;
    return [{ name: RISK_LABELS.low, value: stats.low || 0, key: 'low' }, { name: RISK_LABELS.medium, value: stats.medium || 0, key: 'medium' }, { name: RISK_LABELS.high, value: stats.high || 0, key: 'high' }].filter((d) => d.value > 0);
  })();
  const totalAlerts = riskData.reduce((sum, d) => sum + d.value, 0);

  // 班级成绩对比
  const gradeRanking = (() => {
    if (!allClassStats.length || !currentGrade) return null;
    const gradeStats = allClassStats.filter(s => { const cls = teacherClasses.find(c => c.class_id === s.class_id); return cls?.class_grade === currentGrade; });
    const classAvgs = {};
    gradeStats.forEach(s => { if (!classAvgs[s.class_id]) classAvgs[s.class_id] = { totalScore: 0, totalCount: 0 }; classAvgs[s.class_id].totalScore += (s.avg_score || 0) * (s.student_count || 0); classAvgs[s.class_id].totalCount += s.student_count || 0; });
    const ranked = Object.entries(classAvgs).map(([id, v]) => ({ class_id: id, avg: v.totalCount ? +(v.totalScore / v.totalCount).toFixed(1) : 0 })).sort((a, b) => b.avg - a.avg);
    const myRank = ranked.findIndex(r => r.class_id === classId) + 1;
    const myEntry = ranked.find(r => r.class_id === classId);
    const gradeAvg = ranked.length ? ranked.reduce((s, r) => s + r.avg, 0) / ranked.length : 0;
    return { rank: myRank, total: ranked.length, myAvg: myEntry?.avg || 0, gradeAvg: +gradeAvg.toFixed(1), topClass: ranked[0] };
  })();

  const excellenceRate = (() => {
    if (!distribution.length) return null;
    const fullScore = SUBJECT_FULL_SCORE[distSubject] || 100;
    const threshold = fullScore * 0.8;
    const excellent = distribution.filter(d => d.score >= threshold).reduce((sum, d) => sum + (d.count || 0), 0);
    const total = distribution.reduce((sum, d) => sum + (d.count || 0), 0);
    if (total === 0) return null;
    return { count: excellent, rate: ((excellent / total) * 100).toFixed(1) };
  })();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中...</p>
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="home-page">
        <div className="home-orb home-orb--top" />
        <div className="home-orb home-orb--bottom" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(11,101,101,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ margin: 0 }}>学情概览</h1>
        </div>
        <LiquidCard>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <BarChart3 size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.875rem' }}>请先选择班级</p>
          </div>
        </LiquidCard>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(11,101,101,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 style={{ margin: 0 }}>学情概览</h1>
        {lastUpdated && (
          <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)', marginLeft: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <Clock size={10} />
            更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button className="liquid-btn liquid-btn-sm" onClick={handleRefresh} disabled={refreshing} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} title="手动刷新">
          <RefreshCw size={12} style={refreshing ? { animation: 'spin-rotate 0.6s linear infinite' } : {}} />
        </button>
      </div>

      {/* 指标卡片 */}
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Users size={15} /></div>
            <div><div className="metric-label">学生总数</div><div className="metric-value">{overview?.total_students ?? '--'}</div></div>
          </div>
        </div>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><TrendingUp size={15} /></div>
            <div><div className="metric-label">平均得分率</div><div className="metric-value">{overview?.average_score_rate != null ? Number(overview.average_score_rate).toFixed(1) + '%' : '--'}</div></div>
          </div>
        </div>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(192,57,43,0.08)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={15} /></div>
            <div><div className="metric-label">高风险学生</div><div className="metric-value" style={{ color: 'var(--danger)' }}>{overview?.high_risk_count ?? '--'}</div></div>
          </div>
        </div>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,138,90,0.08)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={15} /></div>
            <div><div className="metric-label">及格率</div><div className="metric-value" style={{ color: 'var(--success)' }}>{passRate}</div></div>
          </div>
        </div>
      </div>

      {/* 班级对比卡片 */}
      {gradeRanking && (
        <LiquidCard style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Trophy size={16} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, fontSize: '0.9375rem' }}>班级对比 · {currentGrade}（共 {gradeRanking.total} 班）</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(11,101,101,0.02)', borderRadius: '0.75rem', border: '0.5px solid rgba(11,101,101,0.06)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.25rem' }}>年级排名</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: gradeRanking.rank <= Math.ceil(gradeRanking.total / 3) ? 'var(--accent)' : 'var(--primary)', lineHeight: 1.2 }}>{gradeRanking.rank}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'rgba(11,101,101,0.35)' }}>/{gradeRanking.total}</span></div>
              {gradeRanking.rank === 1 && <div style={{ fontSize: '0.625rem', color: 'var(--accent)', fontWeight: 600 }}><Trophy size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} />年级第一</div>}
            </div>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', padding: '0.75rem 1rem', background: 'rgba(11,101,101,0.02)', borderRadius: '0.75rem', border: '0.5px solid rgba(11,101,101,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span style={{ color: 'rgba(11,101,101,0.5)' }}>班级平均分</span><span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{gradeRanking.myAvg}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span style={{ color: 'rgba(11,101,101,0.5)' }}>年级平均分</span><span style={{ fontWeight: 600, color: 'rgba(11,101,101,0.65)' }}>{gradeRanking.gradeAvg}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span style={{ color: 'rgba(11,101,101,0.5)' }}>与均值差距</span><span style={{ fontWeight: 600, color: gradeRanking.myAvg > gradeRanking.gradeAvg ? 'var(--success)' : gradeRanking.myAvg < gradeRanking.gradeAvg ? 'var(--danger)' : 'rgba(11,101,101,0.65)' }}>{gradeRanking.myAvg > gradeRanking.gradeAvg ? '+' : ''}{(gradeRanking.myAvg - gradeRanking.gradeAvg).toFixed(1)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span style={{ color: 'rgba(11,101,101,0.5)' }}>年级第一</span><span style={{ fontWeight: 600, color: 'var(--accent)' }}>{gradeRanking.topClass?.class_id} ({gradeRanking.topClass?.avg})</span></div>
            </div>
          </div>
        </LiquidCard>
      )}

      {/* 图表区 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        <LiquidCard title="各科得分率">
          {subjectScoreRateData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              {subjectScoreRateData.map((item) => {
                const subjectColor = SUBJECT_COLORS[item.subjectId] || '#0b6565';
                return (
                  <div key={item.subjectId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#095050' }}>{item.subject}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.5)' }}>平均 {item.avgScore} / {item.fullScore}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ flex: 1, height: 20, background: 'rgba(11,101,101,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: item.scoreRate + '%', background: 'linear-gradient(90deg, ' + subjectColor + ', ' + subjectColor + '80)', borderRadius: 10, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: subjectColor, minWidth: 48, textAlign: 'right' }}>{item.scoreRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (<p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>)}
        </LiquidCard>

        <LiquidCard title="风险等级分布">
          {riskData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 220, height: 220 }}>
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                      {riskData.map((entry) => (<Cell key={entry.key} fill={RISK_COLORS[entry.key]} />))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#095050', lineHeight: 1.2 }}>{totalAlerts}</span>
                  <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.45)' }}>预警总数</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                {riskData.map((entry) => (
                  <div key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[entry.key], flexShrink: 0 }} />{entry.name} {entry.value}
                  </div>
                ))}
              </div>
            </div>
          ) : (<p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>)}
        </LiquidCard>
      </div>

      {/* 成绩分布 */}
      <LiquidCard title="成绩分布">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          {Object.entries(SUBJECT_MAP).map(([id, name]) => (
            <ChartFilterBtn key={id} active={distSubject === id} color={SUBJECT_COLORS[id]} onClick={() => setDistSubject(id)}>{name}</ChartFilterBtn>
          ))}
          {excellenceRate && (
            <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'rgba(11,101,101,0.45)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Trophy size={10} style={{ color: 'var(--accent)' }} />优秀率 {excellenceRate.rate}% ({excellenceRate.count}人 ≥ 80%)
            </span>
          )}
        </div>
        {distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={distribution} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="areaGradientOv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b6565" stopOpacity={0.3} /><stop offset="100%" stopColor="#0b6565" stopOpacity={0.02} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
              <XAxis dataKey="score" type="number" domain={[0, SUBJECT_FULL_SCORE[distSubject] || 100]} tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} label={{ value: '分数', position: 'insideBottomRight', offset: -4, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }} ticks={distSubject === 'SUBJ_GENERAL' ? [0, 20, 40, 60, 80, 100] : [0, 5, 10, 15, 20]} />
              <YAxis tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} label={{ value: '人数', angle: -90, position: 'insideTopLeft', offset: 16, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} labelFormatter={(label) => '分数: ' + label} />
              <Area type="monotone" dataKey="count" name="人数" stroke="#0b6565" strokeWidth={2} fill="url(#areaGradientOv)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (<p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>)}
      </LiquidCard>

      <style>{'@keyframes spin-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
