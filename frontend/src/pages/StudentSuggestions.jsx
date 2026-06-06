import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Clock, User, MessageCircle } from 'lucide-react';
import LiquidCard from '../components/LiquidCard';
import { useRole } from '../contexts/RoleContext';
import { getSuggestions, generateSuggestion, updateSuggestionFeedback } from '../api';

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
      <div>
        <h1 style={{ marginBottom: '1.25rem' }}>学习建议</h1>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0 }}>学习建议</h1>
        <button
          className={generating ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'}
          onClick={handleGenerateSuggestion}
          disabled={generating}
        >
          <Sparkles size={14} />
          {generating ? 'AI 生成中...' : '生成学习建议'}
        </button>
      </div>

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
                  <span style={{
                    fontSize: '0.6875rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    background: s.student_feedback === 'satisfied'
                      ? 'rgba(26,138,90,0.08)'
                      : s.student_feedback === 'unsatisfied'
                      ? 'rgba(192,57,43,0.08)'
                      : 'rgba(11,101,101,0.06)',
                    color: s.student_feedback === 'satisfied'
                      ? 'var(--success)'
                      : s.student_feedback === 'unsatisfied'
                      ? 'var(--danger)'
                      : 'rgba(11,101,101,0.65)',
                  }}>
                    {s.student_feedback === 'satisfied' ? '满意' :
                     s.student_feedback === 'unsatisfied' ? '不满意' : '一般'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {s.suggestion_content}
              </div>
              {/* 反馈按钮 */}
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
