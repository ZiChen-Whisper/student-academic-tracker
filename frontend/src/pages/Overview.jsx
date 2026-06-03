import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import LiquidCard from '../components/LiquidCard';
import { getOverview, getScoreDistribution, getClassStats, getAlertStats } from '../api';

const SUBJECT_MAP = {
  SUBJ_MATH: '数学',
  SUBJ_PORTUGUESE: '葡萄牙语',
  SUBJ_GENERAL: '综合',
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        fontSize: '0.8125rem',
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>
      ))}
    </div>
  );
};

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOverview(), getScoreDistribution(), getClassStats(), getAlertStats()])
      .then(([ovRes, distRes, csRes, alRes]) => {
        setOverview(ovRes.data);
        // distribution API 返回 { value: [{ count, score_range }], Count } 或直接数组
        const distData = distRes.data?.value || distRes.data?.data || (Array.isArray(distRes.data) ? distRes.data : []);
        setDistribution(distData);
        setClassStats(csRes.data?.data || (Array.isArray(csRes.data) ? csRes.data : []));
        setAlertStats(alRes.data);
      })
      .catch((err) => {
        console.error('获取学情概览数据失败:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // 计算及格率：从 classStats 加权
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

  // 各科目平均成绩：按科目聚合加权平均
  const subjectAvgData = (() => {
    const map = {};
    classStats.forEach((item) => {
      const subj = item.subject_id || '未知';
      if (!map[subj]) map[subj] = { totalScore: 0, totalCount: 0 };
      map[subj].totalScore += (item.avg_score || 0) * (item.student_count || 0);
      map[subj].totalCount += item.student_count || 0;
    });
    return Object.entries(map).map(([key, val]) => ({
      subject: SUBJECT_MAP[key] || key,
      avgScore: val.totalCount ? +(val.totalScore / val.totalCount).toFixed(1) : 0,
    }));
  })();

  // 风险等级分布饼图数据
  const riskData = (() => {
    if (!alertStats) return [];
    const stats = alertStats.stats || alertStats;
    return [
      { name: RISK_LABELS.low, value: stats.low || 0, key: 'low' },
      { name: RISK_LABELS.medium, value: stats.medium || 0, key: 'medium' },
      { name: RISK_LABELS.high, value: stats.high || 0, key: 'high' },
    ].filter((d) => d.value > 0);
  })();

  // 预警总数
  const totalAlerts = riskData.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-tertiary">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>学情概览</h1>

      {/* 指标卡片 */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.25rem' }}>
        <MetricCard icon="users" label="学生总数" value={overview?.total_students ?? '--'} />
        <MetricCard icon="trend" label="平均成绩" value={overview?.average_score != null ? Number(overview.average_score).toFixed(1) : '--'} />
        <MetricCard icon="alert" label="高风险学生" value={overview?.high_risk_count ?? '--'} color="danger" />
        <MetricCard icon="check" label="及格率" value={passRate} color="success" />
      </div>

      {/* 图表区：各科目平均成绩 + 风险等级分布 */}
      <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.25rem' }}>
        {/* 各科目平均成绩柱状图 */}
        <LiquidCard title="各科目平均成绩">
          {subjectAvgData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjectAvgData} margin={{ top: 8, right: 8, bottom: 4, left: -10 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b6565" />
                    <stop offset="100%" stopColor="rgba(11,101,101,0.3)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(11,101,101,0.04)' }} />
                <Bar
                  dataKey="avgScore"
                  name="平均成绩"
                  fill="url(#barGradient)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>
          )}
        </LiquidCard>

        {/* 风险等级分布饼图 */}
        <LiquidCard title="风险等级分布">
          {riskData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 220, height: 220 }}>
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskData.map((entry) => (
                        <Cell key={entry.key} fill={RISK_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* 中心镂空：显示预警总数 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#095050', lineHeight: 1.2 }}>
                    {totalAlerts}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.45)' }}>预警总数</span>
                </div>
              </div>
              {/* 底部图例 */}
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                {riskData.map((entry) => (
                  <div key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'rgba(11,101,101,0.65)' }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: RISK_COLORS[entry.key],
                        flexShrink: 0,
                      }}
                    />
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

      {/* 成绩分布直方图 */}
      <LiquidCard title="成绩分布">
        {distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 4, left: -10 }}>
              <defs>
                <linearGradient id="distBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b6565" />
                  <stop offset="100%" stopColor="rgba(11,101,101,0.3)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
              <XAxis
                dataKey="score_range"
                tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(11,101,101,0.04)' }} />
              <Bar
                dataKey="count"
                name="人数"
                fill="url(#distBarGradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>
        )}
      </LiquidCard>
    </div>
  );
}
