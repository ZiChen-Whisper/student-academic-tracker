import { GraduationCap } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <nav className="liquid-nav">
        <div className="liquid-nav-brand">
          <GraduationCap size={20} />
          <span>学业跟踪预警系统</span>
        </div>
        <div className="liquid-nav-links">
          <NavLink to="/" className={({ isActive }) => `liquid-nav-item${isActive ? ' active' : ''}`} end>
            学情概览
          </NavLink>
          <NavLink to="/student" className={({ isActive }) => `liquid-nav-item${isActive ? ' active' : ''}`}>
            学生详情
          </NavLink>
          <NavLink to="/nl2sql" className={({ isActive }) => `liquid-nav-item${isActive ? ' active' : ''}`}>
            AI 查询
          </NavLink>
          <NavLink to="/alert" className={({ isActive }) => `liquid-nav-item${isActive ? ' active' : ''}`}>
            风险预警
          </NavLink>
        </div>
      </nav>
      <main className="page-container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <Outlet />
      </main>
    </>
  );
}
