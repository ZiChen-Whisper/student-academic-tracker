import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Database, User, GraduationCap, School, Calendar, BarChart3, Activity, Home, AlertTriangle, Lightbulb, FileText, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import TableViewer from '../../components/TableViewer';

const SUB_PAGES = [
  { to: '/admin/data/student', label: '学生信息', icon: User },
  { to: '/admin/data/teacher', label: '教师信息', icon: GraduationCap },
  {
    to: '/admin/data/class-subject', label: '班级与科目', icon: School,
    children: [
      { to: '/admin/data/class-subject/class', label: '班级' },
      { to: '/admin/data/class-subject/subject', label: '科目' },
    ],
  },
  {
    to: '/admin/data/course', label: '课程安排', icon: Calendar,
    children: [
      { to: '/admin/data/course/course-schedule', label: '课程安排' },
      { to: '/admin/data/course/student-subject', label: '学生选课' },
    ],
  },
  { to: '/admin/data/score', label: '考试成绩', icon: BarChart3 },
  { to: '/admin/data/behavior', label: '学习行为', icon: Activity },
  { to: '/admin/data/family', label: '家庭背景', icon: Home },
  { to: '/admin/data/alert', label: '风险预警', icon: AlertTriangle },
  { to: '/admin/data/suggestion', label: '学习建议', icon: Lightbulb },
  { to: '/admin/data/log', label: '查询日志', icon: FileText },
];

export function ClassSubjectPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div id="class">
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary-dark)' }}>班级</h2>
        <TableViewer tableName="class" />
      </div>
      <div id="subject">
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary-dark)' }}>科目</h2>
        <TableViewer tableName="subject" />
      </div>
    </div>
  );
}

export function CoursePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div id="course_schedule">
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary-dark)' }}>课程安排</h2>
        <TableViewer tableName="course_schedule" />
      </div>
      <div id="student_subject">
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary-dark)' }}>学生选课</h2>
        <TableViewer tableName="student_subject" />
      </div>
    </div>
  );
}

export default function AdminDataManagement() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // 初始化展开状态：如果当前路径匹配某个子项，自动展开其父组
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};
    SUB_PAGES.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(c => location.pathname === c.to);
        if (isChildActive) initial[item.to] = true;
      }
    });
    return initial;
  });

  // 导航到子路由时自动展开父组
  useEffect(() => {
    SUB_PAGES.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(c => location.pathname === c.to);
        if (isChildActive) {
          setExpandedGroups(prev => ({ ...prev, [item.to]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleGroup = (to) => {
    setExpandedGroups(prev => ({ ...prev, [to]: !prev[to] }));
  };

  const handleParentClick = (item) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedGroups(prev => ({ ...prev, [item.to]: true }));
    } else {
      // 展开 + 导航到母项（显示全部表格）
      if (!expandedGroups[item.to]) {
        setExpandedGroups(prev => ({ ...prev, [item.to]: true }));
      }
    }
    navigate(item.to);
  };

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(11,101,101,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Database size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 style={{ margin: 0 }}>数据管理</h1>
      </div>

      {/* 主体：侧边栏 + 内容区 */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* 侧边栏 */}
        <div style={{
          width: collapsed ? 48 : 180,
          flexShrink: 0,
          position: 'sticky',
          top: 'calc(52px + 1.5rem)',
          background: 'rgba(255,255,255,0.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          backdropFilter: 'blur(20px) saturate(160%)',
          border: '0.5px solid rgba(11,101,101,0.1)',
          borderRadius: '1rem',
          padding: '0.5rem',
          boxShadow: '0 1px 3px rgba(11,101,101,0.04), 0 4px 16px rgba(11,101,101,0.03)',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 52px - 3rem)',
        }}>
          {/* 顶部高光线 */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', top: -1, left: '12%', right: '12%',
              height: 0.5,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* 导航项列表 - 可滚动 */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="liquid-scroll">
            {SUB_PAGES.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isGroupExpanded = expandedGroups[item.to];
              const isParentActive = location.pathname === item.to ||
                (hasChildren && item.children.some(c => location.pathname === c.to));

              if (hasChildren) {
                return (
                  <div key={item.to}>
                    <div
                      className={'data-nav-item' + (isParentActive ? ' data-nav-item-active' : '')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: collapsed ? '0.5rem' : '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem',
                        fontWeight: isParentActive ? 600 : 400,
                        color: isParentActive ? 'var(--primary)' : 'rgba(11,101,101,0.6)',
                        background: isParentActive ? 'rgba(11,101,101,0.1)' : 'transparent',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        userSelect: 'none',
                        justifyContent: collapsed ? 'center' : undefined,
                      }}
                      onClick={() => handleParentClick(item)}
                      onMouseEnter={(e) => {
                        if (!isParentActive) {
                          e.currentTarget.style.background = 'rgba(11,101,101,0.05)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isParentActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(11,101,101,0.6)';
                        }
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={14} style={{ flexShrink: 0 }} />
                      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                      {!collapsed && (
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleGroup(item.to); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 18,
                            height: 18,
                            borderRadius: '0.25rem',
                            flexShrink: 0,
                            transition: 'background 0.15s ease',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(11,101,101,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <ChevronDown
                            size={12}
                            style={{
                              transition: 'transform 0.25s ease',
                              transform: isGroupExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              opacity: 0.5,
                            }}
                          />
                        </span>
                      )}
                    </div>
                    {/* 二级子项 - 带动画 */}
                    {!collapsed && (
                      <div style={{
                        overflow: 'hidden',
                        maxHeight: isGroupExpanded ? 200 : 0,
                        opacity: isGroupExpanded ? 1 : 0,
                        transition: 'max-height 0.25s ease-out, opacity 0.2s ease',
                      }}>
                        {item.children.map((child) => {
                          const isChildActive = location.pathname === child.to;
                          return (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              className={() => 'data-nav-item' + (isChildActive ? ' data-nav-item-active' : '')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.375rem 0.75rem 0.375rem 2rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: isChildActive ? 500 : 400,
                                color: isChildActive ? 'var(--primary)' : 'rgba(11,101,101,0.5)',
                                background: isChildActive ? 'rgba(11,101,101,0.06)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(11,101,101,0.05)';
                                e.currentTarget.style.color = 'var(--primary)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isChildActive) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = 'rgba(11,101,101,0.5)';
                                }
                              }}
                            >
                              <span style={{
                                width: 4, height: 4, borderRadius: '50%',
                                background: isChildActive ? 'var(--primary)' : 'rgba(11,101,101,0.3)',
                                flexShrink: 0,
                                transition: 'background 0.2s ease',
                              }} />
                              <span>{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 'data-nav-item' + (isActive ? ' data-nav-item-active' : '')}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : undefined,
                    gap: '0.5rem',
                    padding: collapsed ? '0.5rem' : '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--primary)' : 'rgba(11,101,101,0.6)',
                    background: isActive ? 'rgba(11,101,101,0.1)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  })}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains('data-nav-item-active')) {
                      e.currentTarget.style.background = 'rgba(11,101,101,0.05)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.classList.contains('data-nav-item-active')) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(11,101,101,0.6)';
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>

          {/* 折叠按钮 - 底部 */}
          <div style={{
            flexShrink: 0,
            marginTop: '0.375rem',
            paddingTop: '0.375rem',
            borderTop: '0.5px solid rgba(11,101,101,0.06)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: '50%',
                background: 'rgba(11,101,101,0.04)',
                color: 'rgba(11,101,101,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(11,101,101,0.08)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(11,101,101,0.04)'; e.currentTarget.style.color = 'rgba(11,101,101,0.4)'; }}
              title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
