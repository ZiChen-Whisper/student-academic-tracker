import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, User, Users, Search, ChevronDown, X, Shield, Menu, ChevronLeft, ChevronRight, School } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { searchStudents, searchTeachers, getTeachers, getStudents, getTeacherClasses } from '../api';
import LiquidSelect from './LiquidSelect';

const ROLE_CONFIG = {
  admin: { label: '管理员', icon: Shield, path: '/admin' },
  teacher: { label: '教师', icon: GraduationCap, path: '/teacher' },
  student: { label: '学生', icon: User, path: '/student-view' },
  parent: { label: '家长', icon: Users, path: '/parent-view' },
};

// 各角色的导航菜单
const NAV_ITEMS = {
  admin: [
    { to: '/admin', label: '主页', end: true },
    { to: '/admin/data', label: '数据管理' },
    { to: '/admin/history', label: '变更历史' },
  ],
  teacher: [
    { to: '/teacher', label: '主页', end: true },
    { to: '/teacher/overview', label: '学情概览' },
    { to: '/teacher/student', label: '学生详情' },
    { to: '/teacher/alert', label: '风险预警' },
    { to: '/teacher/score', label: '成绩管理' },
  ],
  student: [
    { to: '/student-view', label: '主页' },
    { to: '/student-view/trends', label: '成绩趋势' },
    { to: '/student-view/suggestions', label: '学习建议' },
  ],
  parent: [
    { to: '/parent-view', label: '主页' },
    { to: '/parent-view/report', label: '成绩报告' },
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
    selectedTeacherClassId, setSelectedTeacherClassId, teacherClasses, setTeacherClasses,
  } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // 根据当前 URL 路径自动同步角色，修复直接访问 /teacher 等路径时导航栏不同步的问题
  useEffect(() => {
    const pathRole = location.pathname.startsWith('/teacher') ? 'teacher'
      : location.pathname.startsWith('/student-view') ? 'student'
      : location.pathname.startsWith('/parent-view') ? 'parent'
      : location.pathname.startsWith('/admin') ? 'admin'
      : null;
    if (pathRole && pathRole !== role) {
      switchRole(pathRole);
    }
    // 当在 admin 路径但没有 admin 身份时，自动设置默认身份
    if (pathRole === 'admin' && !selectedAdminId) {
      selectAdmin('admin', '系统管理员');
    }
    // 当在 teacher 路径且有已保存的教师身份但无班级数据时，重新获取班级
    if (pathRole === 'teacher' && selectedTeacherId && teacherClasses.length === 0) {
      getTeacherClasses(selectedTeacherId).then(res => {
        const homeroom = res.data?.data?.homeroom_classes || [];
        const instructor = res.data?.data?.instructor_classes || [];
        const allClasses = [
          ...homeroom.map(c => ({ ...c, role: '班主任' })),
          ...instructor.map(c => ({ ...c, role: '授课教师' })),
        ];
        setTeacherClasses(allClasses);
        if (allClasses.length > 0 && !selectedTeacherClassId) {
          setSelectedTeacherClassId(allClasses[0].class_id);
        }
      }).catch(err => {
        console.error('恢复教师班级数据失败:', err);
      });
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // 角色下拉
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleDropdownReady, setRoleDropdownReady] = useState(false);
  const roleDropdownRef = useRef(null);
  const roleTriggerRef = useRef(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState({ top: 0, left: 0 });

  // 移动端菜单
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const mobileMenuTimerRef = useRef(null);

  const openMobileMenu = useCallback(() => {
    if (mobileMenuTimerRef.current) clearTimeout(mobileMenuTimerRef.current);
    setMobileMenuClosing(false);
    setMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuClosing(true);
    mobileMenuTimerRef.current = setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
    }, 200);
  }, []);

  // 计算角色下拉面板位置
  const updateRoleDropdownPos = useCallback(() => {
    if (roleTriggerRef.current) {
      const rect = roleTriggerRef.current.getBoundingClientRect();
      setRoleDropdownPos({
        top: rect.bottom + 6,
        left: rect.right - 240,
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

  // 清理移动菜单定时器
  useEffect(() => {
    return () => {
      if (mobileMenuTimerRef.current) clearTimeout(mobileMenuTimerRef.current);
    };
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
        const homeroom = res.data?.data?.homeroom_classes || [];
        const instructor = res.data?.data?.instructor_classes || [];
        const allClasses = [
          ...homeroom.map(c => ({ ...c, role: '班主任' })),
          ...instructor.map(c => ({ ...c, role: '授课教师' })),
        ];
        setTeacherClasses(allClasses);
        if (allClasses.length > 0) {
          setSelectedTeacherClassId(allClasses[0].class_id);
        } else {
          setSelectedTeacherClassId('');
        }
      } catch (err) {
        console.error('获取教师班级失败:', err);
        setSelectedTeacherClassId('');
        setTeacherClasses([]);
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
  const handleAdminQuickLogin = (e) => {
    e?.stopPropagation();
    selectAdmin('admin', '系统管理员');
    switchRole('admin');
    setLoginModalOpen(false);
    setShowRoleDropdown(false);
    navigate('/admin');
  };

  // 快捷登录 - 随机教师
  const handleTeacherQuickLogin = async (e) => {
    e?.stopPropagation();
    setShowRoleDropdown(false);
    try {
      const res = await getTeachers();
      const teachers = res.data?.data || [];
      if (teachers.length > 0) {
        const t = teachers[0];
        selectTeacher(t.teacher_id, t.teacher_name);
        // 获取班级
        try {
          const classRes = await getTeacherClasses(t.teacher_id);
          const homeroom = classRes.data?.data?.homeroom_classes || [];
          const instructor = classRes.data?.data?.instructor_classes || [];
          const allClasses = [
            ...homeroom.map(c => ({ ...c, role: '班主任' })),
            ...instructor.map(c => ({ ...c, role: '授课教师' })),
          ];
          setTeacherClasses(allClasses);
          if (allClasses.length > 0) {
            setSelectedTeacherClassId(allClasses[0].class_id);
          } else {
            setSelectedTeacherClassId('');
          }
        } catch (err) {
          setSelectedTeacherClassId('');
          setTeacherClasses([]);
        }
        // 先切换角色再导航
        switchRole('teacher');
        navigate('/teacher', { replace: true });
      }
    } catch (err) {
      console.error('快捷登录失败:', err);
    }
  };

  // 快捷登录 - 随机学生
  const handleStudentQuickLogin = async (e, targetRole) => {
    e?.stopPropagation();
    const r = targetRole || loginRole;
    try {
      const res = await getStudents();
      const students = res.data?.data || [];
      if (students.length > 0) {
        const s = students[0];
        selectStudent(s.student_id, s.student_name);
        switchRole(r);
        setLoginModalOpen(false);
        setShowRoleDropdown(false);
        navigate(ROLE_CONFIG[r].path);
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

  // 班级切换处理
  const handleClassChange = (classId) => {
    setSelectedTeacherClassId(classId);
  };

  const currentClass = teacherClasses.find(c => c.class_id === selectedTeacherClassId);
  const classOptions = teacherClasses.map(c => ({
    value: c.class_id,
    label: `${c.class_name || c.class_id}${c.role ? ` (${c.role})` : ''}`,
  }));

  const navItems = NAV_ITEMS[role] || NAV_ITEMS.admin;
  const currentRoleConfig = ROLE_CONFIG[role];

  return (
    <>
      <nav className="liquid-nav">
        <div className="liquid-nav-brand">
          <GraduationCap size={20} />
          <span>学业跟踪预警系统</span>
        </div>

        {/* 桌面端导航链接 */}
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
          <div ref={roleDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {/* 教师班级切换下拉 */}
            {role === 'teacher' && teacherClasses.length > 1 && (
              <LiquidSelect
                value={selectedTeacherClassId}
                onChange={handleClassChange}
                options={classOptions}
                style={{ width: 'auto', minWidth: 130 }}
                triggerStyle={{ padding: '0.3125rem 0.5rem', fontSize: '0.6875rem', minWidth: 'unset' }}
              />
            )}
            {role === 'teacher' && teacherClasses.length <= 1 && currentClass && (
              <span style={{
                fontSize: '0.6875rem',
                color: 'rgba(11,101,101,0.55)',
                fontWeight: 500,
                padding: '0.25rem 0.5rem',
                background: 'rgba(11,101,101,0.04)',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <School size={11} />
                {currentClass.class_name || currentClass.class_id}
              </span>
            )}
              <div ref={roleTriggerRef}
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
                left: roleDropdownPos.left,
                width: 240,
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
                    const quickLoginLabel = key === 'admin' ? '快捷进入' : key === 'teacher' ? '随机教师' : '随机学生';
                    const quickLoginHandler = key === 'admin' ? handleAdminQuickLogin : key === 'teacher' ? handleTeacherQuickLogin : (e) => handleStudentQuickLogin(e, key);
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '0.4375rem',
                          background: isActive ? 'rgba(11,101,101,0.08)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'rgba(11,101,101,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <button
                          onClick={() => handleSwitchRole(key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.4375rem',
                            border: 'none',
                            background: 'transparent',
                            color: isActive ? 'var(--primary)' : '#2a3d3d',
                            fontWeight: isActive ? 600 : 400,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            fontFamily: 'inherit',
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
                        {!isActive && (
                          <button
                            onClick={quickLoginHandler}
                            style={{
                              flexShrink: 0,
                              padding: '0.1875rem 0.5rem',
                              marginRight: '0.375rem',
                              borderRadius: '9999px',
                              border: '0.5px solid rgba(11,101,101,0.1)',
                              background: 'rgba(11,101,101,0.04)',
                              color: 'var(--primary)',
                              fontSize: '0.625rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              fontFamily: 'inherit',
                              lineHeight: 1.4,
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(11,101,101,0.1)';
                              e.currentTarget.style.borderColor = 'rgba(11,101,101,0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(11,101,101,0.04)';
                              e.currentTarget.style.borderColor = 'rgba(11,101,101,0.1)';
                            }}
                          >
                            {quickLoginLabel}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* 移动端汉堡按钮 */}
        <button
          className="liquid-nav-hamburger"
          onClick={() => mobileMenuOpen ? closeMobileMenu() : openMobileMenu()}
          aria-label="菜单"
        >
          {mobileMenuOpen && !mobileMenuClosing ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* 移动端菜单面板 */}
      {mobileMenuOpen && (
        <div className="liquid-mobile-menu" onClick={closeMobileMenu}>
          <div className={`liquid-mobile-menu-inner${mobileMenuClosing ? ' closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `liquid-mobile-menu-item${isActive ? ' active' : ''}`}
                end={item.end}
                onClick={closeMobileMenu}
              >
                {item.label}
              </NavLink>
            ))}

            <div className="liquid-mobile-menu-divider" />

            {/* 角色切换区域 */}
            <div className="liquid-mobile-menu-section">
              <div className="liquid-mobile-menu-section-title">切换身份</div>
              {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = role === key;
                return (
                  <button
                    key={key}
                    className={`liquid-mobile-menu-item${isActive ? ' active' : ''}`}
                    onClick={() => { closeMobileMenu(); handleSwitchRole(key); }}
                    style={{ width: '100%', textAlign: 'left' }}
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
          </div>
        </div>
      )}

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
          </div>
        </div>
      )}
    </>
  );
}
