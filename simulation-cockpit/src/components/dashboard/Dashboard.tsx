
interface DashboardProps {
  alerts: any[];
}

export function Dashboard({ alerts }: DashboardProps) {
  if (alerts.length === 0) return null;

  return (
    <div style={{
      marginTop: 24,
      padding: 12,
      background: '#7f1d1d',
      borderRadius: 8,
      fontSize: 14,
      color: '#fef2f2',
      lineHeight: 1.6
    }}>
      <strong>🛡️ Ethics Dashboard</strong>
      <ul>
        {alerts.map(alert => <li key={alert.id}>{alert.message}</li>)}
      </ul>
    </div>
  );
}
