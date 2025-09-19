
import { Scene } from './types';

interface SimulationOptions {
  scene: Scene;
  onTick: (telemetry: any) => void;
  onAlert: (alert: any) => void;
}

export const SimulationEngine = {
  start: (options: SimulationOptions) => {
    console.log('Simulation Engine Started');
    const tickInterval = setInterval(() => {
      // Simulate a tick
      const telemetry = {
        timestamp: Date.now(),
        activeUnits: Math.floor(Math.random() * 20),
        cpuUsage: Math.random(),
      };
      options.onTick(telemetry);

      // Simulate an ethics alert
      if (Math.random() < 0.1) {
        const alert = {
          id: `alert-${Date.now()}`,
          severity: 'high',
          message: 'Ethics violation detected: Unplanned civilian interaction.',
        };
        options.onAlert(alert);
      }
    }, 2000);

    return () => {
      console.log('Simulation Engine Stopped');
      clearInterval(tickInterval);
    };
  },
};
