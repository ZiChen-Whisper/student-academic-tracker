import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

// 科目满分映射
const SUBJECT_FULL_SCORE = {
  SUBJ_MATH: 20,
  SUBJ_PORTUGUESE: 20,
  SUBJ_GENERAL: 100,
};
import MetricCard from '../components/MetricCard';
import LiquidCard from '../components/LiquidCard';
import ChartTooltip from '../components/ChartTooltip';
import ChartFilterBtn from '../components/ChartFilterBtn';
import { getOverview, getScoreDistribution, getClassStats, getAlertStats } from '../api';

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

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distSubject, setDistSubject] = useState('SUBJ_GENERAL');

  useEffect(() => {
    Promise.all([getOverview(), getScoreDistribution({ subject_id: 'SUBJ_GENERAL', granularity: 1 }), getClassStats(), getAlertStats()])
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

  // 科目切换时重新请求成绩分布
  useEffect(() => {
    if (loading) return;
    getScoreDistribution({ subject_id: distSubject, granularity: 1 })
      .then((res) => {
        const distData = res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDistribution(distData);
      })
      .catch((err) => console.error('获取成绩分布失败:', err));
  }, [distSubject]);

  // 计算及格率：基于得分率>=60%（20分制>=12分，100分制>=60分）
  const passRate = (() => {
    if (!classStats.length) return '--';
    let totalPass = 0;
    let totalStudents = 0;
    classStats.forEach((item) => {
      const count = item.student_count || 0;
      const fullScore = SUBJECT_FULL_SCORE[item.subject_id] || 100;
      const passLine = fullScore * 0.6;
      const avgScore = item.avg_score || 0;
      // 使用后端返回的 pass_rate（已按科目分制区分及格线）
      const rate = (item.pass_rate || 0) / 100;
      totalPass += count * rate;
      totalStudents += count;
    });
    if (totalStudents === 0) return '--';
    return ((totalPass / totalStudents) * 100).toFixed(1) + '%';
  })();

  // 各科目得分率：按科目聚合加权平均后换算为得分率
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
      return {
        subject: SUBJECT_MAP[key] || key,
        subjectId: key,
        avgScore,
        fullScore,
        scoreRate,
      };
    });
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
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.25rem' }}>
        <MetricCard icon="users" label="学生总数" value={overview?.total_students ?? '--'} />
        <MetricCard icon="trend" label="平均得分率" value={overview?.average_score_rate != null ? Number(overview.average_score_rate).toFixed(1) + '%' : '--'} />
        <MetricCard icon="alert" label="高风险学生" value={overview?.high_risk_count ?? '--'} color="danger" />
        <MetricCard icon="check" label="及格率" value={passRate} color="success" />
      </div>

      {/* 图表区：各科目平均成绩 + 风险等级分布 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 各科目得分率 */}
        <LiquidCard title="各科目得分率">
          {subjectScoreRateData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              {subjectScoreRateData.map((item) => (
                <div key={item.subjectId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#095050' }}>{item.subject}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.5)' }}>
                      平均 {item.avgScore} / {item.fullScore}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ flex: 1, height: 20, background: 'rgba(11,101,101,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.scoreRate}%`,
                          background: 'linear-gradient(90deg, #0b6565, rgba(11,101,101,0.5))',
                          borderRadius: 10,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0b6565', minWidth: 48, textAlign: 'right' }}>
                      {item.scoreRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* 中心镂空：显示预警总数 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                >
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#095050', lineHeight: 1.2, textShadow: '0 0 8px rgba(255,255,255,0.9)' }}>
                    {totalAlerts}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'rgba(11,101,101,0.45)', textShadow: '0 0 8px rgba(255,255,255,0.9)' }}>预警总数</span>
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

      {/* 成绩分布面积图 */}
      <LiquidCard title="成绩分布">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {Object.entries(SUBJECT_MAP).map(([id, name]) => (
            <ChartFilterBtn
              key={id}
              active={distSubject === id}
              color={SUBJECT_COLORS[id]}
              onClick={() => setDistSubject(id)}
            >
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
              <XAxis
                dataKey="score"
                type="number"
                domain={[0, SUBJECT_FULL_SCORE[distSubject] || 100]}
                tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                tickLine={false}
                label={{ value: '分数', position: 'insideBottomRight', offset: -4, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }}
                ticks={distSubject === 'SUBJ_GENERAL' ? [0, 20, 40, 60, 80, 100] : [0, 5, 10, 15, 20]}
              />
              <YAxis
                tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                tickLine={false}
                label={{ value: '人数', angle: -90, position: 'insideTopLeft', offset: 16, fill: 'rgba(11,101,101,0.4)', fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} labelFormatter={(label) => `分数: ${label}`} />
              <Area
                type="monotone"
                dataKey="count"
                name="人数"
                stroke="#0b6565"
                strokeWidth={2}
                fill="url(#areaGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>暂无数据</p>
        )}
      </LiquidCard>
    </div>
  );
}
