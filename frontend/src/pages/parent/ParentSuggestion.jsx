import { useState, useEffect } from 'react';
import { Sparkles, Clock, ThumbsUp, ThumbsDown, Minus, User, RefreshCw } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import MetricCard from '../../components/MetricCard';
import { useRole } from '../../contexts/RoleContext';
import { getSuggestions, generateSuggestion, updateSuggestionFeedback, getParentSummary } from '../../api';

export default function ParentSuggestion() {
  const { selectedStudentId, selectedStudentName } = useRole();
  const operatorInfo = {
    operator_role: 'parent',
    operator_name: (selectedStudentName || '') + '的家长',
    operator_id: selectedStudentId || '',
  };
  const [suggestions, setSuggestions] = useState([]);
  const [parentActions, setParentActions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackingId, setFeedbackingId] = useState(null);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    Promise.all([
      getSuggestions(selectedStudentId),
      getParentSummary(selectedStudentId),
    ])
      .then(([sugRes, summaryRes]) => {
        setSuggestions(sugRes.data || []);
        setParentActions(summaryRes.data?.parent_actions || []);
      })
      .catch((err) => console.error('获取数据失败:', err))
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
    setFeedbackingId(suggestionId);
    try {
      await updateSuggestionFeedback(suggestionId, { feedback, ...operatorInfo });
      setSuggestions((prev) =>
        prev.map((s) =>
          s.suggestion_id === suggestionId ? { ...s, student_feedback: feedback } : s
        )
      );
    } catch (err) {
      console.error('反馈提交失败:', err);
    } finally {
      setFeedbackingId(null);
    }
  };

  const refreshData = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      const [sugRes, summaryRes] = await Promise.all([
        getSuggestions(selectedStudentId),
        getParentSummary(selectedStudentId),
      ]);
      setSuggestions(sugRes.data || []);
      setParentActions(summaryRes.data?.parent_actions || []);
    } catch (err) {
      console.error('刷新数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedStudentId) {
    return (
      <div className="home-page">
        <div className="home-orb home-orb--top" />
        <div className="home-orb home-orb--bottom" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(11,101,101,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ margin: 0 }}>学习建议</h1>
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
              请先在右上角选择孩子身份
            </p>
          </div>
        </LiquidCard>
      </div>
    );
  }

  const feedbackBadgeStyle = (feedback) => {
    if (feedback === 'satisfied') {
      return {
        background: 'rgba(26,138,90,0.08)',
        border: '0.5px solid rgba(26,138,90,0.2)',
        color: 'var(--success)',
        label: '满意',
      };
    }
    if (feedback === 'neutral') {
      return {
        background: 'rgba(11,101,101,0.06)',
        border: '0.5px solid rgba(11,101,101,0.12)',
        color: 'rgba(11,101,101,0.65)',
        label: '一般',
      };
    }
    if (feedback === 'unsatisfied') {
      return {
        background: 'rgba(192,57,43,0.08)',
        border: '0.5px solid rgba(192,57,43,0.2)',
        color: 'var(--danger)',
        label: '不满意',
      };
    }
    return null;
  };

  const priorityBadgeStyle = (priority) => {
    if (priority === 'high') {
      return {
        background: 'rgba(192,57,43,0.08)',
        border: '0.5px solid rgba(192,57,43,0.2)',
        color: 'var(--danger)',
        label: '高优先',
      };
    }
    if (priority === 'medium') {
      return {
        background: 'rgba(212,136,15,0.08)',
        border: '0.5px solid rgba(212,136,15,0.2)',
        color: 'var(--warning)',
        label: '中优先',
      };
    }
    return {
      background: 'rgba(11,101,101,0.06)',
      border: '0.5px solid rgba(11,101,101,0.12)',
      color: 'rgba(11,101,101,0.65)',
      label: '低优先',
    };
  };

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      {/* 页面标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(11,101,101,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ margin: 0 }}>学习建议</h1>
          {selectedStudentName && (
            <span className="text-tertiary" style={{ fontSize: '0.8125rem', marginLeft: '0.25rem' }}>
              {selectedStudentName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="liquid-btn liquid-btn-sm"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={14} />
            刷新
          </button>
          <button
            className={generating ? 'liquid-btn-ai' : 'liquid-btn liquid-btn-primary'}
            onClick={handleGenerateSuggestion}
            disabled={generating}
          >
            <Sparkles size={14} />
            {generating ? '生成中...' : '生成学习建议'}
          </button>
        </div>
      </div>

      {/* 建议统计 */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
        <MetricCard icon="check" label="总建议数" value={stats.total} />
        <MetricCard icon="trending" label="已反馈 / 未反馈" value={`${stats.feedback} / ${stats.unfeedback}`} />
        <MetricCard
          icon="check"
          label="满意率"
          value={stats.satisfiedRate}
          color={stats.satisfiedRate !== '--' && parseFloat(stats.satisfiedRate) >= 60 ? 'success' : 'default'}
        />
      </div>

      {/* 家长行动建议 */}
      <LiquidCard title="家长行动建议" style={{ marginBottom: '1.25rem' }}>
        {parentActions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {parentActions.map((action, idx) => {
              const badge = priorityBadgeStyle(action.priority);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '0.5px solid rgba(11,101,101,0.06)',
                    background: 'rgba(11,101,101,0.015)',
                  }}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.1875rem 0.625rem',
                    borderRadius: '9999px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    background: badge.background,
                    border: badge.border,
                    color: badge.color,
                  }}>
                    {badge.label}
                  </span>
                  <div style={{ flex: 1 }}>
                    {action.factor && (
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1a2b2b', marginBottom: '0.25rem' }}>
                        {action.factor}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.6 }}>
                      {action.action || action.suggestion || action.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem 0',
          }}>
            <ThumbsUp size={32} style={{ color: 'rgba(26,138,90,0.2)', marginBottom: '0.75rem' }} />
            <p className="text-tertiary">孩子表现良好，暂无特别建议</p>
          </div>
        )}
      </LiquidCard>

      {/* 建议列表 */}
      {loading ? (
        <LiquidCard>
          <p className="text-tertiary" style={{ textAlign: 'center', padding: '3rem 0' }}>加载中...</p>
        </LiquidCard>
      ) : suggestions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {suggestions.map((s) => {
            const badge = feedbackBadgeStyle(s.student_feedback);
            const currentFeedback = s.student_feedback;
            return (
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
                  {badge && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.1875rem 0.625rem',
                      borderRadius: '9999px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      background: badge.background,
                      border: badge.border,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#2a3d3d', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {s.suggestion_content}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    className="liquid-btn liquid-btn-sm"
                    style={{
                      borderRadius: '9999px',
                      color: currentFeedback === 'satisfied' ? '#fff' : 'var(--success)',
                      background: currentFeedback === 'satisfied' ? 'var(--success)' : undefined,
                      borderColor: currentFeedback === 'satisfied' ? 'var(--success)' : 'rgba(26,138,90,0.15)',
                      opacity: feedbackingId === s.suggestion_id ? 0.6 : 1,
                    }}
                    onClick={() => handleFeedback(s.suggestion_id, 'satisfied')}
                    disabled={feedbackingId === s.suggestion_id}
                  >
                    <ThumbsUp size={12} />
                    满意
                  </button>
                  <button
                    className="liquid-btn liquid-btn-sm"
                    style={{
                      borderRadius: '9999px',
                      color: currentFeedback === 'neutral' ? '#fff' : 'rgba(11,101,101,0.65)',
                      background: currentFeedback === 'neutral' ? 'rgba(11,101,101,0.5)' : undefined,
                      borderColor: currentFeedback === 'neutral' ? 'rgba(11,101,101,0.5)' : 'rgba(11,101,101,0.12)',
                      opacity: feedbackingId === s.suggestion_id ? 0.6 : 1,
                    }}
                    onClick={() => handleFeedback(s.suggestion_id, 'neutral')}
                    disabled={feedbackingId === s.suggestion_id}
                  >
                    <Minus size={12} />
                    一般
                  </button>
                  <button
                    className="liquid-btn liquid-btn-sm"
                    style={{
                      borderRadius: '9999px',
                      color: currentFeedback === 'unsatisfied' ? '#fff' : 'var(--danger)',
                      background: currentFeedback === 'unsatisfied' ? 'var(--danger)' : undefined,
                      borderColor: currentFeedback === 'unsatisfied' ? 'var(--danger)' : 'rgba(192,57,43,0.15)',
                      opacity: feedbackingId === s.suggestion_id ? 0.6 : 1,
                    }}
                    onClick={() => handleFeedback(s.suggestion_id, 'unsatisfied')}
                    disabled={feedbackingId === s.suggestion_id}
                  >
                    <ThumbsDown size={12} />
                    不满意
                  </button>
                </div>
              </LiquidCard>
            );
          })}
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
            <Sparkles size={48} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '1rem' }} />
            <p className="text-tertiary" style={{ fontSize: '0.9375rem' }}>
              暂无学习建议，点击上方按钮生成
            </p>
          </div>
        </LiquidCard>
      )}
    </div>
  );
}
