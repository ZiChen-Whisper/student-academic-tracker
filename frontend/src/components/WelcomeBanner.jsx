import { useNavigate } from 'react-router-dom';
import { GraduationCap, User, Users, BarChart3, UserSearch, Sparkles, ShieldAlert, Clock } from 'lucide-react';

/* 管理员专属面性盾牌图标 */
function AdminShieldIcon({ size = 28, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {/* 盾牌主体 */}
      <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="var(--primary)" />
      {/* 内层盾牌轮廓 */}
      <path d="M12 4.5L5.5 8.2v3.8c0 4.2 2.8 8.1 6.5 9.1 3.7-1 6.5-4.9 6.5-9.1V8.2L12 4.5z" fill="rgba(255,255,255,0.1)" />
      {/* 对勾 */}
      <path d="M9 12.5l2 2 4.5-4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* 管理员快捷入口配置 */
const ADMIN_SHORTCUTS = [
  { label: '学情概览', path: '/admin/overview', icon: BarChart3 },
  { label: '学生详情', path: '/admin/student', icon: UserSearch },
  { label: 'AI 查询', path: '/admin/nl2sql', icon: Sparkles },
  { label: '风险预警', path: '/admin/alert', icon: ShieldAlert },
  { label: '变更历史', path: '/admin/history', icon: Clock },
];

const ROLE_CONFIG = {
  admin: { icon: AdminShieldIcon, gradient: 'rgba(255,255,255,0.2)' },
  teacher: { icon: GraduationCap, gradient: 'rgba(11,101,101,0.1)' },
  student: { icon: User, gradient: 'rgba(26,138,90,0.08)' },
  parent: { icon: Users, gradient: 'rgba(201,147,58,0.08)' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export default function WelcomeBanner({ role, title, subtitle, stats, decoration }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const Icon = config.icon;
  const greeting = getGreeting();
  const navigate = useNavigate();

  return (
    <div className={`welcome-banner${decoration === 'admin' ? ' welcome-banner--admin' : ''}`}>
      {/* 装饰光晕 */}
      <div className="welcome-banner-orb" />

      {/* 图标 */}
      <div className="welcome-banner-icon" style={{ background: `linear-gradient(135deg, ${config.gradient} 0%, rgba(11,101,101,0.04) 100%)` }}>
        <Icon size={28} style={{ color: 'var(--primary)' }} />
      </div>

      {/* 文字区 */}
      <div className="welcome-banner-text">
        <h1>
          <span className="welcome-banner-greeting">{greeting}，</span>
          {title}
        </h1>
        <p>{subtitle}</p>
      </div>

      {/* 管理员快捷入口 */}
      {decoration === 'admin' && (
        <div className="welcome-banner-shortcuts">
          {ADMIN_SHORTCUTS.map((item) => (
            <button
              key={item.path}
              className="welcome-banner-shortcut-btn"
              onClick={() => navigate(item.path)}
            >
              <item.icon size={13} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 右侧快捷统计（非管理员） */}
      {stats && stats.length > 0 && (
        <div className="welcome-banner-stats">
          {stats.map((stat, i) => (
            <div key={i} className="welcome-banner-stat-pill" style={{
              borderColor: stat.color ? `${stat.color}20` : 'rgba(11,101,101,0.08)',
            }}>
              <span className="welcome-banner-stat-value" style={{ color: stat.color || 'var(--primary-dark)' }}>
                {stat.value}
              </span>
              <span className="welcome-banner-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
