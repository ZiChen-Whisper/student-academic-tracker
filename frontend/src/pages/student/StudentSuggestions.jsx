import { useState, useEffect } from 'react';
import { Sparkles, Clock, User, MessageCircle } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import MetricCard from '../../components/MetricCard';
import { useRole } from '../../contexts/RoleContext';
import { getSuggestions, generateSuggestion, updateSuggestionFeedback } from '../../api';

export default function StudentSuggestions() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const operatorInfo = { operator_role: 'student', operator_name: selectedStudentName || '学生', operator_id: selectedStudentId || '' };
  const [suggestions, setSuggestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    getSuggestions(selectedStudentId)
      .then((res) => setSuggestions(res.data || []))
      .catch((err) => console.error('获取建议失败:', err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  const stats = (() => {
    if (!suggestions.length) return { total: 0, feedback: 0, unfeedback: 0, satisfiedRate: '--' };
    const feedback = suggestions.filter(s => s.student_feedback).length;
    const satisfied = suggestions.filter(s => s.student_feedback === 'satisfied').length;
    return {
      total: suggestions.length,
      feedback,
      unfeedback: suggestions.length - feedback,
      satisfiedRate: feedback > 0 ? ((satisfied / feedback) * 100).toFixed(0) + '%' : '--',
    };
  })();

  const handleGenerateSuggestion = async () => {
    if (!selectedStudentId) return;
    setGenerating(true);
    try {
      await generateSuggestion(selectedStudentId, operatorInfo);
      const res = await getSuggestions(selectedStudentId);
      setSuggestions(res.data || []);
    } catch (err) {
      console.error('生成建议失败:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleFeedback = async (suggestionId, feedback) => {
    try {
      await updateSuggestionFeedback(suggestionId, { feedback, ...operatorInfo });
      setSuggestions((prev) =>
        prev.map((s) =>
          s.suggestion_id === suggestionId ? { ...s, student_feedback: feedback } : s
        )
      );
    } catch (err) {
      console.error('反馈提交失败:', err);
    }
  };

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

      {/* 页面标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          <h1 style={{ margin: 0 }}>学习建议</h1>
        </div>
        <button
          className={generating ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'}
          onClick={handleGenerateSuggestion}
          disabled={generating}
        >
          <Sparkles size={14} />
          {generating ? 'AI 生成中...' : '生成学习建议'}
        </button>
      </div>

      {/* 建议统计 */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
        <MetricCard icon="check" label="总建议数" value={stats.total} />
        <MetricCard icon="trending" label="已反馈 / 未反馈" value={`${stats.feedback} / ${stats.unfeedback}`} />
        <MetricCard icon="check" label="满意率" value={stats.satisfiedRate} color={stats.satisfiedRate !== '--' && parseFloat(stats.satisfiedRate) >= 60 ? 'success' : 'default'} />
      </div>

      {/* 建议列表 */}
      {loading ? (
        <LiquidCard>
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>加载中...</p>
        </LiquidCard>
      ) : suggestions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {suggestions.map((s) => (
            <LiquidCard key={s.suggestion_id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.625rem',
                  color: 'rgba(11,101,101,0.35)',
                  whiteSpace: 'nowrap',
                }}>
                  <Clock size={9} />
                  {s.generate_time ? new Date(s.generate_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                </span>
                {s.student_feedback && (
                  <span className={`risk-badge ${s.student_feedback === 'satisfied' ? 'risk-low' : s.student_feedback === 'unsatisfied' ? 'risk-high' : ''}`} style={{
                    ...(s.student_feedback === 'neutral' ? {
                      background: 'rgba(11,101,101,0.06)',
                      border: '0.5px solid rgba(11,101,101,0.12)',
                      color: 'rgba(11,101,101,0.65)',
                    } : {}),
                  }}>
                    {s.student_feedback === 'satisfied' ? '满意' :
                     s.student_feedback === 'unsatisfied' ? '不满意' : '一般'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {s.suggestion_content}
              </div>
              {!s.student_feedback && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    className="liquid-btn liquid-btn-sm"
                    style={{ color: 'var(--success)', borderColor: 'rgba(26,138,90,0.15)' }}
                    onClick={() => handleFeedback(s.suggestion_id, 'satisfied')}
                  >
                    满意
                  </button>
                  <button
                    className="liquid-btn liquid-btn-sm"
                    onClick={() => handleFeedback(s.suggestion_id, 'neutral')}
                  >
                    一般
                  </button>
                  <button
                    className="liquid-btn liquid-btn-sm"
                    style={{ color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.15)' }}
                    onClick={() => handleFeedback(s.suggestion_id, 'unsatisfied')}
                  >
                    不满意
                  </button>
                </div>
              )}
            </LiquidCard>
          ))}
        </div>
      ) : (
        <LiquidCard>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
          }}>
            <MessageCircle size={48} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '1rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.9375rem' }}>
              暂无学习建议，点击上方按钮生成
            </p>
          </div>
        </LiquidCard>
      )}
    </div>
  );
}
