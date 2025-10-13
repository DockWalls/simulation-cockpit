import React, { useState, useEffect } from 'react';
import type { User } from './HUDOverlay';
import type { SimState } from '../../JVerseSimulationArenaPrototype';

interface BasicHUDProps {
  user: User;
  simState: SimState;
  expressionMap: Record<SimState, string>;
  moodMap: Record<SimState, string>;
}

const BasicHUD: React.FC<BasicHUDProps> = ({ user, simState, expressionMap, moodMap }) => {
  const [animClass, setAnimClass] = useState('fade-in');

  useEffect(() => {
    setAnimClass('fade-out');
    const timeout = setTimeout(() => {
      setAnimClass('fade-in');
    }, 150); // Delay between fade-out and fade-in

    return () => clearTimeout(timeout);
  }, [simState]);

  return (
    <div className={`hud basic hud-container ${moodMap[simState]}`}>
      <img
        src={`/avatars/${expressionMap[simState]}`}
        alt="User Avatar"
        className={`avatar-expression ${animClass} ${user.role}`}
      />
      <div>Basic View</div>
    </div>
  );
};

export default BasicHUD;
