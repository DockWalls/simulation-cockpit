import React, { useState, useEffect } from 'react';
import type { User } from './HUDOverlay';
import type { SimState } from '../../JVerseSimulationArenaPrototype';

interface DataStreamHUDProps {
  user: User;
  simState: SimState;
  expressionMap: Record<SimState, string>;
  moodMap: Record<SimState, string>;
}

const DataStreamHUD: React.FC<DataStreamHUDProps> = ({ user, simState, expressionMap, moodMap }) => {
  const [animClass, setAnimClass] = useState('fade-in');

  useEffect(() => {
    setAnimClass('fade-out');
    const timeout = setTimeout(() => {
      setAnimClass('fade-in');
    }, 150); // Delay between fade-out and fade-in

    return () => clearTimeout(timeout);
  }, [simState]);

  return (
    <div className={`hud datastream hud-container ${moodMap[simState]}`}>
      <img
        src={`/avatars/${expressionMap[simState]}`}
        alt="Analyst Avatar"
        className={`avatar-expression ${animClass} ${user.role}`}
      />
      <div>Data Stream Active</div>
    </div>
  );
};

export default DataStreamHUD;
