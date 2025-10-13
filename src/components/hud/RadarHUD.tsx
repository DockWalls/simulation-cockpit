import React, { useState, useEffect } from 'react';
import type { User } from './HUDOverlay';
import type { SimState } from '../../JVerseSimulationArenaPrototype';

interface RadarHUDProps {
  user: User;
  simState: SimState;
  expressionMap: Record<SimState, string>;
  moodMap: Record<SimState, string>;
}

const RadarHUD: React.FC<RadarHUDProps> = ({ user, simState, expressionMap, moodMap }) => {
  const [animClass, setAnimClass] = useState('fade-in');

  useEffect(() => {
    setAnimClass('fade-out');
    const timeout = setTimeout(() => {
      setAnimClass('fade-in');
    }, 150); // Delay between fade-out and fade-in

    return () => clearTimeout(timeout);
  }, [simState]);

  return (
    <div className={`hud radar hud-container ${moodMap[simState]}`}>
      <img
        src={`/avatars/${expressionMap[simState]}`}
        alt="Pilot Avatar"
        className={`avatar-expression ${animClass} ${user.role}`}
      />
      <div className="radar-sweep">Scanning...</div>
    </div>
  );
};

export default RadarHUD;
