import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { GraduationCap, User, Users, Search, ChevronDown, X, Shield } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { searchStudents, searchTeachers, getTeachers, getStudents, getTeacherClasses } from '../api';

const ROLE_CONFIG = {
  admin: { label: '管理员', icon: Shield, path: '/' },
  teacher: { label: '教师', icon: GraduationCap, path: '/' },
  student: { label: '学生', icon: User, path: '/student-view' },
  parent: { label: '家长', icon: Users, path: '/parent-view' },
};

// 各角色的导航菜单
const NAV_ITEMS = {
  admin: [
    { to: '/', label: '学情概览', end: true },
    { to: '/student', label: '学生详情' },
    { to: '/nl2sql', label: 'AI 查询' },
    { to: '/alert', label: '风险预警' },
  ],
  teacher: [
    { to: '/', label: '学情概览', end: true },
    { to: '/student', label: '学生详情' },
    { to: '/nl2sql', label: 'AI 查询' },
    { to: '/alert', label: '风险预警' },
  ],
  student: [
    { to: '/student-view', label: '成绩趋势', end: true },
    { to: '/student-view/suggestions', label: '学习建议' },
  ],
  parent: [
    { to: '/parent-view', label: '成绩报告', end: true },
    { to: '/parent-view/alerts', label: '预警通知' },
  ],
};

// 验证方式选项
const VERIFY_METHODS = {
  admin: [
    { key: 'name', label: '管理员姓名' },
    { key: 'id', label: '管理员ID' },
  ],
  teacher: [
    { key: 'name', label: '教师姓名' },
    { key: 'id', label: '教师ID' },
  ],
  student: [
    { key: 'name', label: '学生姓名' },
    { key: 'id', label: '学生ID' },
  ],
  parent: [
    { key: 'name', label: '学生姓名' },
    { key: 'id', label: '学生ID' },
  ],
};

export default function Layout() {
  const {
    role, switchRole,
    selectedStudentId, selectedStudentName, selectStudent, clearStudent,
    selectedTeacherId, selectedTeacherName, selectTeacher, clearTeacher,
    selectedAdminId, selectedAdminName, selectAdmin, clearAdmin,
    setSelectedTeacherClassId,
  } = useRole();
  const navigate = useNavigate();

  // 角色下拉
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleDropdownReady, setRoleDropdownReady] = useState(false);
  const roleDropdownRef = useRef(null);
  const roleTriggerRef = useRef(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState({ top: 0, left: 0 });

  // 计算角色下拉面板位置
  const updateRoleDropdownPos = useCallback(() => {
    if (roleTriggerRef.current) {
      const rect = roleTriggerRef.current.getBoundingClientRect();
      setRoleDropdownPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  // 打开角色下拉时，延迟显示避免 backdrop-filter 闪烁
  useEffect(() => {
    if (!showRoleDropdown) {
      setRoleDropdownReady(false);
      return;
    }
    const timer = setTimeout(() => setRoleDropdownReady(true), 30);
    return () => clearTimeout(timer);
  }, [showRoleDropdown]);

  // 身份验证浮窗
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginRole, setLoginRole] = useState(null); // 正在验证的角色
  const [verifyMethod, setVerifyMethod] = useState('name');
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 点击外部关闭角色下拉
  useEffect(() => {
    const handleClickOutside = (e) => {
      const triggerEl = roleDropdownRef.current;
      const panelEl = document.getElementById('role-dropdown-portal');
      if (triggerEl && !triggerEl.contains(e.target) && (!panelEl || !panelEl.contains(e.target))) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 切换角色 — 弹出身份验证浮窗
  const handleSwitchRole = (newRole) => {
    setShowRoleDropdown(false);
    if (newRole === role) return;
    setLoginRole(newRole);
    setVerifyMethod(VERIFY_METHODS[newRole][0].key);
    setKeyword('');
    setSearchResults([]);
    setHasSearched(false);
    setLoginModalOpen(true);
  };

  // 搜索
  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      if (loginRole === 'teacher') {
        const res = await searchTeachers({ keyword: keyword.trim() });
        setSearchResults(res.data?.data || []);
      } else {
        const res = await searchStudents({ keyword: keyword.trim() });
        setSearchResults(res.data?.data || []);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 选择身份
  const handleSelect = async (person) => {
    if (loginRole === 'teacher') {
      selectTeacher(person.teacher_id, person.teacher_name);
      // 获取教师的班级信息
      try {
        const res = await getTeacherClasses(person.teacher_id);
        const classes = res.data?.data?.homeroom_classes || res.data?.data?.instructor_classes || [];
        if (classes.length > 0) {
          setSelectedTeacherClassId(classes[0].class_id);
        } else {
          setSelectedTeacherClassId('');
        }
      } catch (err) {
        console.error('获取教师班级失败:', err);
        setSelectedTeacherClassId('');
      }
    } else {
      selectStudent(person.student_id, person.student_name);
    }
    switchRole(loginRole);
    setLoginModalOpen(false);
    navigate(ROLE_CONFIG[loginRole].path);
  };

  // 关闭浮窗
  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setLoginRole(null);
    setKeyword('');
    setSearchResults([]);
    setHasSearched(false);
  };

  // 快捷登录 - 管理员
  const handleAdminQuickLogin = () => {
    selectAdmin('admin', '系统管理员');
    switchRole('admin');
    setLoginModalOpen(false);
    navigate('/');
  };

  // 快捷登录 - 随机教师
  const handleTeacherQuickLogin = async () => {
    try {
      const res = await getTeachers();
      const teachers = res.data?.data || [];
      if (teachers.length > 0) {
        const t = teachers[0];
        selectTeacher(t.teacher_id, t.teacher_name);
        // 获取教师的班级信息
        try {
          const classRes = await getTeacherClasses(t.teacher_id);
          const classes = classRes.data?.data?.homeroom_classes || classRes.data?.data?.instructor_classes || [];
          if (classes.length > 0) {
            setSelectedTeacherClassId(classes[0].class_id);
          } else {
            setSelectedTeacherClassId('');
          }
        } catch (err) {
          setSelectedTeacherClassId('');
        }
        switchRole('teacher');
        setLoginModalOpen(false);
        navigate('/');
      }
    } catch (err) {
      console.error('快捷登录失败:', err);
    }
  };

  // 快捷登录 - 随机学生
  const handleStudentQuickLogin = async () => {
    try {
      const res = await getStudents();
      const students = res.data?.data || [];
      if (students.length > 0) {
        const s = students[0];
        selectStudent(s.student_id, s.student_name);
        switchRole(loginRole);
        setLoginModalOpen(false);
        navigate(ROLE_CONFIG[loginRole].path);
      }
    } catch (err) {
      console.error('快捷登录失败:', err);
    }
  };

  // 当前身份显示
  const currentIdentity = (() => {
    if (role === 'admin') return '系统管理员';
    if (role === 'teacher' && selectedTeacherId) return selectedTeacherName;
    if (role !== 'teacher' && selectedStudentId) return selectedStudentName;
    return null;
  })();

  const navItems = NAV_ITEMS[role] || NAV_ITEMS.admin;
  const currentRoleConfig = ROLE_CONFIG[role];

  return (
    <>
      <nav className="liquid-nav">
        <div className="liquid-nav-brand">
          <GraduationCap size={20} />
          <span>学业跟踪预警系统</span>
        </div>

        <div className="liquid-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `liquid-nav-item${isActive ? ' active' : ''}`}
              end={item.end}
            >
              {item.label}
            </NavLink>
          ))}

          <div style={{
            width: '0.5px',
            height: 20,
            background: 'rgba(11,101,101,0.12)',
            margin: '0 0.375rem',
          }} />

          {/* 角色切换按钮 */}
          <div ref={roleDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div
              ref={roleTriggerRef}
              className="liquid-nav-item"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!showRoleDropdown) updateRoleDropdownPos();
                setShowRoleDropdown(!showRoleDropdown);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!showRoleDropdown) updateRoleDropdownPos(); setShowRoleDropdown(!showRoleDropdown); } }}
              style={{
                background: 'rgba(11,101,101,0.08)',
                color: 'var(--primary)',
                fontWeight: 600,
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {(() => { const Icon = currentRoleConfig.icon; return <Icon size={14} />; })()}
              {currentRoleConfig.label}
              {currentIdentity && (
                <span style={{ fontWeight: 400, fontSize: '0.6875rem', opacity: 0.7, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  · {currentIdentity}
                </span>
              )}
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </div>

            {/* 角色下拉 — Portal 渲染到 body，避免导航栏 backdrop-filter 合成层阻止模糊 */}
            {showRoleDropdown && createPortal(
              <div id="role-dropdown-portal" style={{
                position: 'fixed',
                top: roleDropdownPos.top,
                right: roleDropdownPos.right,
                width: 200,
                zIndex: 9999,
                opacity: roleDropdownReady ? 1 : 0,
                transition: 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: roleDropdownReady ? 'auto' : 'none',
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '0.5px solid rgba(11,101,101,0.1)',
                borderRadius: '0.625rem',
                boxShadow: '0 0 0 0.5px rgba(11,101,101,0.04), 0 2px 4px rgba(11,101,101,0.03), 0 8px 24px rgba(11,101,101,0.06), 0 16px 48px rgba(11,101,101,0.03), inset 0 0.5px 0 rgba(255,255,255,0.6)',
              }}>
                <div style={{
                  padding: '0.25rem',
                  position: 'relative',
                  transform: roleDropdownReady ? 'translateY(0)' : 'translateY(-6px)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isActive = role === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSwitchRole(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.4375rem',
                          border: 'none',
                          background: isActive ? 'rgba(11,101,101,0.08)' : 'transparent',
                          color: isActive ? 'var(--primary)' : '#2a3d3d',
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'rgba(11,101,101,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon size={16} />
                        <span>{config.label}视角</span>
                        {isActive && (
                          <span style={{
                            marginLeft: 'auto',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </nav>

      <main className="page-container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <Outlet />
      </main>

      {/* ===== 身份验证浮窗 ===== */}
      {loginModalOpen && loginRole && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={closeLoginModal}
        >
          {/* 遮罩层 */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
          }} />
          {/* 浮窗内容 */}
          <div
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(24px)',
              border: '0.5px solid rgba(11,101,101,0.08)',
              borderRadius: 16,
              padding: '1.75rem',
              width: 400,
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(11,101,101,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={closeLoginModal}
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

            {/* 标题 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {(() => { const Icon = ROLE_CONFIG[loginRole].icon; return <Icon size={20} style={{ color: 'var(--primary)' }} />; })()}
              <h2 style={{ margin: 0, fontSize: '1.0625rem' }}>
                选择{ROLE_CONFIG[loginRole].label}身份
              </h2>
            </div>

            {/* 验证方式选择 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(11,101,101,0.45)', marginBottom: '0.5rem' }}>
                验证方式
              </label>
              <div className="liquid-tabs" style={{ marginBottom: 0 }}>
                {VERIFY_METHODS[loginRole].map((method) => (
                  <button
                    key={method.key}
                    className={`liquid-tab ${verifyMethod === method.key ? 'active' : ''}`}
                    onClick={() => { setVerifyMethod(method.key); setKeyword(''); setSearchResults([]); setHasSearched(false); }}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 搜索输入 */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="liquid-input"
                  placeholder={`输入${VERIFY_METHODS[loginRole].find(m => m.key === verifyMethod)?.label || ''}搜索...`}
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    if (!e.target.value.trim()) { setSearchResults([]); setHasSearched(false); }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button
                  className="liquid-btn liquid-btn-primary"
                  onClick={handleSearch}
                  disabled={searching}
                >
                  <Search size={14} />
                </button>
              </div>
            </div>

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="liquid-scroll" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {searchResults.map((person) => {
                  const id = loginRole === 'teacher' ? person.teacher_id : person.student_id;
                  const name = loginRole === 'teacher' ? person.teacher_name : person.student_name;
                  const extra = loginRole === 'teacher'
                    ? (person.teacher_title || '')
                    : (person.student_class_id || '');

                  return (
                    <div
                      key={id}
                      onClick={() => handleSelect(person)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 0.75rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        border: '0.5px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(11,101,101,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(11,101,101,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div className="liquid-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                        {name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a2b2b', fontSize: '0.8125rem' }}>{name || '--'}</div>
                        <div className="text-tertiary" style={{ fontSize: '0.6875rem' }}>
                          {id}{extra ? ` · ${extra}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 搜索中 */}
            {searching && (
              <p className="text-tertiary" style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8125rem' }}>
                搜索中...
              </p>
            )}
            {/* 无结果 - 仅在已搜索后显示 */}
            {!searching && hasSearched && searchResults.length === 0 && (
              <p className="text-tertiary" style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8125rem' }}>
                未找到匹配结果
              </p>
            )}

            {/* 分割线 + 快捷登录 */}
            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '0.5px solid rgba(11,101,101,0.08)',
            }}>
              <div style={{
                fontSize: '0.6875rem',
                color: 'rgba(11,101,101,0.45)',
                marginBottom: '0.625rem',
                fontWeight: 500,
              }}>
                快捷登录
              </div>

              {loginRole === 'admin' && (
                <button
                  className="liquid-btn liquid-btn-primary"
                  onClick={handleAdminQuickLogin}
                  style={{ width: '100%' }}
                >
                  <Shield size={14} style={{ marginRight: '0.375rem' }} />
                  以管理员身份进入
                </button>
              )}

              {loginRole === 'teacher' && (
                <button
                  className="liquid-btn"
                  onClick={handleTeacherQuickLogin}
                  style={{ width: '100%' }}
                >
                  随机选择一位教师
                </button>
              )}

              {(loginRole === 'student' || loginRole === 'parent') && (
                <button
                  className="liquid-btn"
                  onClick={handleStudentQuickLogin}
                  style={{ width: '100%' }}
                >
                  随机选择一位学生
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
