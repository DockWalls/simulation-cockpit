import React, { useState, useEffect } from 'react';
import type { User } from './HUDOverlay';
import type { SimState } from '../../JVerseSimulationArenaPrototype';

interface CommandHUDProps {
  user: User;
  simState: SimState;
  expressionMap: Record<SimState, string>;
  moodMap: Record<SimState, string>;
}

const CommandHUD: React.FC<CommandHUDProps> = ({ user, simState, expressionMap, moodMap }) => {
  const [animClass, setAnimClass] = useState('fade-in');

  useEffect(() => {
    setAnimClass('fade-out');
    const timeout = setTimeout(() => {
      setAnimClass('fade-in');
    }, 150); // Delay between fade-out and fade-in

    return () => clearTimeout(timeout);
  }, [simState]);

  return (
    <div className={`hud command hud-container ${moodMap[simState]}`}>
      <img
        src={`/avatars/${expressionMap[simState]}`}
        alt="Admin Avatar"
        className={`avatar-expression ${animClass} ${user.role}`}
      />
      <div>Command & Control</div>
    </div>
  );
};

export default CommandHUD;
