import { TrendingUp, Users, AlertTriangle, CheckCircle, Clock, Moon, Brain, GraduationCap, Wifi } from 'lucide-react';

const iconMap = {
  users: Users,
  trend: TrendingUp,
  alert: AlertTriangle,
  check: CheckCircle,
  clock: Clock,
  moon: Moon,
  brain: Brain,
  grad: GraduationCap,
  wifi: Wifi,
};

const colorStyles = {
  default: {
    iconBg: 'rgba(11,101,101,0.08)',
    iconColor: 'var(--primary)',
    valueColor: '#095050',
  },
  danger: {
    iconBg: 'rgba(192,57,43,0.08)',
    iconColor: 'var(--danger)',
    valueColor: 'var(--danger)',
  },
  success: {
    iconBg: 'rgba(26,138,90,0.08)',
    iconColor: 'var(--success)',
    valueColor: 'var(--success)',
  },
  warning: {
    iconBg: 'rgba(212,136,15,0.08)',
    iconColor: 'var(--warning)',
    valueColor: 'var(--warning)',
  },
};

export default function MetricCard({ icon, label, value, color = 'default' }) {
  const Icon = iconMap[icon] || TrendingUp;
  const style = colorStyles[color] || colorStyles.default;

  return (
    <div className="metric-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          className="metric-icon"
          style={{ background: style.iconBg, color: style.iconColor }}
        >
          <Icon size={16} />
        </div>
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color: style.valueColor }}>
            {typeof value === 'string' || typeof value === 'number' ? value : value}
          </div>
        </div>
      </div>
    </div>
  );
}
