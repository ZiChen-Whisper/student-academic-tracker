import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, X, AlertCircle, AlertTriangle, Loader2, Link2 } from 'lucide-react';
import { getTableList, getTableData, createTableRow, updateTableRow, deleteTableRow } from '../api';
import LiquidSelect from './LiquidSelect';
import LiquidTooltip, { useLiquidTooltip } from './LiquidTooltip';
import { useDataRefresh } from '../pages/admin/AdminDataManagement';

const PAGE_SIZE = 50;

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

function parseErrorMessage(err) {
  const data = err.response?.data;
  return data?.error || data?.detail || data?.message || err.message || '操作失败';
}

function getRowId(row, pkCols) {
  if (pkCols.length === 1) return row[pkCols[0].name];
  return pkCols.map(c => row[c.name]).join(',');
}

export default function TableViewer({ tableName, readonly = false }) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [highlightRowId, setHighlightRowId] = useState(null);
  const highlightAppliedRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalData, setModalData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pkConfirmData, setPkConfirmData] = useState(null);

  const [editingCell, setEditingCell] = useState(null);
  const [cellSaving, setCellSaving] = useState(false);
  const cellInputRef = useRef(null);
  const cellJustOpenedRef = useRef(false);

  const [fkSearchCache, setFkSearchCache] = useState({});

  // Tooltip
  const { tooltip, showTooltip, hideTooltip, moveTooltip } = useLiquidTooltip();

  // 数据刷新上下文
  const { refreshKey } = useDataRefresh() || {};

  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // 处理外键导航高亮
  useEffect(() => {
    const fkHighlight = location.state?.fkHighlight;
    if (fkHighlight != null && fkHighlight !== highlightAppliedRef.current) {
      highlightAppliedRef.current = fkHighlight;
      setSearch('');
      setSearchColumn('');
      setPage(1);
    }
  }, [location.key]);

  useEffect(() => {
    const fkHighlight = location.state?.fkHighlight;
    if (fkHighlight != null && fkHighlight === highlightAppliedRef.current && !loading && rows.length > 0) {
      setHighlightRowId(String(fkHighlight));
      const timer = setTimeout(() => setHighlightRowId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [location.state, loading, rows]);

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

  const fetchData = useCallback(async (p, s, col) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: p, page_size: PAGE_SIZE };
      if (s) {
        params.search = s;
        if (col) params.search_column = col;
      }
      const res = await getTableData(tableName, params);
      const data = res.data?.data;
      if (data) {
        setRows(data.rows || data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError(parseErrorMessage(err));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchData(page, search, searchColumn);
  }, [page, search, searchColumn, fetchData, refreshKey]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  const loadFkOptions = useCallback(async (fkTable, keyword = '') => {
    const cacheKey = fkTable;
    setFkSearchCache(prev => ({
      ...prev,
      [cacheKey]: { options: prev[cacheKey]?.options || [], loading: true },
    }));
    try {
      const res = await getTableData(fkTable, { page: 1, page_size: 50, search: keyword || undefined });
      const data = res.data?.data;
      const fkRows = data?.rows || data?.items || [];
      const fkTableMeta = await getTableList();
      const tables = fkTableMeta.data?.data || [];
      const fkMeta = tables.find(t => t.name === fkTable);
      const fkPkCols = fkMeta?.columns?.filter(c => c.primary_key) || [];
      const pkName = fkPkCols[0]?.name;
      const options = fkRows.map(row => {
        const pk = pkName ? row[pkName] : '';
        const displayParts = Object.entries(row)
          .filter(([k]) => k !== pkName)
          .slice(0, 3)
          .map(([, v]) => v != null ? String(v) : '')
          .filter(Boolean);
        return {
          value: String(pk),
          label: displayParts.length > 0 ? `${pk} - ${displayParts.join(' ')}` : String(pk),
        };
      });
      setFkSearchCache(prev => ({
        ...prev,
        [cacheKey]: { options, loading: false },
      }));
    } catch {
      setFkSearchCache(prev => ({
        ...prev,
        [cacheKey]: { options: [], loading: false },
      }));
    }
  }, []);

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
    columns.forEach(col => {
      if (col.fk_table && TABLE_ROUTE_MAP[col.fk_table]) {
        loadFkOptions(col.fk_table);
      }
    });
  };

  const handleEdit = (row) => {
    setModalMode('edit');
    const pkCols = columns.filter(c => c.primary_key);
    const rowIdStr = getRowId(row, pkCols);
    setEditingId(rowIdStr);
    const editData = {};
    columns.forEach(col => {
      editData[col.name] = row[col.name] ?? '';
    });
    setModalData(editData);
    setModalOpen(true);
    setError(null);
    columns.forEach(col => {
      if (col.fk_table && TABLE_ROUTE_MAP[col.fk_table]) {
        loadFkOptions(col.fk_table);
      }
    });
  };

  const handleSave = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        await createTableRow(tableName, payload);
      } else {
        await updateTableRow(tableName, editingId, payload);
      }
      setModalOpen(false);
      setPkConfirmData(null);
      fetchData(page, search, searchColumn);
    } catch (err) {
      setError(parseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = async () => {
    const payload = { ...modalData };
    columns.forEach(col => {
      if (col.auto_increment) delete payload[col.name];
      if (payload[col.name] === '') delete payload[col.name];
    });

    if (modalMode === 'add') {
      const pkCols = columns.filter(c => c.primary_key && !c.auto_increment);
      if (pkCols.length > 0) {
        const pkValue = pkCols.map(c => modalData[c.name]).join(', ');
        const exists = rows.some(row =>
          pkCols.every(c => String(row[c.name]) === String(modalData[c.name]))
        );
        if (exists) {
          setError(`主键 ${pkValue} 已存在，请使用不同的值`);
          return;
        }
        setPkConfirmData({ payload, pkValue });
        return;
      }
    }

    await handleSave(payload);
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      await deleteTableRow(tableName, id);
      setConfirmDelete(null);
      fetchData(page, search, searchColumn);
    } catch (err) {
      setError(parseErrorMessage(err));
      setConfirmDelete(null);
    }
  };

  const handleFkClick = (fkTable, value) => {
    if (value == null) return;
    const route = TABLE_ROUTE_MAP[fkTable];
    if (route) {
      navigate(route, { state: { fkHighlight: String(value) } });
    }
  };

  const handleCellDoubleClick = (rowIdx, colName, value, col) => {
    if (readonly) return;
    if (col.auto_increment) return;
    if (!col.editable) return;
    cellJustOpenedRef.current = true;
    setEditingCell({ rowIdx, colName, value: value ?? '' });
    setError(null);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const { rowIdx, colName, value: newValue } = editingCell;
    const row = rows[rowIdx];
    if (!row) return;

    const pkCols = columns.filter(c => c.primary_key);
    const rowIdStr = getRowId(row, pkCols);
    if (!rowIdStr) return;

    if (String(row[colName] ?? '') === String(newValue)) {
      setEditingCell(null);
      return;
    }

    setCellSaving(true);
    try {
      await updateTableRow(tableName, rowIdStr, { [colName]: newValue });
      setEditingCell(null);
      fetchData(page, search, searchColumn);
    } catch (err) {
      setError(parseErrorMessage(err));
      setEditingCell(null);
    } finally {
      setCellSaving(false);
    }
  };

  const handleCellKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      if (cellJustOpenedRef.current) {
        cellInputRef.current.select();
        cellJustOpenedRef.current = false;
      }
    }
  }, [editingCell?.rowIdx, editingCell?.colName]);

  const pkCols = columns.filter(c => c.primary_key);
  const searchableColumns = columns.filter(c =>
    c.type === 'varchar' || c.type === 'text'
  );
  const searchPlaceholder = searchColumn
    ? `搜索${columns.find(c => c.name === searchColumn)?.label || searchColumn}...`
    : '搜索全部文本列...';

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  const renderFormField = (col) => {
    const isDisabled = (modalMode === 'edit' && col.primary_key) || col.auto_increment;
    const value = modalData[col.name] ?? '';

    if (isDisabled) {
      return (
        <input className="liquid-input" value={value || '(自动生成)'} disabled
          style={{ opacity: 0.5, cursor: 'not-allowed' }} />
      );
    }

    if (col.fk_table && TABLE_ROUTE_MAP[col.fk_table]) {
      const cacheKey = col.fk_table;
      const fkCache = fkSearchCache[cacheKey];
      const options = fkCache?.options || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <LiquidSelect
            value={value}
            onChange={(v) => setModalData(prev => ({ ...prev, [col.name]: v }))}
            options={options}
            placeholder={fkCache?.loading ? '加载中...' : `搜索并选择${col.label || col.name}...`}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input
              className="liquid-input"
              type="text"
              value={value}
              onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))}
              placeholder="或手动输入值"
              style={{ fontSize: '0.75rem' }}
            />
            <button className="liquid-btn liquid-btn-sm"
              onClick={() => loadFkOptions(col.fk_table, value)}
              onMouseEnter={(e) => showTooltip('搜索', e)}
              onMouseMove={moveTooltip}
              onMouseLeave={hideTooltip}
              style={{ flexShrink: 0 }}>
              <Search size={12} />
            </button>
          </div>
        </div>
      );
    }

    if (col.enum_values && col.enum_values.length > 0) {
      return (
        <LiquidSelect value={value}
          onChange={(v) => setModalData(prev => ({ ...prev, [col.name]: v }))}
          options={col.enum_values.map(v => ({ value: v, label: v }))}
          placeholder={`选择${col.label || col.name}...`} />
      );
    }

    if (col.type === 'boolean' || col.type === 'tinyint(1)') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#1a2b2b' }}>
          <input type="checkbox" checked={!!value}
            onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
          {value ? '是' : '否'}
        </label>
      );
    }

    if (col.type === 'date') {
      return <input className="liquid-input" type="date" value={value || ''}
        onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))} />;
    }
    if (col.type === 'datetime' || col.type === 'timestamp') {
      return <input className="liquid-input" type="datetime-local"
        value={value ? value.slice(0, 16) : ''}
        onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))} />;
    }

    if (col.type === 'int' || col.type === 'integer' || col.type === 'bigint' || col.type === 'float' || col.type === 'double' || col.type === 'decimal') {
      return <input className="liquid-input" type="number" value={value}
        onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))}
        step={col.type === 'decimal' || col.type === 'float' || col.type === 'double' ? '0.01' : '1'} />;
    }

    return <input className="liquid-input" type="text" value={value}
      onChange={(e) => setModalData(prev => ({ ...prev, [col.name]: e.target.value }))}
      placeholder={col.label || col.name} />;
  };

  return (
    <div className="liquid-card" style={{ padding: '1rem', position: 'relative' }}>
      <style>{HIGHLIGHT_CSS}</style>

      {/* Tooltip */}
      <LiquidTooltip text={tooltip.text} x={tooltip.x} y={tooltip.y} />

      {/* Toolbar - 统一高度 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: 480 }}>
          {searchableColumns.length > 0 && (
            <LiquidSelect
              value={searchColumn}
              onChange={(v) => { setSearchColumn(v); setPage(1); }}
              options={[
                { value: '', label: '全部列' },
                ...searchableColumns.map(c => ({ value: c.name, label: c.label || c.name })),
              ]}
              placeholder="搜索列"
              style={{ flexShrink: 0, width: 90, maxWidth: 90 }}
              triggerStyle={{ fontSize: '0.75rem', padding: '0.4375rem 0.625rem', height: 32, boxSizing: 'border-box' }}
            />
          )}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(11,101,101,0.35)', pointerEvents: 'none' }} />
            <input
              ref={searchInputRef}
              className="liquid-input"
              placeholder={searchPlaceholder}
              defaultValue={search}
              onChange={handleSearchChange}
              style={{ paddingLeft: '2rem', height: 32, boxSizing: 'border-box' }}
            />
          </div>
        </div>
        {!readonly && (
          <button className="liquid-btn liquid-btn-primary" onClick={handleAdd}
            style={{ height: 32, boxSizing: 'border-box' }}>
            <Plus size={14} />
            <span>添加</span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="liquid-alert liquid-alert-error" style={{ marginBottom: '0.75rem' }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2, display: 'flex' }}>
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
          <table className="liquid-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {columns.map(col => {
                  const hasRoute = col.fk_table && TABLE_ROUTE_MAP[col.fk_table];
                  return (
                    <th key={col.name}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {col.label || col.name}
                        {col.fk_table && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: hasRoute ? 'rgba(11,101,101,0.4)' : 'rgba(11,101,101,0.25)',
                              cursor: 'help',
                              marginLeft: 1,
                            }}
                            onMouseEnter={(e) => showTooltip(`外键 → ${col.fk_reference || col.fk_table}`, e)}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                          >
                            <Link2 size={10} />
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
                {!readonly && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rowIdStr = getRowId(row, pkCols);
                const isHighlighted = highlightRowId != null && String(rowIdStr) === String(highlightRowId);
                return (
                  <tr
                    key={rowIdStr ?? idx}
                    className={isHighlighted ? 'fk-highlight-row' : ''}
                    ref={isHighlighted ? (el) => {
                      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    } : undefined}
                  >
                    {columns.map(col => {
                      const value = row[col.name];
                      const isFkClickable = col.fk_table && value != null && TABLE_ROUTE_MAP[col.fk_table];
                      const isEditing = editingCell && editingCell.rowIdx === idx && editingCell.colName === col.name;
                      const canEdit = !readonly && col.editable && !col.auto_increment;

                      return (
                        <td
                          key={col.name}
                          onDoubleClick={() => {
                            if (canEdit && !isEditing) {
                              handleCellDoubleClick(idx, col.name, value, col);
                            }
                          }}
                          style={{
                            cursor: canEdit ? 'text' : undefined,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                            position: isEditing ? 'relative' : undefined,
                            background: isEditing ? 'rgba(11,101,101,0.03)' : undefined,
                            boxShadow: isEditing ? 'inset 0 0 0 0.5px rgba(11,101,101,0.2), 0 0 0 2px rgba(11,101,101,0.06)' : undefined,
                          }}
                        >
                          {isEditing ? (
                            <input
                              ref={cellInputRef}
                              type={col.type === 'int' || col.type === 'integer' || col.type === 'bigint' || col.type === 'float' || col.type === 'double' || col.type === 'decimal' ? 'number' : 'text'}
                              value={editingCell.value}
                              onChange={(e) => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onKeyDown={handleCellKeyDown}
                              onBlur={handleCellSave}
                              disabled={cellSaving}
                              style={{
                                position: 'absolute',
                                top: 1,
                                left: 1,
                                right: 1,
                                bottom: 1,
                                padding: '0 0.375rem',
                                fontSize: '0.8125rem',
                                lineHeight: '1.5rem',
                                border: 'none',
                                borderRadius: '0.125rem',
                                boxSizing: 'border-box',
                                outline: 'none',
                                zIndex: 1,
                                background: 'rgba(255,255,255,0.6)',
                                color: 'var(--primary-dark)',
                                fontFamily: 'inherit',
                              }}
                              step={col.type === 'decimal' || col.type === 'float' || col.type === 'double' ? '0.01' : undefined}
                            />
                          ) : value == null ? (
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
                              onClick={(e) => { e.stopPropagation(); handleFkClick(col.fk_table, value); }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderBottomColor = 'var(--primary)';
                                e.currentTarget.style.background = 'rgba(11,101,101,0.04)';
                                showTooltip(`点击查看 → ${col.fk_reference || col.fk_table}`, e);
                              }}
                              onMouseMove={moveTooltip}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderBottomColor = 'rgba(11,101,101,0.25)';
                                e.currentTarget.style.background = 'transparent';
                                hideTooltip();
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
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'transparent', color: 'var(--primary)', cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(11,101,101,0.06)'; e.currentTarget.style.color = 'var(--primary-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(rowIdStr)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(192,57,43,0.06)'; e.currentTarget.style.color = 'var(--danger-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--danger)'; }}
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
            <button className="liquid-btn liquid-btn-sm" disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
              上一页
            </button>
            <button className="liquid-btn liquid-btn-sm" disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: 'rgba(255,255,255,0.85)', WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)', border: '0.5px solid rgba(11,101,101,0.08)', borderRadius: 16, padding: '1.5rem', width: 520, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)' }}
            className="liquid-scroll" onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 0.5, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', pointerEvents: 'none' }} />
            <button onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(11,101,101,0.35)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.65)'; e.currentTarget.style.background = 'rgba(11,101,101,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(11,101,101,0.35)'; e.currentTarget.style.background = 'none'; }}>
              <X size={18} />
            </button>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>{modalMode === 'add' ? '添加记录' : '编辑记录'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {columns.map(col => (
                <div key={col.name}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 500, color: 'rgba(11,101,101,0.5)', marginBottom: '0.25rem' }}>
                    {col.label || col.name}
                    {col.primary_key && <span style={{ marginLeft: 4, color: 'rgba(11,101,101,0.3)' }}>(主键)</span>}
                    {col.nullable === false && !col.auto_increment && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
                    {col.fk_table && <span style={{ marginLeft: 4, color: 'rgba(11,101,101,0.3)' }}>→ {col.fk_reference || col.fk_table}</span>}
                  </label>
                  {renderFormField(col)}
                </div>
              ))}
            </div>
            {error && (
              <div className="liquid-alert liquid-alert-error" style={{ marginTop: '0.75rem' }}>
                <AlertCircle size={16} />
                <span style={{ flex: 1 }}>{error}</span>
                <button onClick={() => setError(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2, display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="liquid-btn" onClick={() => setModalOpen(false)}>取消</button>
              <button className="liquid-btn liquid-btn-primary" onClick={handleSaveClick} disabled={saving}>
                {saving && <Loader2 size={14} className="spin" />}
                {modalMode === 'add' ? '添加' : '保存'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PK 二次确认 */}
      {pkConfirmData && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPkConfirmData(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: 'rgba(255,255,255,0.85)', WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)', border: '0.5px solid rgba(11,101,101,0.08)', borderRadius: 16, padding: '1.5rem', width: 380, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 0.5, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212,136,15,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={18} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', color: '#1a2b2b' }}>确认新增主键</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'rgba(11,101,101,0.6)' }}>
                  主键值 <strong style={{ color: 'var(--primary)' }}>{pkConfirmData.pkValue}</strong> 在当前数据中未出现过，确认添加？
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="liquid-btn" onClick={() => setPkConfirmData(null)}>取消</button>
              <button className="liquid-btn liquid-btn-primary" onClick={() => handleSave(pkConfirmData.payload)} disabled={saving}>
                {saving && <Loader2 size={14} className="spin" />}
                确认添加
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation */}
      {confirmDelete !== null && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: 'rgba(255,255,255,0.85)', WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)', border: '0.5px solid rgba(11,101,101,0.08)', borderRadius: 16, padding: '1.5rem', width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 0.5, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,57,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', color: '#1a2b2b' }}>确认删除</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'rgba(11,101,101,0.6)' }}>
                  确定删除此记录？此操作不可撤销。
                </p>
              </div>
            </div>
            {error && (
              <div className="liquid-alert liquid-alert-error" style={{ marginBottom: '0.75rem' }}>
                <AlertCircle size={16} />
                <span style={{ flex: 1 }}>{error}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="liquid-btn" onClick={() => setConfirmDelete(null)}>取消</button>
              <button className="liquid-btn liquid-btn-danger" onClick={() => handleDelete(confirmDelete)}>删除</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
