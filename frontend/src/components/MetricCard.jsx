import { TrendingUp, Users, AlertTriangle, CheckCircle } from 'lucide-react';

const iconMap = {
  users: Users,
  trend: TrendingUp,
  alert: AlertTriangle,
  check: CheckCircle,
};

export default function MetricCard({ icon, label, value }) {
  const Icon = iconMap[icon] || TrendingUp;

  return (
    <div className="metric-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="metric-icon">
          <Icon size={16} />
        </div>
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value}</div>
        </div>
      </div>
    </div>
  );
}
