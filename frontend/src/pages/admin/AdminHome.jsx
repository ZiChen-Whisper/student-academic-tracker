import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Pencil, Trash2, User, ChevronRight, ChevronDown, Code } from 'lucide-react';
import WelcomeBanner from '../../components/WelcomeBanner';
import LiquidCard from '../../components/LiquidCard';
import MetricCard from '../../components/MetricCard';
import { useRole } from '../../contexts/RoleContext';
import { getOverview, getAlertStats, getClassStats, getChangeHistory } from '../../api';

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
  const [loading, setLoading] = useState(true);

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

    Promise.allSettled([p1, p2, p3, p4]).finally(() => setLoading(false));
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

      {/* 两栏布局：科目得分率 + 风险概览（精简版，无图表） */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
        {/* 各科目得分率 - 精简版 */}
        <LiquidCard title="各科目得分率">
          {subjectScoreRateData.length > 0 ? (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.25rem 0' }}>
              {subjectScoreRateData.map((item) => (
                <div key={item.subjectId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: 80 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#095050' }}>{item.scoreRate}%</span>
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.5)' }}>{item.subject}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '2rem 0' }}>暂无数据</p>
          )}
        </LiquidCard>

        {/* 风险概览 - 精简版 */}
        <LiquidCard title="风险概览">
          {riskData.length > 0 ? (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.25rem 0' }}>
              {riskData.map((item) => (
                <div key={item.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: 80 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: item.color }}>{item.value}</span>
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.5)' }}>{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-tertiary" style={{ textAlign: 'center', padding: '2rem 0' }}>暂无数据</p>
          )}
        </LiquidCard>
      </div>

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
