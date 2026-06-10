import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Users, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import ChartTooltip from '../../components/ChartTooltip';
import ChartFilterBtn from '../../components/ChartFilterBtn';
import { useRole } from '../../contexts/RoleContext';
import { getOverview, getScoreDistribution, getClassStats, getAlertStats } from '../../api';

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

export default function TeacherOverview() {
  const { selectedTeacherClassId } = useRole();
  const classId = selectedTeacherClassId || '';
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distSubject, setDistSubject] = useState('SUBJ_GENERAL');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const params = classId ? { class_id: classId } : {};
    Promise.all([getOverview(params), getScoreDistribution({ subject_id: 'SUBJ_GENERAL', granularity: 1, ...params }), getClassStats(params), getAlertStats(params)])
      .then(([ovRes, distRes, csRes, alRes]) => {
        setOverview(ovRes.data);
        const distData = distRes.data?.value || distRes.data?.data || (Array.isArray(distRes.data) ? distRes.data : []);
        setDistribution(distData);
        setClassStats(csRes.data?.data || (Array.isArray(csRes.data) ? csRes.data : []));
        setAlertStats(alRes.data);
        setLastUpdated(new Date());
      })
      .catch((err) => { console.error('获取学情概览数据失败:', err); })
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => {
    if (loading) return;
    const params = classId ? { class_id: classId } : {};
    getScoreDistribution({ subject_id: distSubject, granularity: 1, ...params })
      .then((res) => {
        const distData = res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDistribution(distData);
      })
      .catch((err) => console.error('获取成绩分布失败:', err));
  }, [distSubject, classId, loading]);

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

  const riskData = (() => {
    if (!alertStats) return [];
    const stats = alertStats.stats || alertStats;
    return [
      { name: RISK_LABELS.low, value: stats.low || 0, key: 'low' },
      { name: RISK_LABELS.medium, value: stats.medium || 0, key: 'medium' },
      { name: RISK_LABELS.high, value: stats.high || 0, key: 'high' },
    ].filter((d) => d.value > 0);
  })();
  const totalAlerts = riskData.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中..</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 页面标题 */}
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
      </div>

      {/* 指标卡片 - stat-metric-item 风格 */}
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={15} />
            </div>
            <div>
              <div className="metric-label">学生总数</div>
              <div className="metric-value">{overview?.total_students ?? '--'}</div>
            </div>
          </div>
        </div>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(11,101,101,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={15} />
            </div>
            <div>
              <div className="metric-label">平均得分率</div>
              <div className="metric-value">{overview?.average_score_rate != null ? Number(overview.average_score_rate).toFixed(1) + '%' : '--'}</div>
            </div>
          </div>
        </div>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(192,57,43,0.08)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={15} />
            </div>
            <div>
              <div className="metric-label">高风险学生</div>
              <div className="metric-value" style={{ color: 'var(--danger)' }}>{overview?.high_risk_count ?? '--'}</div>
            </div>
          </div>
        </div>
        <div className="stat-metric-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,138,90,0.08)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle size={15} />
            </div>
            <div>
              <div className="metric-label">及格率</div>
              <div className="metric-value" style={{ color: 'var(--success)' }}>{passRate}</div>
            </div>
          </div>
        </div>
      </div>

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
                );})}
            </div>
          ) : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>
          )}
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
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#095050', lineHeight: 1.2 }}>{totalAlerts}</span>
                  <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.45)' }}>预警总数</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                {riskData.map((entry) => (
                  <div key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[entry.key], flexShrink: 0 }} />
                    {entry.name} {entry.value}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>
          )}
        </LiquidCard>
      </div>

      {/* 成绩分布面积图 */}
      <LiquidCard title="成绩分布">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {Object.entries(SUBJECT_MAP).map(([id, name]) => (
            <ChartFilterBtn key={id} active={distSubject === id} color={SUBJECT_COLORS[id]} onClick={() => setDistSubject(id)}>
              {name}
            </ChartFilterBtn>
          ))}
        </div>
        {distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={distribution} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b6565" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0b6565" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
              <XAxis dataKey="score" type="number" domain={[0, SUBJECT_FULL_SCORE[distSubject] || 100]} tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} label={{ value: '分数', position: 'insideBottomRight', offset: -4, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }} ticks={distSubject === 'SUBJ_GENERAL' ? [0, 20, 40, 60, 80, 100] : [0, 5, 10, 15, 20]} />
              <YAxis tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }} axisLine={{ stroke: 'rgba(11,101,101,0.08)' }} tickLine={false} label={{ value: '人数', angle: -90, position: 'insideTopLeft', offset: 16, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} labelFormatter={(label) => '分数: ' + label} />
              <Area type="monotone" dataKey="count" name="人数" stroke="#0b6565" strokeWidth={2} fill="url(#areaGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>
        )}
      </LiquidCard>
    </div>
  );
}