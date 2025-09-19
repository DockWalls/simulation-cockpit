
interface HUDPanelProps {
  data: any;
}

export function HUDPanel({ data }: HUDPanelProps) {
  if (!data) return null;

  return (
    <div style={{
      marginTop: 24,
      padding: 12,
      background: '#1e293b',
      borderRadius: 8,
      fontSize: 14,
      lineHeight: 1.6
    }}>
      <strong>📊 Telemetry HUD</strong><br/>
      <span>Timestamp: {data.timestamp}</span><br/>
      <span>Active Units: {data.activeUnits}</span><br/>
      <span>CPU Usage: {data.cpuUsage.toFixed(2)}%</span>
    </div>
  );
}
