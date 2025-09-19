import { useEffect, useRef, useState } from 'react';
import { SimulationEngine } from './simulation/SimulationEngine';
import { tpeScene } from './scenes/tpe/scene';
import { AvatarRenderer } from './components/viewer/AvatarRenderer';
import { HUDPanel } from './components/hud/HUDPanel';
import { Dashboard } from './components/dashboard/Dashboard';
import { Scene } from './simulation/types';

const REGION_COORD: Record<string, [number, number]> = {
  TPE: [121.73, 25.15],
  EU: [10, 50],
};

export default function JVerseSimulationArenaPrototype() {
  const [ethicsAlerts, setEthicsAlerts] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any | null>(null);
  const maplibreModuleRef = useRef<any | null>(null);

  useEffect(() => {
    if (activeScene) {
      const stopSimulation = SimulationEngine.start({
        scene: activeScene,
        onTick: setTelemetry,
        onAlert: (alert) => setEthicsAlerts((prev) => [...prev, alert]),
      });

      return () => stopSimulation();
    }
  }, [activeScene]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!activeScene || !mapRef.current) return;

      if (!maplibreModuleRef.current) {
        const mod: any = await import('maplibre-gl');
        maplibreModuleRef.current = mod.default ?? mod;
      }
      const ML = maplibreModuleRef.current;
      const center = REGION_COORD[activeScene.id] || [0, 20];

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      try {
        const map = new ML.Map({
          container: mapRef.current,
          style: 'https://demotiles.maplibre.org/style.json',
          center,
          zoom: 6,
          attributionControl: false,
        });
        map.addControl(new ML.NavigationControl({ showCompass: false }), 'top-right');

        if (mounted) mapInstance.current = map;
      } catch (e) {
        console.error('MapLibre init error', e);
      }
    })();

    return () => {
      mounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activeScene]);

  return (
    <div style={{ padding: 16, color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ margin: '0 0 12px 0' }}>J-Verse RedZone (Simulation)</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button onClick={() => setActiveScene(tpeScene)}>Open TPE Scene</button>
        <button onClick={() => setActiveScene(null)}>Close Scene</button>
      </div>
      <div ref={mapRef} style={{ height: 420, border: '1px solid #334155', borderRadius: 12, position: 'relative' }}>
        {activeScene && <AvatarRenderer avatars={activeScene.avatars} />}
      </div>
      <HUDPanel data={telemetry} />
      <Dashboard alerts={ethicsAlerts} />
    </div>
  );
}
