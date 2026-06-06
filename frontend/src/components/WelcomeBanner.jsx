import { Shield, GraduationCap, User, Users } from 'lucide-react';

const ROLE_CONFIG = {
  admin: { icon: Shield, gradient: 'rgba(11,101,101,0.1)' },
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

export default function WelcomeBanner({ role, title, subtitle, stats }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const Icon = config.icon;
  const greeting = getGreeting();

  return (
    <div className="welcome-banner">
      {/* 装饰光晕 */}
      <div className="welcome-banner-orb" />

      {/* 图标 */}
      <div className="welcome-banner-icon" style={{ background: `linear-gradient(135deg, ${config.gradient} 0%, rgba(11,101,101,0.04) 100%)` }}>
        <Icon size={24} style={{ color: 'var(--primary)' }} />
      </div>

      {/* 文字区 */}
      <div className="welcome-banner-text">
        <h1>
          <span className="welcome-banner-greeting">{greeting}，</span>
          {title}
        </h1>
        <p>{subtitle}</p>
      </div>

      {/* 右侧快捷统计 */}
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
