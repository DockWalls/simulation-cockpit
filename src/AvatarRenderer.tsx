import { useEffect, useState } from 'react';
import './AvatarRenderer.css'; // for movement styles
import type { SimState } from './JVerseSimulationArenaPrototype';

const movementMap: Record<string, { x: number; y: number }> = {
  'Cyberattack hits São Paulo logistics': { x: 100, y: 50 },
  'Naval escalation in Taiwan Strait': { x: 200, y: 150 },
};

export default function AvatarRenderer({ simState, role, avatar, event }: { simState: SimState, role: string, avatar: string, event: string | null }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (simState === 'engaged') {
      const interval = setInterval(() => {
        setPosition(prev => ({
          x: prev.x + Math.floor(Math.random() * 10),
          y: prev.y + Math.floor(Math.random() * 10),
        }));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [simState]);

  useEffect(() => {
    if (event && movementMap[event]) {
      setPosition(movementMap[event]);
    }
  }, [event]);

  if (!role || simState === 'idle') return null;

  return (
    <div
      className="avatar-container"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: 'transform 0.5s ease-in-out',
      }}
    >
      <img src={`/avatars/${avatar}`} alt={`${role} Avatar`} />
    </div>
  );
}
