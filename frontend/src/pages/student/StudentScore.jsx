import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine, Cell,
} from 'recharts';
import { BookOpen, TrendingUp, ArrowUp, ArrowDown, Minus, BarChart3, User, Target } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import ChartTooltip from '../../components/ChartTooltip';
import ChartFilterBtn from '../../components/ChartFilterBtn';
import { useRole } from '../../contexts/RoleContext';
import { getStudent, getScoreTrend, getClassStats, getScoreDistribution } from '../../api';

const SUBJECT_MAP = { SUBJ_MATH: '数学', SUBJ_PORTUGUESE: '葡萄牙语', SUBJ_GENERAL: '综合' };
const SUBJECT_COLORS = { SUBJ_MATH: '#0b6565', SUBJ_PORTUGUESE: '#c9933a', SUBJ_GENERAL: '#1a8a5a' };
const SUBJECT_FULL_SCORE = { SUBJ_MATH: 20, SUBJ_PORTUGUESE: 20, SUBJ_GENERAL: 100 };
const STAGE_ORDER = { G1: 1, G2: 2, G3: 3 };

const AXIS_TICK = { fill: 'rgba(11,101,101,0.35)', fontSize: 12 };
const AXIS_LINE = { stroke: 'rgba(11,101,101,0.08)' };

export default function StudentScore() {
  const { selectedStudentId, selectedStudentName } = useRole();

  const [studentInfo, setStudentInfo] = useState(null);
  const [scoreData, setScoreData] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 趋势图科目筛选
  const [visibleSubjects, setVisibleSubjects] = useState(['SUBJ_MATH', 'SUBJ_PORTUGUESE', 'SUBJ_GENERAL']);
  // 分布图科目筛选（单选）
  const [distSubject, setDistSubject] = useState('SUBJ_GENERAL');

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);

    // 先获取学生信息以拿到 class_id
    getStudent(selectedStudentId)
      .then((studentRes) => {
        const info = studentRes.data;
        setStudentInfo(info);
        const classId = info?.student_class_id;
        if (!classId) {
          setScoreData([]);
          setClassStats([]);
          setDistributionData([]);
          setLoading(false);
          return;
        }

        // 并行获取成绩趋势、班级统计、成绩分布
        Promise.allSettled([
          getScoreTrend(selectedStudentId),
          getClassStats({ class_id: classId }),
          getScoreDistribution({ subject_id: distSubject, class_id: classId, granularity: 1 }),
        ]).then(([trendRes, statsRes, distRes]) => {
          if (trendRes.status === 'fulfilled') {
            setScoreData(trendRes.value.data?.scores || []);
          }
          if (statsRes.status === 'fulfilled') {
            const raw = statsRes.value.data;
            setClassStats(Array.isArray(raw) ? raw : (raw?.data || []));
          }
          if (distRes.status === 'fulfilled') {
            const raw = distRes.value.data;
            setDistributionData(Array.isArray(raw) ? raw : (raw?.data || []));
          }
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error('加载学生数据失败:', err);
        setLoading(false);
      });
  }, [selectedStudentId, distSubject]);

  // 成绩趋势合并数据：{ exam_stage, SUBJ_MATH: rate, SUBJ_PORTUGUESE: rate, SUBJ_GENERAL: rate }
  const mergedChartData = useMemo(() => {
    if (!scoreData.length) return [];
    const stages = ['G1', 'G2', 'G3'];
    const subjects = Object.keys(SUBJECT_MAP);
    return stages.map((stage) => {
      const row = { exam_stage: stage };
      subjects.forEach((subj) => {
        const found = scoreData.find((s) => s.subject_id === subj && s.exam_stage === stage);
        row[subj] = found ? +(found.score / (SUBJECT_FULL_SCORE[subj] || 100) * 100).toFixed(1) : null;
      });
      return row;
    });
  }, [scoreData]);

  // 班级均值参考线数据：按科目和阶段分组
  const classAvgBySubject = useMemo(() => {
    const map = {};
    classStats.forEach((s) => {
      const subj = s.subject_id;
      if (!map[subj]) map[subj] = {};
      const rate = s.avg_score != null ? +(s.avg_score / (SUBJECT_FULL_SCORE[subj] || 100) * 100).toFixed(1) : null;
      map[subj][s.exam_stage] = rate;
    });
    return map;
  }, [classStats]);

  // 成绩分布图数据处理
  const distributionChartData = useMemo(() => {
    if (!distributionData.length) return [];
    // distributionData 预期格式: [{ score_range, count }] 或 [{ score, count }]
    return distributionData.map((d) => ({
      score: d.score_range || d.score,
      count: d.count || 0,
    }));
  }, [distributionData]);

  // 学生在分布图中的位置高亮 & 百分位
  const studentScoreInfo = useMemo(() => {
    if (!scoreData.length || !distributionChartData.length) return { highlightScore: null, percentile: null };
    // 找到当前选中科目的最新成绩
    const subjScores = scoreData
      .filter((s) => s.subject_id === distSubject)
      .sort((a, b) => (STAGE_ORDER[b.exam_stage] || 0) - (STAGE_ORDER[a.exam_stage] || 0));
    const latestScore = subjScores[0]?.score;
    if (latestScore == null) return { highlightScore: null, percentile: null };

    // 计算百分位：分数 <= 学生分数的人数 / 总人数
    let totalStudents = 0;
    let belowOrEqual = 0;
    distributionChartData.forEach((d) => {
      const scoreVal = parseFloat(d.score);
      if (isNaN(scoreVal)) return;
      totalStudents += d.count;
      if (scoreVal <= latestScore) belowOrEqual += d.count;
    });

    const percentile = totalStudents > 0 ? Math.round((belowOrEqual / totalStudents) * 100) : null;
    return { highlightScore: latestScore, percentile };
  }, [scoreData, distributionChartData, distSubject]);

  // 雷达图数据：5 维度
  const radarData = useMemo(() => {
    if (!scoreData.length) return [];

    // 学生各科得分率
    const studentRates = {};
    Object.keys(SUBJECT_MAP).forEach((subj) => {
      const subjScores = scoreData
        .filter((s) => s.subject_id === subj)
        .sort((a, b) => (STAGE_ORDER[b.exam_stage] || 0) - (STAGE_ORDER[a.exam_stage] || 0));
      const latest = subjScores[0];
      studentRates[subj] = latest ? +(latest.score / (SUBJECT_FULL_SCORE[subj] || 100) * 100).toFixed(1) : 0;
    });

    // 班级均值得分率
    const classRates = {};
    Object.keys(SUBJECT_MAP).forEach((subj) => {
      const subjStats = classStats
        .filter((s) => s.subject_id === subj)
        .sort((a, b) => (STAGE_ORDER[b.exam_stage] || 0) - (STAGE_ORDER[a.exam_stage] || 0));
      const latest = subjStats[0];
      classRates[subj] = latest && latest.avg_score != null
        ? +(latest.avg_score / (SUBJECT_FULL_SCORE[subj] || 100) * 100).toFixed(1)
        : 0;
    });

    // 出勤率 & 学习时长（归一化到 0-100）
    const attendanceRate = studentInfo?.attendance_rate != null
      ? +((studentInfo.attendance_rate > 1 ? studentInfo.attendance_rate : studentInfo.attendance_rate * 100)).toFixed(1)
      : 0;
    const studyHours = studentInfo?.study_hours != null
      ? Math.min(100, +((studentInfo.study_hours / 40) * 100).toFixed(1)) // 假设 40 小时为满分
      : 0;

    // 班级出勤率 & 学习时长均值
    const classAttendance = classStats.length > 0
      ? (classStats.reduce((sum, s) => sum + (s.avg_attendance_rate || 0), 0) / classStats.length)
      : 0;
    const classAttendanceRate = classAttendance > 0
      ? +(classAttendance > 1 ? classAttendance : classAttendance * 100).toFixed(1)
      : 0;
    const classStudyHours = classStats.length > 0
      ? Math.min(100, +((classStats.reduce((sum, s) => sum + (s.avg_study_hours || 0), 0) / classStats.length / 40) * 100).toFixed(1))
      : 0;

    return [
      { dimension: '数学', student: studentRates.SUBJ_MATH || 0, classAvg: classRates.SUBJ_MATH || 0 },
      { dimension: '葡萄牙语', student: studentRates.SUBJ_PORTUGUESE || 0, classAvg: classRates.SUBJ_PORTUGUESE || 0 },
      { dimension: '综合', student: studentRates.SUBJ_GENERAL || 0, classAvg: classRates.SUBJ_GENERAL || 0 },
      { dimension: '出勤率', student: attendanceRate, classAvg: classAttendanceRate },
      { dimension: '学习时长', student: studyHours, classAvg: classStudyHours },
    ];
  }, [scoreData, classStats, studentInfo]);

  // 成绩明细表数据
  const scoreTableData = useMemo(() => {
    const subjects = Object.keys(SUBJECT_MAP);
    return subjects.map((subj) => {
      const g1 = scoreData.find((s) => s.subject_id === subj && s.exam_stage === 'G1');
      const g2 = scoreData.find((s) => s.subject_id === subj && s.exam_stage === 'G2');
      const g3 = scoreData.find((s) => s.subject_id === subj && s.exam_stage === 'G3');

      // 班级均值（取最新阶段）
      const classStat = classStats
        .filter((s) => s.subject_id === subj)
        .sort((a, b) => (STAGE_ORDER[b.exam_stage] || 0) - (STAGE_ORDER[a.exam_stage] || 0))[0];

      const g1Score = g1?.score;
      const g3Score = g3?.score;
      let trend = 'stable';
      if (g1Score != null && g3Score != null) {
        if (g3Score > g1Score) trend = 'up';
        else if (g3Score < g1Score) trend = 'down';
      }

      return {
        subject: SUBJECT_MAP[subj],
        subjectId: subj,
        g1: g1?.score ?? '--',
        g2: g2?.score ?? '--',
        g3: g3?.score ?? '--',
        trend,
        classAvg: classStat?.avg_score != null ? classStat.avg_score.toFixed(1) : '--',
      };
    });
  }, [scoreData, classStats]);

  // 空状态
  if (!selectedStudentId) {
    return (
      <div className="home-page">
        <div className="home-orb home-orb--top" />
        <div className="home-orb home-orb--bottom" />
        <LiquidCard>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
          }}>
            <User size={48} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '1rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.9375rem' }}>
              请先在右上角选择学生身份
            </p>
          </div>
        </LiquidCard>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(11,101,101,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 style={{ margin: 0 }}>成绩分析</h1>
        {selectedStudentName && (
          <span className="text-tertiary" style={{ fontSize: '0.8125rem', marginLeft: '0.25rem' }}>
            {selectedStudentName}
          </span>
        )}
      </div>

      {loading ? (
        <LiquidCard>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p className="text-tertiary">加载中...</p>
          </div>
        </LiquidCard>
      ) : (
        <>
          {/* 成绩趋势图 */}
          <LiquidCard title="成绩趋势" style={{ marginBottom: '1.25rem' }}>
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
                          prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
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
                      tick={AXIS_TICK}
                      axisLine={AXIS_LINE}
                      tickLine={false}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      axisLine={AXIS_LINE}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(value) => SUBJECT_MAP[value] || value}
                      wrapperStyle={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.65)' }}
                    />
                    {Object.keys(SUBJECT_MAP)
                      .filter((subj) => visibleSubjects.includes(subj))
                      .map((subj, idx) => (
                        <Line
                          key={subj}
                          type="monotone"
                          dataKey={subj}
                          name={subj}
                          stroke={SUBJECT_COLORS[subj]}
                          strokeWidth={2}
                          dot={{ r: 4, fill: SUBJECT_COLORS[subj], stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6 }}
                          strokeDasharray={idx > 0 ? '6 3' : undefined}
                          connectNulls
                        />
                      ))}
                    {/* 班级均值参考线 */}
                    {visibleSubjects.map((subj) => {
                      const avgData = classAvgBySubject[subj];
                      if (!avgData) return null;
                      // 取最新阶段的均值作为参考线
                      const latestStage = ['G3', 'G2', 'G1'].find((s) => avgData[s] != null);
                      const avgRate = latestStage ? avgData[latestStage] : null;
                      if (avgRate == null) return null;
                      return (
                        <ReferenceLine
                          key={`ref-${subj}`}
                          y={avgRate}
                          stroke={SUBJECT_COLORS[subj]}
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          strokeOpacity={0.4}
                          label={{
                            value: `${SUBJECT_MAP[subj]}均值`,
                            position: 'right',
                            fill: SUBJECT_COLORS[subj],
                            fontSize: 10,
                            opacity: 0.6,
                          }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <TrendingUp size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block' }} />
                <p className="text-tertiary">暂无成绩趋势数据</p>
              </div>
            )}
          </LiquidCard>

          {/* 两栏图表 */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginBottom: '1.25rem' }}>
            {/* 成绩分布 */}
            <LiquidCard title="成绩分布">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {Object.keys(SUBJECT_MAP).map((subj) => (
                  <ChartFilterBtn
                    key={subj}
                    mode="single"
                    active={distSubject === subj}
                    color={SUBJECT_COLORS[subj]}
                    onClick={() => setDistSubject(subj)}
                  >
                    {SUBJECT_MAP[subj]}
                  </ChartFilterBtn>
                ))}
              </div>
              {studentScoreInfo.percentile != null && (
                <div style={{
                  fontSize: '0.8125rem',
                  color: 'var(--primary-dark)',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}>
                  <Target size={14} style={{ color: 'var(--primary)' }} />
                  你超过了 <strong style={{ color: 'var(--primary)' }}>{studentScoreInfo.percentile}%</strong> 的同学
                </div>
              )}
              {distributionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={distributionChartData} margin={{ top: 8, right: 8, bottom: 4, left: -10 }}>
                    <CartesianGrid stroke="rgba(11,101,101,0.05)" strokeWidth={0.5} vertical={false} />
                    <XAxis
                      dataKey="score"
                      tick={AXIS_TICK}
                      axisLine={AXIS_LINE}
                      tickLine={false}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      axisLine={AXIS_LINE}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="人数" radius={[3, 3, 0, 0]} maxBarSize={32}>
                      {distributionChartData.map((entry, index) => {
                        const scoreVal = parseFloat(entry.score);
                        const isHighlight = studentScoreInfo.highlightScore != null
                          && scoreVal != null
                          && Math.abs(scoreVal - studentScoreInfo.highlightScore) < 1;
                        return (
                          <Cell
                            key={index}
                            fill={isHighlight ? SUBJECT_COLORS[distSubject] : `${SUBJECT_COLORS[distSubject]}30`}
                            stroke={isHighlight ? SUBJECT_COLORS[distSubject] : 'none'}
                            strokeWidth={isHighlight ? 1 : 0}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <BarChart3 size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block' }} />
                  <p className="text-tertiary">暂无分布数据</p>
                </div>
              )}
            </LiquidCard>

            {/* 综合能力雷达图 */}
            <LiquidCard title="综合能力">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="rgba(11,101,101,0.08)" strokeWidth={0.5} />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: 'rgba(11,101,101,0.5)', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: 'rgba(11,101,101,0.3)', fontSize: 10 }}
                      axisLine={false}
                    />
                    <Radar
                      name="我的成绩"
                      dataKey="student"
                      stroke={SUBJECT_COLORS.SUBJ_GENERAL}
                      fill={SUBJECT_COLORS.SUBJ_GENERAL}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Radar
                      name="班级均值"
                      dataKey="classAvg"
                      stroke={SUBJECT_COLORS.SUBJ_MATH}
                      fill={SUBJECT_COLORS.SUBJ_MATH}
                      fillOpacity={0.05}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '0.8125rem', color: 'rgba(11,101,101,0.65)' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Target size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block' }} />
                  <p className="text-tertiary">暂无能力数据</p>
                </div>
              )}
            </LiquidCard>
          </div>

          {/* 成绩明细表 */}
          <LiquidCard title="成绩明细">
            {scoreTableData.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="liquid-table">
                  <thead>
                    <tr>
                      <th>科目</th>
                      <th>G1</th>
                      <th>G2</th>
                      <th>G3</th>
                      <th>变化趋势</th>
                      <th>班级均值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreTableData.map((row) => (
                      <tr key={row.subjectId}>
                        <td style={{ fontWeight: 500 }}>
                          <span style={{
                            display: 'inline-block',
                            width: 8, height: 8,
                            borderRadius: '50%',
                            background: SUBJECT_COLORS[row.subjectId],
                            marginRight: '0.5rem',
                            verticalAlign: 'middle',
                          }} />
                          {row.subject}
                        </td>
                        <td>{row.g1}</td>
                        <td>{row.g2}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{row.g3}</td>
                        <td>
                          {row.trend === 'up' && <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.125rem' }}><ArrowUp size={14} /> 上升</span>}
                          {row.trend === 'down' && <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.125rem' }}><ArrowDown size={14} /> 下降</span>}
                          {row.trend === 'stable' && <span style={{ color: 'rgba(11,101,101,0.45)', display: 'inline-flex', alignItems: 'center', gap: '0.125rem' }}><Minus size={14} /> 持平</span>}
                        </td>
                        <td style={{ color: 'rgba(11,101,101,0.65)' }}>{row.classAvg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p className="text-tertiary">暂无成绩明细</p>
              </div>
            )}
          </LiquidCard>
        </>
      )}
    </div>
  );
}
