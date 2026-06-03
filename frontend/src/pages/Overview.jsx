import MetricCard from '../components/MetricCard';
import LiquidCard from '../components/LiquidCard';

export default function Overview() {
  return (
    <div>
      <h1 style={{ marginBottom: '1.25rem' }}>学情概览</h1>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.25rem' }}>
        <MetricCard icon="users" label="学生总数" value="--" />
        <MetricCard icon="trend" label="平均成绩" value="--" />
        <MetricCard icon="alert" label="高风险学生" value="--" />
        <MetricCard icon="check" label="及格率" value="--" />
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <LiquidCard title="成绩分布">
          <p className="text-tertiary">图表将在后续步骤实现</p>
        </LiquidCard>
        <LiquidCard title="班级统计">
          <p className="text-tertiary">图表将在后续步骤实现</p>
        </LiquidCard>
      </div>
    </div>
  );
}
