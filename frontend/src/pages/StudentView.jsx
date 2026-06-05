import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BookOpen, Sparkles, Clock, User } from 'lucide-react';
import LiquidCard from '../components/LiquidCard';
import ChartTooltip from '../components/ChartTooltip';
import ChartFilterBtn from '../components/ChartFilterBtn';
import { useRole } from '../contexts/RoleContext';
import { getStudent, getScoreTrend, getSuggestions, generateSuggestion, updateSuggestionFeedback } from '../api';

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

export default function StudentView() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const [studentInfo, setStudentInfo] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [visibleSubjects, setVisibleSubjects] = useState(['SUBJ_MATH', 'SUBJ_PORTUGUESE', 'SUBJ_GENERAL']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    Promise.all([
      getStudent(selectedStudentId),
      getScoreTrend(selectedStudentId),
    ])
      .then(([studentRes, trendRes]) => {
        setStudentInfo(studentRes.data);
        setScoreData(trendRes.data?.scores || []);
      })
      .catch((err) => console.error('加载学生数据失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

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

  if (!selectedStudentId) {
    return (
      <div>
        {/* 欢迎横幅 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(11,101,101,0.06) 0%, rgba(11,101,101,0.02) 100%)',
          border: '0.5px solid rgba(11,101,101,0.08)',
          borderLeft: '4px solid var(--primary)',
          borderRadius: '0.75rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(11,101,101,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <User size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#095050', lineHeight: 1.3 }}>
              欢迎回来
            </h1>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'rgba(11,101,101,0.5)', marginTop: '0.25rem' }}>
              查看你的成绩趋势与学习数据
            </p>
          </div>
        </div>
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
    <div>
      {/* 欢迎横幅 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(11,101,101,0.06) 0%, rgba(11,101,101,0.02) 100%)',
        border: '0.5px solid rgba(11,101,101,0.08)',
        borderLeft: '4px solid var(--primary)',
        borderRadius: '0.75rem',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(11,101,101,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <User size={22} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#095050', lineHeight: 1.3 }}>
            欢迎回来，{selectedStudentName}
          </h1>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'rgba(11,101,101,0.5)', marginTop: '0.25rem' }}>
            查看你的成绩趋势与学习数据
          </p>
        </div>
      </div>

      {/* 学生信息 */}
      <LiquidCard style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="liquid-avatar" style={{ width: 48, height: 48, fontSize: '1.125rem' }}>
            {selectedStudentName?.charAt(0) || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1a2b2b' }}>
              {selectedStudentName}
            </div>
            <div className="text-tertiary" style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
              学号：{selectedStudentId}
              {studentInfo?.student_gender && ` · 性别：${studentInfo.student_gender === 'M' ? '男' : '女'}`}
              {studentInfo?.student_age && ` · 年龄：${studentInfo.student_age}`}
              {studentInfo?.student_class_id && ` · 班级：${studentInfo.student_class_id}`}
            </div>
          </div>
        </div>
      </LiquidCard>

      {/* 成绩趋势图 */}
      <LiquidCard title="各科目成绩趋势">
        {loading ? (
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>加载中...</p>
        ) : mergedChartData.length > 0 ? (
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
    </div>
  );
}
