import React, { useEffect, useRef, useState } from 'react';

const REGION_COORD: Record<string, [number, number]> = {
  TPE: [121.73, 25.15],
  EU: [10, 50],
};

export default function JVerseSimulationArenaPrototype() {
  const [ethicsAlerts, setEthicsAlerts] = useState<string[]>([]);
  const [selected, setSelected] = useState<'TPE'|'EU'|null>('TPE');
  const [newsFeed, setNewsFeed] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement|null>(null);
  const mapInstance = useRef<any|null>(null);
  const maplibreModuleRef = useRef<any|null>(null);

const dispatchAvatar = (region: 'TPE' | 'EU') => {
  const timestamp = new Date().toLocaleTimeString();
  setAvatarStatus({
    location: region,
    dispatchedAt: timestamp,
    mission: `Intel sweep in ${region}`,
    fatigue: 0,
  });

  console.log(`Avatar dispatched to ${region} at ${timestamp}`);

  let fatigueLevel = 0;
  const fatigueInterval = setInterval(() => {
    fatigueLevel += 10;
    setAvatarStatus(prev => prev ? { ...prev, fatigue: fatigueLevel } : prev);
    if (fatigueLevel === 70) {
      console.warn(`⚠️ Escalation triggered in ${region}: Avatar fatigue critical`);
      setAvatarStatus(prev => prev ? { ...prev, mission: 'Escalation protocol initiated' } : prev);
    }
    if (fatigueLevel >= 100) {
      clearInterval(fatigueInterval);
      setAvatarStatus(prev => prev ? { ...prev, mission: 'Mission complete' } : prev);
      console.log(`Mission complete in ${region}`);
    }
  }, 1000);
};


  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selected || !mapRef.current) return;

      if (!maplibreModuleRef.current) {
        const mod: any = await import('maplibre-gl');
        maplibreModuleRef.current = mod.default ?? mod;
      }
      const ML = maplibreModuleRef.current;
      const center = REGION_COORD[selected] || [0, 20];

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

        const el = document.createElement('div');
        el.style.width = '10px';
        el.style.height = '10px';
        el.style.borderRadius = '9999px';
        el.style.background = 'white';
        new ML.Marker({ element: el }).setLngLat(center).addTo(map);

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
  }, [selected]);

  useEffect(() => {
    const interval = setInterval(() => {
      const events = [
        "ECB announces emergency rate hike",
        "Cyberattack hits São Paulo logistics",
        "FDA approves AI surgical robotics",
        "Naval escalation in Taiwan Strait"
      ];
      const event = events[Math.floor(Math.random() * events.length)];
      evaluateEthics(event);
      setNewsFeed(prev => [...prev.slice(-4), event]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const evaluateEthics = (event: string) => {
  const violations: Record<string, string> = {
    "Cyberattack hits São Paulo logistics": "Supply chain integrity breach",
    "Naval escalation in Taiwan Strait": "Sovereignty violation",
    "FDA approves AI surgical robotics": "Unregulated medical autonomy",
    "ECB announces emergency rate hike": "Economic destabilization risk"
  };

  const alert = violations[event];
  if (alert) {
    setEthicsAlerts(prev => [...prev.slice(-4), `⚠️ Ethics Alert: ${alert}`]);
    console.warn(`Ethics violation detected: ${alert}`);
  }
};

  const [avatarStatus, setAvatarStatus] = useState<{
  location: string;
  dispatchedAt: string;
  mission: string;
  fatigue: number;
} | null>(null);

  return (
    <div style={{ padding:16, color:'#e2e8f0', background:'#0f172a', minHeight:'100vh' }}>
      <h1 style={{ margin:'0 0 12px 0' }}>J-Verse RedZone (Simulation)</h1>
      <div style={{ display:'flex', gap:12, marginBottom:12 }}>
        <button onClick={() => { setSelected('TPE'); dispatchAvatar('TPE'); }}>Open TPE Scene</button>
        <button onClick={() => { setSelected('EU'); dispatchAvatar('EU'); }}>Open EU Scene</button>
      </div>
      <div ref={mapRef} style={{ height:420, border:'1px solid #334155', borderRadius:12 }} />
      <ul style={{ fontSize:12, marginTop:16 }}>
        {newsFeed.map((event, idx) => <li key={idx}>{event}</li>)}
      </ul>
   
   {avatarStatus && (
  <div style={{
    marginTop: 24,
    padding: 12,
    background: '#1e293b',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.6
  }}>
    <strong>🧍 Avatar HUD</strong><br/>
    <span>📍 Location: {avatarStatus.location}</span><br/>
    <span>⏱️ Dispatched At: {avatarStatus.dispatchedAt}</span><br/>
    <span>🎯 Mission: {avatarStatus.mission}</span><br/>
    <span>💤 Fatigue: {avatarStatus.fatigue}%</span>
  </div>
)}
{ethicsAlerts.length > 0 && (
  <div style={{
    marginTop: 24,
    padding: 12,
    background: '#7f1d1d',
    borderRadius: 8,
    fontSize: 14,
    color: '#fef2f2',
    lineHeight: 1.6
  }}>
    <strong>🛡️ Ethics Overlay</strong>
    <ul>
      {ethicsAlerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
    </ul>
  </div>
)}

    </div>
  );
}
