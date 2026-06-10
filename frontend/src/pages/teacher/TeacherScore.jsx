import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, BookOpen, ArrowUpDown, ArrowUp, ArrowDown, Clock, RefreshCw } from 'lucide-react';
import LiquidCard from '../../components/LiquidCard';
import LiquidSelect from '../../components/LiquidSelect';
import { useRole } from '../../contexts/RoleContext';
import { getStudents, getClassScores, updateTableRow } from '../../api';

const SUBJECT_MAP = { SUBJ_GENERAL: '综合', SUBJ_MATH: '数学', SUBJ_PORTUGUESE: '葡萄牙语' };
const SUBJECT_FULL_SCORE = { SUBJ_GENERAL: 100, SUBJ_MATH: 20, SUBJ_PORTUGUESE: 20 };
const STAGE_MAP = { G1: 'G1', G2: 'G2', G3: 'G3' };
const SORT_DIR = { asc: 'asc', desc: 'desc' };

export default function TeacherScore() {
  const { selectedTeacherClassId } = useRole();
  const classId = selectedTeacherClassId || '';

  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortField, setSortField] = useState('student_id');
  const [sortDir, setSortDir] = useState(SORT_DIR.asc);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { scoreId, value }
  const cellInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!classId) { setStudents([]); setScores([]); setLoading(false); return; }
    setLoading(true);
    try {
      // 获取该班级的所有学生
      const studentsRes = await getStudents({ class_id: classId, per_page: 9999 });
      const studentData = studentsRes.data?.data || (Array.isArray(studentsRes.data) ? studentsRes.data : []);
      setStudents(studentData);

      // 使用教师专属API获取班级成绩
      const scoresRes = await getClassScores({ class_id: classId });
      const allScores = scoresRes.data?.data || (Array.isArray(scoresRes.data) ? scoresRes.data : []);
      setScores(allScores);
    } catch (err) {
      console.error('获取成绩数据失败:', err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
      setRefreshing(false);
    }
  }, [classId]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  // 构建学生成绩映射: student_id -> { SUBJ_GENERAL_G3: score, ... }
  const scoreMap = {};
  scores.forEach(s => {
    const key = `${s.subject_id}_${s.exam_stage}`;
    if (!scoreMap[s.student_id]) scoreMap[s.student_id] = {};
    scoreMap[s.student_id][key] = { score: s.score, score_id: s.score_id };
  });

  // 过滤成绩数据
  const filteredScores = scores.filter(s => {
    if (subjectFilter && s.subject_id !== subjectFilter) return false;
    if (stageFilter && s.exam_stage !== stageFilter) return false;
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      const stu = students.find(st => st.student_id === s.student_id);
      if (!stu) return false;
      return (stu.student_name && stu.student_name.toLowerCase().includes(kw)) ||
        (stu.student_id && stu.student_id.toLowerCase().includes(kw));
    }
    return true;
  });

  const sortedScores = [...filteredScores].sort((a, b) => {
    let va = a[sortField] || '', vb = b[sortField] || '';
    if (sortField === 'score') { va = a.score || 0; vb = b.score || 0; }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === SORT_DIR.asc ? -1 : 1;
    if (va > vb) return sortDir === SORT_DIR.asc ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === SORT_DIR.asc ? SORT_DIR.desc : SORT_DIR.asc));
    else { setSortField(field); setSortDir(SORT_DIR.asc); }
    setPage(1);
  };
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 2 }} />;
    return sortDir === SORT_DIR.asc ? <ArrowUp size={10} style={{ marginLeft: 2 }} /> : <ArrowDown size={10} style={{ marginLeft: 2 }} />;
  };

  const totalPages = Math.ceil(sortedScores.length / pageSize);
  const pagedScores = sortedScores.slice((page - 1) * pageSize, page * pageSize);

  const handleScoreDoubleClick = (score) => {
    setEditingCell({ scoreId: score.score_id, value: String(score.score) });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const newScore = parseFloat(editingCell.value);
    if (isNaN(newScore) || newScore < 0) {
      setEditingCell(null);
      return;
    }
    // Find the original score to check if changed
    const originalScore = scores.find(s => s.score_id === editingCell.scoreId);
    if (originalScore && String(originalScore.score) === String(editingCell.value)) {
      setEditingCell(null);
      return;
    }
    try {
      await updateTableRow('exam_score', editingCell.scoreId, { score: newScore });
      setScores(prev => prev.map(s => s.score_id === editingCell.scoreId ? { ...s, score: newScore } : s));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('更新成绩失败:', err);
    }
    setEditingCell(null);
  };

  const handleCellKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleCellSave(); }
    else if (e.key === 'Escape') { setEditingCell(null); }
  };

  // 获取学生信息
  const getStudentInfo = (studentId) => students.find(s => s.student_id === studentId);

  if (!classId) {
    return (
      <div className="home-page">
        <div className="home-orb home-orb--top" />
        <div className="home-orb home-orb--bottom" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(11,101,101,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ margin: 0 }}>成绩管理</h1>
        </div>
        <LiquidCard>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <BookOpen size={40} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block', paintOrder: 'stroke fill' }} />
            <p className="text-tertiary">请先选择班级</p>
          </div>
        </LiquidCard>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-orb home-orb--top" />
      <div className="home-orb home-orb--bottom" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(11,101,101,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 style={{ margin: 0 }}>成绩管理</h1>
        <span className="text-tertiary" style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>
          共 {students.length} 名学生
        </span>
        {lastUpdated && (
          <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={10} />
            更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button className="liquid-btn liquid-btn-sm" onClick={() => { setRefreshKey(k => k + 1); setRefreshing(true); }} disabled={refreshing} style={{ marginLeft: '0.125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', height: '1.5rem', fontSize: '0.625rem' }} title="刷新数据">
          <RefreshCw size={10} style={refreshing ? { animation: 'spin-rotate 0.6s linear infinite' } : {}} />
        </button>
      </div>

      {/* 筛选栏 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'nowrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 0%', maxWidth: 280, minWidth: 120 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(11,101,101,0.35)', pointerEvents: 'none' }} />
          <input className="liquid-input" placeholder="搜索学生姓名或ID..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} style={{ paddingLeft: 28, width: '100%' }} />
        </div>
        <LiquidSelect
          value={subjectFilter}
          onChange={(v) => { setSubjectFilter(v); setPage(1); }}
          options={[{ value: '', label: '全部科目' }, { value: 'SUBJ_GENERAL', label: '综合' }, { value: 'SUBJ_MATH', label: '数学' }, { value: 'SUBJ_PORTUGUESE', label: '葡萄牙语' }]}
          style={{ width: 130, flexShrink: 0 }}
        />
        <LiquidSelect
          value={stageFilter}
          onChange={(v) => { setStageFilter(v); setPage(1); }}
          options={[{ value: '', label: '全部阶段' }, { value: 'G1', label: 'G1' }, { value: 'G2', label: 'G2' }, { value: 'G3', label: 'G3' }]}
          style={{ width: 120, flexShrink: 0 }}
        />
        <span className="text-tertiary" style={{ fontSize: '0.75rem', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          共 {sortedScores.length} 条记录
        </span>
      </div>

      <LiquidCard style={{ padding: 0 }}>
        <div style={{ padding: '0.5rem 1rem 0', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6875rem', color: 'rgba(11,101,101,0.35)' }}>双击成绩可编辑</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}><p className="text-tertiary">加载中...</p></div>
        ) : pagedScores.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="liquid-table">
                <thead>
                  <tr>
                    <th className="sortable-th" onClick={() => handleSort('student_id')}>学生ID <SortIcon field="student_id" /></th>
                    <th>姓名</th>
                    <th className="sortable-th" onClick={() => handleSort('subject_id')}>科目 <SortIcon field="subject_id" /></th>
                    <th className="sortable-th" onClick={() => handleSort('exam_stage')}>阶段 <SortIcon field="exam_stage" /></th>
                    <th className="sortable-th" onClick={() => handleSort('score')}>成绩 <SortIcon field="score" /></th>
                    <th className="sortable-th" onClick={() => handleSort('score_date')}>考试日期 <SortIcon field="score_date" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedScores.map((score) => {
                    const stu = getStudentInfo(score.student_id);
                    const subjName = SUBJECT_MAP[score.subject_id] || score.subject_id;
                    return (
                      <tr key={score.score_id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{score.student_id}</td>
                        <td style={{ fontWeight: 500 }}>{stu?.student_name || '--'}</td>
                        <td>{subjName}</td>
                        <td>{score.exam_stage}</td>
                        <td
                          onDoubleClick={() => handleScoreDoubleClick(score)}
                          style={{
                            fontWeight: 600,
                            color: score.score < (SUBJECT_FULL_SCORE[score.subject_id] || 100) * 0.6 ? 'var(--danger)' : 'var(--primary-dark)',
                            cursor: 'text',
                            position: editingCell?.scoreId === score.score_id ? 'relative' : undefined,
                            background: editingCell?.scoreId === score.score_id ? 'rgba(11,101,101,0.03)' : undefined,
                            boxShadow: editingCell?.scoreId === score.score_id ? 'inset 0 0 0 0.5px rgba(11,101,101,0.2), 0 0 0 2px rgba(11,101,101,0.06)' : undefined,
                          }}
                        >
                          {editingCell?.scoreId === score.score_id ? (
                            <input
                              ref={cellInputRef}
                              type="number"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onKeyDown={handleCellKeyDown}
                              onBlur={handleCellSave}
                              autoFocus
                              style={{
                                position: 'absolute', top: 1, left: 1, right: 1, bottom: 1,
                                padding: '0 0.375rem', fontSize: '0.8125rem', lineHeight: '1.5rem',
                                border: 'none', borderRadius: '0.125rem', boxSizing: 'border-box',
                                outline: 'none', zIndex: 1, background: 'rgba(255,255,255,0.6)',
                                color: 'var(--primary-dark)', fontFamily: 'inherit',
                              }}
                            />
                          ) : score.score}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'rgba(11,101,101,0.5)' }}>{score.score_date || '--'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '0.5px solid rgba(11,101,101,0.05)' }}>
                <button className="liquid-btn liquid-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
                <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>{page} / {totalPages}</span>
                <button className="liquid-btn liquid-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <BookOpen size={32} style={{ color: 'rgba(11,101,101,0.12)', marginBottom: '0.75rem', display: 'block', paintOrder: 'stroke fill' }} />
            <p className="text-tertiary">{keyword || subjectFilter || stageFilter ? '当前筛选条件下暂无成绩数据' : '暂无成绩数据'}</p>
          </div>
        )}
      </LiquidCard>

      <style>{'@keyframes spin-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
