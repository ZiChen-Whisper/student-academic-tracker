import { useState, useCallback, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Search, User, BookOpen, Home, AlertTriangle, Sparkles, Clock, Brain, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import MetricCard from '../../components/MetricCard';
import ChartTooltip from '../../components/ChartTooltip';
import ChartFilterBtn from '../../components/ChartFilterBtn';
import { useRole } from '../../contexts/RoleContext';
import {
  getStudents, getStudent, getScoreTrend, getSuggestions, generateSuggestion,
  getAlerts, updateSuggestionFeedback,
} from '../../api';

const SUBJECT_MAP = {
  SUBJ_MATH: '数学',
  SUBJ_PORTUGUESE: '葡萄牙语',
  SUBJ_GENERAL: '综合',
};

const SUBJECT_COLORS = {
  SUBJ_MATH: '#0b6565',
  SUBJ_PORTUGUESE: '#c9933a',
  SUBJ_GENERAL: '#1a8a5a',
};

const FAMILY_VALUE_MAP = {
  'Primary': '小学', '小学': '小学',
  'Middle School': '初中', '初中': '初中',
  'High School': '高中', '高中': '高中',
  'College': '大学', '大学': '大学',
  'Postgraduate': '研究生',
  'None': '无', '无': '无',
  'at_home': '居家', 'health': '医疗', 'other': '其他',
  'services': '服务业', 'teacher': '教师',
  'High': '高', 'Medium': '中', 'Low': '低',
  'yes': '是', 'no': '否',
};

const TABS = [
  { key: 'score', label: '成绩趋势', icon: BookOpen },
  { key: 'behavior', label: '学习行为', icon: Brain },
  { key: 'family', label: '家庭背景', icon: Home },
  { key: 'alert', label: '预警与建议', icon: AlertTriangle },
];

// 风险等级标签
const RiskBadge = ({ level }) => {
  const cls = level === 'high' ? 'risk-high' : level === 'medium' ? 'risk-medium' : 'risk-low';
  const label = level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险';
  return <span className={`risk-badge ${cls}`}>{label}</span>;
};

// 排序方向
const SORT_DIR = { asc: 'asc', desc: 'desc' };

export default function AdminStudent() {
  const { selectedAdminId, selectedAdminName } = useRole();
  // 学生列表
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sortField, setSortField] = useState('student_id');
  const [sortDir, setSortDir] = useState(SORT_DIR.asc);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 学生详情浮窗
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('score');
  const [scoreData, setScoreData] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [alertData, setAlertData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [visibleSubjects, setVisibleSubjects] = useState(['SUBJ_MATH', 'SUBJ_PORTUGUESE', 'SUBJ_GENERAL']);

  // 加载所有学生
  useEffect(() => {
    setLoading(true);
    const params = {};
    getStudents(params)
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setStudents(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('获取学生列表失败:', err))
      .finally(() => setLoading(false));
  }, []);

  // 模糊搜索过滤
  const filteredStudents = students.filter((s) => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return (
      (s.student_name && s.student_name.toLowerCase().includes(kw)) ||
      (s.student_id && s.student_id.toLowerCase().includes(kw))
    );
  });

  // 排序
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let va = a[sortField] || '';
    let vb = b[sortField] || '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === SORT_DIR.asc ? -1 : 1;
    if (va > vb) return sortDir === SORT_DIR.asc ? 1 : -1;
    return 0;
  });

  // 分页
  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const pagedStudents = sortedStudents.slice((page - 1) * pageSize, page * pageSize);

  // 切换排序
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === SORT_DIR.asc ? SORT_DIR.desc : SORT_DIR.asc));
    } else {
      setSortField(field);
      setSortDir(SORT_DIR.asc);
    }
    setPage(1);
  };

  // 排序指示图标
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 2 }} />;
    return sortDir === SORT_DIR.asc
      ? <ArrowUp size={10} style={{ marginLeft: 2 }} />
      : <ArrowDown size={10} style={{ marginLeft: 2 }} />;
  };

  // 打开学生详情浮窗
  const handleOpenDetail = useCallback(async (student) => {
    setSelectedStudent(student);
    setDetailOpen(true);
    setActiveTab('score');
    setDetailLoading(true);

    try {
      const [studentRes, trendRes, alertsRes, suggestionsRes] = await Promise.all([
        getStudent(student.student_id),
        getScoreTrend(student.student_id),
        getAlerts({ student_id: student.student_id }),
        getSuggestions(student.student_id),
      ]);

      const studentDetail = studentRes.data;
      setBehaviorData(studentDetail.behavior || null);
      setFamilyData(studentDetail.family || null);

      const scores = trendRes.data?.scores || [];
      setScoreData(scores);

      const studentAlerts = Array.isArray(alertsRes.data) ? alertsRes.data : [];
      setAlertData(studentAlerts);

      setSuggestions(suggestionsRes.data || []);
    } catch (err) {
      console.error('加载学生详情失败:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 关闭浮窗
  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedStudent(null);
    setScoreData(null);
    setBehaviorData(null);
    setFamilyData(null);
    setAlertData(null);
    setSuggestions([]);
  };

  // 生成学习建议
  const handleGenerateSuggestion = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      await generateSuggestion(selectedStudent.student_id, { operator_role: 'admin', operator_name: selectedAdminName || '管理员', operator_id: selectedAdminId || '' });
      const res = await getSuggestions(selectedStudent.student_id);
      setSuggestions(res.data || []);
    } catch (err) {
      console.error('生成建议失败:', err);
    } finally {
      setGenerating(false);
    }
  };

  // 提交建议反馈
  const handleFeedback = async (suggestionId, feedback) => {
    try {
      await updateSuggestionFeedback(suggestionId, { feedback });
      setSuggestions((prev) =>
        prev.map((s) =>
          s.suggestion_id === suggestionId ? { ...s, student_feedback: feedback } : s
        )
      );
    } catch (err) {
      console.error('反馈提交失败:', err);
    }
  };

  // 成绩趋势数据按科目分组
  const chartDataBySubject = (() => {
    if (!scoreData || !scoreData.length) return {};
    const map = {};
    scoreData.forEach((item) => {
      const subj = item.subject_id;
      if (!map[subj]) map[subj] = [];
      map[subj].push({ exam_stage: item.exam_stage, score: item.score });
    });
    return map;
  })();

  const mergedChartData = (() => {
    if (!scoreData || !scoreData.length) return [];
    const stages = ['G1', 'G2', 'G3'];
    const subjects = Object.keys(chartDataBySubject);
    return stages.map((stage) => {
      const row = { exam_stage: stage };
      subjects.forEach((subj) => {
        const found = chartDataBySubject[subj]?.find((s) => s.exam_stage === stage);
        row[subj] = found ? found.score : null;
      });
      return row;
    });
  })();

  return (
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>学生详情</h1>

      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'nowrap' }}>
        <input
          className="liquid-input"
          placeholder="输入学生姓名或ID搜索..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          style={{ flex: '1 1 0%', maxWidth: 400, minWidth: 120 }}
        />
        <span className="text-tertiary" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
          共 {filteredStudents.length} 名学生
        </span>
      </div>

      {/* 学生列表 */}
      <LiquidCard style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p className="text-tertiary">加载中...</p>
          </div>
        ) : pagedStudents.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="liquid-table">
                <thead>
                  <tr>
                    <th className="sortable-th" onClick={() => handleSort('student_id')}>
                      学生ID <SortIcon field="student_id" />
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('student_name')}>
                      姓名 <SortIcon field="student_name" />
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('student_gender')}>
                      性别 <SortIcon field="student_gender" />
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('student_age')}>
                      年龄 <SortIcon field="student_age" />
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('student_class_id')}>
                      班级 <SortIcon field="student_class_id" />
                    </th>
                    <th style={{ width: 80 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStudents.map((s) => (
                    <tr key={s.student_id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(s)}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{s.student_id}</td>
                      <td style={{ fontWeight: 500 }}>{s.student_name || '--'}</td>
                      <td>{s.student_gender === 'M' ? '男' : s.student_gender === 'F' ? '女' : s.student_gender || '--'}</td>
                      <td>{s.student_age ?? '--'}</td>
                      <td>{s.student_class_id || '--'}</td>
                      <td>
                        <button
                          className="liquid-btn liquid-btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleOpenDetail(s); }}
                          title="查看详情"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem' }}
                        >
                          <User size={12} />
                          <span className="btn-label">详情</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderTop: '0.5px solid rgba(11,101,101,0.05)',
              }}>
                <button
                  className="liquid-btn liquid-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </button>
                <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>
                  {page} / {totalPages}
                </span>
                <button
                  className="liquid-btn liquid-btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <User size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary">
              {keyword ? '未找到匹配的学生' : '暂无学生数据'}
            </p>
          </div>
        )}
      </LiquidCard>

      {/* ===== 学生详情浮窗 ===== */}
      {detailOpen && selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={closeDetail}
        >
          {/* 遮罩层 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          />
          {/* 浮窗内容 */}
          <div
            className="liquid-scroll"
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(24px)',
              border: '0.5px solid rgba(11,101,101,0.08)',
              borderRadius: 16,
              padding: '1.75rem',
              width: 720,
              height: 560,
              maxWidth: '90vw',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={closeDetail}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(11,101,101,0.35)',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                transition: 'all 0.15s',
                zIndex: 10,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}
            >
              <X size={18} />
            </button>

            {/* 学生信息头部 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="liquid-avatar" style={{ width: 48, height: 48, fontSize: '1.125rem' }}>
                {selectedStudent.student_name?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1a2b2b' }}>
                  {selectedStudent.student_name || '--'}
                </div>
                <div className="text-tertiary" style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                  学号：{selectedStudent.student_id}
                  {selectedStudent.student_gender && ` · 性别：${selectedStudent.student_gender === 'M' ? '男' : selectedStudent.student_gender === 'F' ? '女' : selectedStudent.student_gender}`}
                  {selectedStudent.student_age && ` · 年龄：${selectedStudent.student_age}`}
                  {selectedStudent.student_class_id && ` · 班级：${selectedStudent.student_class_id}`}
                </div>
              </div>
              {alertData && alertData.length > 0 && (
                <div style={{ marginLeft: 'auto' }}>
                  <RiskBadge level={alertData.reduce((worst, a) => {
                    const order = { high: 3, medium: 2, low: 1 };
                    return order[a.risk_level] > order[worst] ? a.risk_level : worst;
                  }, 'low')} />
                </div>
              )}
            </div>

            {/* Tab 切换 */}
            <div className="liquid-tabs" style={{ marginBottom: '1.25rem' }}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    className={`liquid-tab ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <Icon size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.25rem' }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* 加载状态 */}
            {detailLoading && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p className="text-tertiary">加载中...</p>
              </div>
            )}

            {/* Tab 内容 */}
            {!detailLoading && activeTab === 'score' && (
              <LiquidCard title="成绩趋势">
                {mergedChartData.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {Object.keys(SUBJECT_MAP).map((subj) => (
                        <ChartFilterBtn
                          key={subj}
                          mode="multi"
                          active={visibleSubjects.includes(subj)}
                          color={SUBJECT_COLORS[subj]}
                          onClick={() => {
                            setVisibleSubjects((prev) =>
                              prev.includes(subj)
                                ? prev.filter((s) => s !== subj)
                                : [...prev, subj]
                            );
                          }}
                        >
                          {SUBJECT_MAP[subj]}
                        </ChartFilterBtn>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={mergedChartData} margin={{ top: 8, right: 16, bottom: 4, left: -10 }}>
                        <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
                        <XAxis
                          dataKey="exam_stage"
                          tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                          axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: 'rgba(11,101,101,0.35)', fontSize: 12 }}
                          axisLine={{ stroke: 'rgba(11,101,101,0.08)' }}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          formatter={(value) => SUBJECT_MAP[value] || value}
                          wrapperStyle={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.65)' }}
                        />
                        {Object.keys(chartDataBySubject)
                          .filter((subj) => visibleSubjects.includes(subj))
                          .map((subj, idx) => (
                          <Line
                            key={subj}
                            type="monotone"
                            dataKey={subj}
                            name={subj}
                            stroke={SUBJECT_COLORS[subj] || (idx === 0 ? '#0b6565' : '#c9933a')}
                            strokeWidth={2}
                            dot={{ r: 4, fill: SUBJECT_COLORS[subj] || '#0b6565', stroke: '#fff', strokeWidth: 1.5 }}
                            activeDot={{ r: 6 }}
                            strokeDasharray={idx > 0 ? '6 3' : undefined}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>
                    暂无成绩数据
                  </p>
                )}
              </LiquidCard>
            )}

            {!detailLoading && activeTab === 'behavior' && (
              <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <MetricCard
                  icon="check"
                  label="出勤率"
                  value={behaviorData?.attendance_rate != null ? `${behaviorData.attendance_rate}%` : '--'}
                  color={behaviorData?.attendance_rate != null && behaviorData.attendance_rate < 80 ? 'danger' : 'default'}
                />
                <MetricCard
                  icon="clock"
                  label="学习时长"
                  value={behaviorData?.study_hours != null ? <>{behaviorData.study_hours}h<span style={{ fontSize: '0.75em', opacity: 0.6 }}>/周</span></> : '--'}
                />
                <MetricCard
                  icon="moon"
                  label="睡眠时长"
                  value={behaviorData?.sleep_hours != null ? <>{behaviorData.sleep_hours}h<span style={{ fontSize: '0.75em', opacity: 0.6 }}>/天</span></> : '--'}
                />
                <MetricCard
                  icon="brain"
                  label="动机水平"
                  value={behaviorData?.motivation_level === 'Low' ? '低' : behaviorData?.motivation_level === 'Medium' ? '中' : behaviorData?.motivation_level === 'High' ? '高' : behaviorData?.motivation_level || '--'}
                  color={
                    behaviorData?.motivation_level === 'Low' ? 'danger' :
                    behaviorData?.motivation_level === 'Medium' ? 'warning' :
                    behaviorData?.motivation_level === 'High' ? 'success' : 'default'
                  }
                />
                <MetricCard
                  icon="grad"
                  label="辅导次数"
                  value={behaviorData?.tutoring_sessions != null ? `${behaviorData.tutoring_sessions}次` : '--'}
                />
                <MetricCard
                  icon="wifi"
                  label="网络接入"
                  value={behaviorData?.internet_access === 'Yes' ? '是' : behaviorData?.internet_access === 'No' ? '否' : behaviorData?.internet_access || '--'}
                  color={behaviorData?.internet_access === 'Yes' ? 'success' : behaviorData?.internet_access === 'No' ? 'danger' : 'default'}
                />
              </div>
            )}

            {!detailLoading && activeTab === 'family' && (
              <LiquidCard title="家庭背景信息">
                {familyData && Object.keys(familyData).length > 0 ? (
                  <table className="liquid-table">
                    <thead>
                      <tr>
                        <th>项目</th>
                        <th>信息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: '父亲教育', key: 'father_edu' },
                        { label: '母亲教育', key: 'mother_edu' },
                        { label: '父亲职业', key: 'father_job' },
                        { label: '母亲职业', key: 'mother_job' },
                        { label: '家庭收入', key: 'family_income' },
                        { label: '家庭支持', key: 'family_support' },
                        { label: '家长参与度', key: 'parental_involvement' },
                        { label: '家庭关系评分', key: 'fam_rel' },
                      ]
                        .filter((item) => familyData[item.key] != null && familyData[item.key] !== '')
                        .map((item) => (
                          <tr key={item.key}>
                            <td style={{ fontWeight: 500, color: 'rgba(11,101,101,0.65)', width: '40%' }}>
                              {item.label}
                            </td>
                            <td>{FAMILY_VALUE_MAP[familyData[item.key]] || String(familyData[item.key])}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>
                    暂无家庭背景数据
                  </p>
                )}
              </LiquidCard>
            )}

            {!detailLoading && activeTab === 'alert' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 预警信息 */}
                <LiquidCard title="预警信息">
                  {alertData && alertData.length > 0 ? (
                    <div>
                      {alertData.map((alert) => {
                        const riskColor = alert.risk_level === 'high' ? '#c0392b' : alert.risk_level === 'medium' ? '#d4880f' : '#1a8a5a';
                        const riskLabel = alert.risk_level === 'high' ? '高风险' : alert.risk_level === 'medium' ? '中风险' : '低风险';
                        const statusLabel = alert.intervention_status === 'completed' ? '已完成' : alert.intervention_status === 'in_progress' ? '进行中' : '待处理';
                        const statusColor = alert.intervention_status === 'completed' ? '#1a8a5a' : alert.intervention_status === 'in_progress' ? '#d4880f' : 'rgba(11,101,101,0.45)';

                        return (
                          <div
                            key={alert.alert_id}
                            style={{
                              display: 'flex',
                              marginBottom: '0.5rem',
                              borderRadius: '0.5rem',
                              overflow: 'hidden',
                              border: '0.5px solid rgba(11,101,101,0.06)',
                              background: 'rgba(11,101,101,0.015)',
                            }}
                          >
                            <div style={{ width: 3, flexShrink: 0, background: riskColor, borderRadius: '3px 0 0 3px' }} />
                            <div style={{ flex: 1, padding: '0.75rem 0.875rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: riskColor }}>{riskLabel}</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: statusColor }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                                  {statusLabel}
                                </span>
                                <span style={{ flex: 1 }} />
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  <Clock size={9} />
                                  {alert.alert_time ? new Date(alert.alert_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                                </span>
                              </div>
                              {alert.risk_factors && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: alert.intervention_measure ? '0.375rem' : 0 }}>
                                  {(() => {
                                    try {
                                      const factors = typeof alert.risk_factors === 'string' ? JSON.parse(alert.risk_factors) : alert.risk_factors;
                                      const arr = Array.isArray(factors) ? factors : [String(factors)];
                                      return arr.map((f, i) => (
                                        <span key={i} style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)' }}>{f}</span>
                                      ));
                                    } catch {
                                      return <span style={{ fontSize: '0.6875rem', padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: 'rgba(11,101,101,0.04)', color: 'rgba(11,101,101,0.6)' }}>{String(alert.risk_factors)}</span>;
                                    }
                                  })()}
                                </div>
                              )}
                              {alert.intervention_measure && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--primary)', padding: '0.25rem 0.5rem', background: 'rgba(11,101,101,0.03)', borderRadius: '0.25rem', borderLeft: '2px solid var(--primary)' }}>
                                  {alert.intervention_measure}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-tertiary" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      该学生暂无预警记录
                    </p>
                  )}
                </LiquidCard>

                {/* 学习建议 */}
                <LiquidCard>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                    <h2 style={{ margin: 0 }}>AI 学习建议</h2>
                    <button
                      className={generating ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'}
                      onClick={handleGenerateSuggestion}
                      disabled={generating}
                    >
                      <Sparkles size={14} />
                      <span className="btn-label">{generating ? 'AI 生成中...' : '生成学习建议'}</span>
                    </button>
                  </div>

                  {suggestions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {suggestions.map((s) => (
                        <div
                          key={s.suggestion_id}
                          style={{
                            padding: '1rem',
                            background: 'rgba(11,101,101,0.02)',
                            borderRadius: '0.625rem',
                            border: '0.5px solid rgba(11,101,101,0.06)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'rgba(11,101,101,0.35)', whiteSpace: 'nowrap' }}>
                              <Clock size={9} />
                              {s.generate_time ? new Date(s.generate_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                            </span>
                            {s.student_feedback && (
                              <span style={{
                                fontSize: '0.6875rem',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                background: s.student_feedback === 'satisfied' ? 'rgba(26,138,90,0.08)' : s.student_feedback === 'unsatisfied' ? 'rgba(192,57,43,0.08)' : 'rgba(11,101,101,0.06)',
                                color: s.student_feedback === 'satisfied' ? 'var(--success)' : s.student_feedback === 'unsatisfied' ? 'var(--danger)' : 'rgba(11,101,101,0.65)',
                              }}>
                                {s.student_feedback === 'satisfied' ? '满意' : s.student_feedback === 'unsatisfied' ? '不满意' : '一般'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {s.suggestion_content}
                          </div>
                          {!s.student_feedback && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                              <button className="liquid-btn liquid-btn-sm" style={{ color: 'var(--success)', borderColor: 'rgba(26,138,90,0.15)' }} onClick={() => handleFeedback(s.suggestion_id, 'satisfied')}>满意</button>
                              <button className="liquid-btn liquid-btn-sm" onClick={() => handleFeedback(s.suggestion_id, 'neutral')}>一般</button>
                              <button className="liquid-btn liquid-btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.15)' }} onClick={() => handleFeedback(s.suggestion_id, 'unsatisfied')}>不满意</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-tertiary" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      暂无学习建议，点击上方按钮生成
                    </p>
                  )}
                </LiquidCard>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
