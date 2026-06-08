import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, X, AlertCircle, Loader2, Link2 } from 'lucide-react';
import { getTableList, getTableData, createTableRow, updateTableRow, deleteTableRow } from '../api';
import LiquidSelect from './LiquidSelect';

const PAGE_SIZE = 50;

// 外键表名 → 管理员路由映射
const TABLE_ROUTE_MAP = {
  'student': '/admin/data/student',
  'teacher': '/admin/data/teacher',
  'class': '/admin/data/class-subject/class',
  'subject': '/admin/data/class-subject/subject',
  'course_schedule': '/admin/data/course/course-schedule',
  'student_subject': '/admin/data/course/student-subject',
  'exam_score': '/admin/data/score',
  'learning_behavior': '/admin/data/behavior',
  'family_background': '/admin/data/family',
  'risk_alert': '/admin/data/alert',
  'learning_suggestion': '/admin/data/suggestion',
  'nl2sql_log': '/admin/data/log',
};

// 高亮动画 CSS
const HIGHLIGHT_CSS = `
@keyframes fk-highlight-pulse {
  0% { background: rgba(11,101,101,0.14); box-shadow: inset 0 0 0 1px rgba(11,101,101,0.12); }
  40% { background: rgba(11,101,101,0.14); box-shadow: inset 0 0 0 1px rgba(11,101,101,0.12); }
  100% { background: transparent; box-shadow: inset 0 0 0 1px transparent; }
}
.fk-highlight-row td {
  animation: fk-highlight-pulse 2.5s ease forwards;
}
`;

export default function TableViewer({ tableName, readonly = false }) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 高亮状态
  const [highlightRowId, setHighlightRowId] = useState(null);
  const highlightAppliedRef = useRef(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalData, setModalData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Debounce search
  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // 处理外键导航高亮
  useEffect(() => {
    const fkHighlight = location.state?.fkHighlight;
    if (fkHighlight != null && fkHighlight !== highlightAppliedRef.current) {
      highlightAppliedRef.current = fkHighlight;
      setSearch(String(fkHighlight));
      setPage(1);
      // 数据加载后由另一个 effect 应用高亮
    }
  }, [location.key]);

  // 数据加载后应用高亮
  useEffect(() => {
    const fkHighlight = location.state?.fkHighlight;
    if (fkHighlight != null && fkHighlight === highlightAppliedRef.current && !loading && rows.length > 0) {
      setHighlightRowId(String(fkHighlight));
      const timer = setTimeout(() => setHighlightRowId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [location.state, loading, rows]);

  // Fetch column metadata
  useEffect(() => {
    let cancelled = false;
    async function fetchColumns() {
      try {
        const res = await getTableList();
        const tables = res.data?.data || [];
        const tableMeta = tables.find(t => t.name === tableName);
        if (tableMeta && tableMeta.columns && !cancelled) {
          setColumns(tableMeta.columns);
        }
      } catch (err) {
        console.error('获取表元数据失败:', err);
      }
    }
    fetchColumns();
    return () => { cancelled = true; };
  }, [tableName]);

  // Fetch data
  const fetchData = useCallback(async (p, s) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTableData(tableName, { page: p, page_size: PAGE_SIZE, search: s || undefined });
      const data = res.data?.data;
      if (data) {
        setRows(data.rows || data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || '加载数据失败');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchData(page, search);
  }, [page, search, fetchData]);

  // Reset page when search changes
  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  // Open add modal
  const handleAdd = () => {
    setModalMode('add');
    setEditingId(null);
    const initData = {};
    columns.forEach(col => {
      if (!col.auto_increment) {
        initData[col.name] = col.default ?? '';
      }
    });
    setModalData(initData);
    setModalOpen(true);
    setError(null);
  };

  // Open edit modal
  const handleEdit = (row) => {
    setModalMode('edit');
    const pkCol = columns.find(c => c.primary_key);
    setEditingId(pkCol ? row[pkCol.name] : null);
    const editData = {};
    columns.forEach(col => {
      editData[col.name] = row[col.name] ?? '';
    });
    setModalData(editData);
    setModalOpen(true);
    setError(null);
  };

  // Save (add or edit)
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...modalData };
      // Remove auto-increment PK from payload
      columns.forEach(col => {
        if (col.auto_increment) delete payload[col.name];
        if (payload[col.name] === '') delete payload[col.name];
      });

      if (modalMode === 'add') {
        await createTableRow(tableName, payload);
      } else {
        await updateTableRow(tableName, editingId, payload);
      }
      setModalOpen(false);
      fetchData(page, search);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    setError(null);
    try {
      await deleteTableRow(tableName, id);
      setConfirmDelete(null);
      fetchData(page, search);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || '删除失败');
    }
  };

  // FK 点击导航
  const handleFkClick = (fkReference, value) => {
    if (value == null) return;
    const fkTable = fkReference.includes('.') ? fkReference.split('.')[0] : fkReference;
    const route = TABLE_ROUTE_MAP[fkTable];
    if (route) {
      navigate(route, { state: { fkHighlight: String(value) } });
    }
  };

  // Get PK column name
  const pkCol = columns.find(c => c.primary_key);

  // Pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  // Render form field for a column
  const renderFormField = (col) => {
    const isDisabled = (modalMode === 'edit' && col.primary_key) || col.auto_increment;
    const value = modalData[col.name] ?? '';

    if (isDisabled) {
      return (
        <input
          className="liquid-input"
          value={value || '(自动生成)'}
          disabled
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        />
      );
    }

    // ENUM columns
    if (col.enum_values && col.enum_values.length > 0) {
      return (
        <LiquidSelect
          value={value}
          onChange={(v) => setModalData(prev => ({ ...prev, [col.name]: v }))}
          options={col.enum_values.map(v => ({ value: v, label: v }))}
          placeholder={`选择${col.label || col.name}...`}
        />
      );
    }

    // Boolean
    if (col.type === 'boolean' || col.type === 'tinyint(1)') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#1a2b2b' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
          />
          {value ? '是' : '否'}
        </label>
      );
    }

    // Date / Datetime
    if (col.type === 'date') {
      return (
        <input
          className="liquid-input"
          type="date"
          value={value || ''}
          onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))}
        />
      );
    }
    if (col.type === 'datetime' || col.type === 'timestamp') {
      return (
        <input
          className="liquid-input"
          type="datetime-local"
          value={value ? value.slice(0, 16) : ''}
          onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))}
        />
      );
    }

    // Number
    if (col.type === 'int' || col.type === 'integer' || col.type === 'bigint' || col.type === 'float' || col.type === 'double' || col.type === 'decimal') {
      return (
        <input
          className="liquid-input"
          type="number"
          value={value}
          onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))}
          step={col.type === 'decimal' || col.type === 'float' || col.type === 'double' ? '0.01' : '1'}
        />
      );
    }

    // Default: text
    return (
      <input
        className="liquid-input"
        type="text"
        value={value}
        onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))}
        placeholder={col.label || col.name}
      />
    );
  };

  return (
    <div className="liquid-card" style={{ padding: '1rem' }}>
      {/* 高亮动画样式 */}
      <style>{HIGHLIGHT_CSS}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(11,101,101,0.35)', pointerEvents: 'none' }} />
          <input
            ref={searchInputRef}
            className="liquid-input"
            placeholder="搜索..."
            defaultValue={search}
            onChange={handleSearchChange}
            style={{ paddingLeft: '2rem' }}
          />
        </div>
        {!readonly && (
          <button className="liquid-btn liquid-btn-primary" onClick={handleAdd}>
            <Plus size={14} />
            <span>添加</span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="liquid-alert liquid-alert-error" style={{ marginBottom: '0.75rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2, display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '0.625rem', border: '0.5px solid rgba(11,101,101,0.08)' }} className="liquid-scroll">
        {loading && rows.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'rgba(11,101,101,0.4)', gap: '0.5rem' }}>
            <Loader2 size={18} className="spin" />
            <span>加载中...</span>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(11,101,101,0.4)', fontSize: '0.8125rem' }}>
            暂无数据
          </div>
        ) : (
          <table className="liquid-table">
            <thead>
              <tr>
                {columns.map(col => {
                  const fkTable = col.fk_reference
                    ? (col.fk_reference.includes('.') ? col.fk_reference.split('.')[0] : col.fk_reference)
                    : null;
                  const hasRoute = fkTable && TABLE_ROUTE_MAP[fkTable];
                  return (
                    <th key={col.name}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {col.label || col.name}
                        {col.fk_reference && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: hasRoute ? 'rgba(11,101,101,0.4)' : 'rgba(11,101,101,0.25)',
                              cursor: 'help',
                              marginLeft: 1,
                            }}
                            title={`外键 → ${col.fk_reference}`}
                          >
                            <Link2 size={10} />
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
                {!readonly && <th style={{ width: 72 }}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rowId = pkCol ? row[pkCol.name] : idx;
                const isHighlighted = highlightRowId != null && String(rowId) === String(highlightRowId);
                return (
                  <tr
                    key={rowId ?? idx}
                    className={isHighlighted ? 'fk-highlight-row' : ''}
                    ref={isHighlighted ? (el) => {
                      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    } : undefined}
                  >
                    {columns.map(col => {
                      const value = row[col.name];
                      const fkTable = col.fk_reference
                        ? (col.fk_reference.includes('.') ? col.fk_reference.split('.')[0] : col.fk_reference)
                        : null;
                      const isFkClickable = col.fk_reference && value != null && fkTable && TABLE_ROUTE_MAP[fkTable];

                      return (
                        <td key={col.name} title={String(value ?? '')}>
                          {value == null ? (
                            <span style={{ color: 'rgba(11,101,101,0.25)' }}>NULL</span>
                          ) : isFkClickable ? (
                            <span
                              style={{
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                borderBottom: '1px dashed rgba(11,101,101,0.25)',
                                transition: 'all 0.15s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                              onClick={() => handleFkClick(col.fk_reference, value)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderBottomColor = 'var(--primary)';
                                e.currentTarget.style.background = 'rgba(11,101,101,0.04)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderBottomColor = 'rgba(11,101,101,0.25)';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {String(value)}
                            </span>
                          ) : (
                            String(value)
                          )}
                        </td>
                      );
                    })}
                    {!readonly && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleEdit(row)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(11,101,101,0.06)'; e.currentTarget.style.color = 'var(--primary-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
                            title="编辑"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(rowId)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(192,57,43,0.06)'; e.currentTarget.style.color = 'var(--danger-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--danger)'; }}
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(11,101,101,0.5)' }}>
          <span>第 {startIdx}-{endIdx} 条，共 {total} 条</span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              className="liquid-btn liquid-btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              上一页
            </button>
            <button
              className="liquid-btn liquid-btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            WebkitBackdropFilter: 'blur(4px)',
            backdropFilter: 'blur(4px)',
          }} />
          <div
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.85)',
              WebkitBackdropFilter: 'blur(24px)',
              backdropFilter: 'blur(24px)',
              border: '0.5px solid rgba(11,101,101,0.08)',
              borderRadius: 16,
              padding: '1.5rem',
              width: 520,
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)',
            }}
            className="liquid-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部高光线 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '8%',
              right: '8%',
              height: 0.5,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
              pointerEvents: 'none',
            }} />

            {/* 关闭按钮 */}
            <button
              onClick={() => setModalOpen(false)}
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
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}
            >
              <X size={18} />
            </button>

            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>
              {modalMode === 'add' ? '添加记录' : '编辑记录'}
            </h2>

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {columns.map(col => (
                <div key={col.name}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: 'rgba(11,101,101,0.5)',
                    marginBottom: '0.25rem',
                  }}>
                    {col.label || col.name}
                    {col.primary_key && <span style={{ marginLeft: 4, color: 'rgba(11,101,101,0.3)' }}>(主键)</span>}
                    {col.nullable === false && !col.auto_increment && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
                  </label>
                  {renderFormField(col)}
                </div>
              ))}
            </div>

            {/* Error in modal */}
            {error && (
              <div className="liquid-alert liquid-alert-error" style={{ marginTop: '0.75rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="liquid-btn" onClick={() => setModalOpen(false)}>取消</button>
              <button className="liquid-btn liquid-btn-primary" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} className="spin" />}
                {modalMode === 'add' ? '添加' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            WebkitBackdropFilter: 'blur(4px)',
            backdropFilter: 'blur(4px)',
          }} />
          <div
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.85)',
              WebkitBackdropFilter: 'blur(24px)',
              backdropFilter: 'blur(24px)',
              border: '0.5px solid rgba(11,101,101,0.08)',
              borderRadius: 16,
              padding: '1.5rem',
              width: 360,
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部高光线 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '8%',
              right: '8%',
              height: 0.5,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(192,57,43,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', color: '#1a2b2b' }}>确认删除</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'rgba(11,101,101,0.6)' }}>
                  确定删除此记录？此操作不可撤销。
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="liquid-btn" onClick={() => setConfirmDelete(null)}>取消</button>
              <button className="liquid-btn liquid-btn-danger" onClick={() => handleDelete(confirmDelete)}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
