import React from 'react';
import RadarHUD from './RadarHUD';
import DataStreamHUD from './DataStreamHUD';
import CommandHUD from './CommandHUD';
import BasicHUD from './BasicHUD';
import type { SimState } from '../../JVerseSimulationArenaPrototype';

// A basic User type, this can be expanded later
export interface User {
  role: 'pilot' | 'analyst' | 'admin' | 'basic';
  avatar: string;
  uid: string;
}

interface HUDOverlayProps {
  user: User;
  simState: SimState;
  expressionMap: Record<SimState, string>;
  moodMap: Record<SimState, string>;
}

const HUDOverlay: React.FC<HUDOverlayProps> = ({ user, simState, expressionMap, moodMap }) => {
  const props = { user, simState, expressionMap, moodMap };
  switch (user.role) {
    case 'pilot':
      return <RadarHUD {...props} />;
    case 'analyst':
      return <DataStreamHUD {...props} />;
    case 'admin':
      return <CommandHUD {...props} />;
    default:
      return <BasicHUD {...props} />;
  }
};

export default HUDOverlay;
