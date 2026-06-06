import React, { useState, useEffect } from 'react';
import WelcomeBanner from '../../components/WelcomeBanner';
import LiquidCard from '../../components/LiquidCard';
import MetricCard from '../../components/MetricCard';
import { useRole } from '../../contexts/RoleContext';
import { getOverview, getAlertStats, getClassStats } from '../../api';

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

export default function TeacherHome() {
  const { selectedTeacherClassId, selectedTeacherId, selectedTeacherName } = useRole();
  const classId = selectedTeacherClassId || '';
  const [overview, setOverview] = useState(null);
  const [alertStats, setAlertStats] = useState(null);
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = classId ? { class_id: classId } : {};

    const p1 = getOverview(params)
      .then((res) => setOverview(res.data))
      .catch((err) => console.error('加载概览数据失败:', err));

    const p2 = getAlertStats(params)
      .then((res) => setAlertStats(res.data))
      .catch((err) => console.error('加载预警统计失败:', err));

    const p3 = getClassStats(params)
      .then((res) => setClassStats(res.data?.data || (Array.isArray(res.data) ? res.data : [])))
      .catch((err) => console.error('加载班级统计失败:', err));

    Promise.allSettled([p1, p2, p3]).finally(() => setLoading(false));
  }, [classId]);

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
        role="teacher"
        title={`${selectedTeacherName || ''}老师`}
        subtitle="班级学情数据一览"
        stats={[
          { value: overview?.total_students ?? '--', label: '学生总数' },
          { value: overview?.high_risk_count ?? '--', label: '高风险', color: 'var(--danger)' },
          { value: passRate, label: '及格率', color: 'var(--success)' },
        ]}
      />

      {/* 核心指标 */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.25rem' }}>
        <MetricCard icon="users" label="学生总数" value={overview?.total_students ?? '--'} />
        <MetricCard icon="trend" label="平均得分率" value={overview?.average_score_rate != null ? Number(overview.average_score_rate).toFixed(1) + '%' : '--'} />
        <MetricCard icon="alert" label="高风险学生" value={overview?.high_risk_count ?? '--'} color="danger" />
        <MetricCard icon="check" label="及格率" value={passRate} color="success" />
      </div>

      {/* 两栏布局：科目得分率 + 风险概览 */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 各科目得分率 */}
        <LiquidCard title="各科目得分率">
          {subjectScoreRateData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              {subjectScoreRateData.map((item) => (
                <div key={item.subjectId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#095050' }}>{item.subject}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.5)' }}>平均 {item.avgScore} / {item.fullScore}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ flex: 1, height: 20, background: 'rgba(11,101,101,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.scoreRate}%`, background: 'linear-gradient(90deg, #0b6565, rgba(11,101,101,0.5))', borderRadius: 10, transition: 'width 0.6s' }} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0b6565', minWidth: 48, textAlign: 'right' }}>{item.scoreRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '2rem 0' }}>暂无数据</p>
          )}
        </LiquidCard>

        {/* 风险概览 */}
        <LiquidCard title="风险概览">
          {riskData.length > 0 ? (() => {
            const totalRisk = riskData.reduce((s, d) => s + d.value, 0);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                {riskData.map((item) => {
                  const pct = totalRisk > 0 ? ((item.value / totalRisk) * 100).toFixed(1) : 0;
                  return (
                    <div key={item.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: item.color }}>{item.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.5)' }}>{item.value} 人</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ flex: 1, height: 20, background: 'rgba(11,101,101,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`, borderRadius: 10, transition: 'width 0.6s' }} />
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: item.color, minWidth: 48, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '2rem 0' }}>暂无数据</p>
          )}
        </LiquidCard>
      </div>
    </div>
  );
}
