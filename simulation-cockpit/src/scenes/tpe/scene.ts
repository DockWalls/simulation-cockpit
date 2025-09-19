
import { Scene } from '../../simulation/types';

export const tpeScene: Scene = {
  id: 'tpe',
  name: 'Taipei Threat Matrix',
  avatars: [
    {
      id: 'spike',
      role: 'Logistics Analyst',
      position: { x: 120, y: 80 },
      status: 'active',
      asset: '/avatars/spike.png',
    },
    {
      id: 'jet',
      role: 'Cyber Warfare Specialist',
      position: { x: 250, y: 150 },
      status: 'active',
      asset: '/avatars/jet.png',
    },
    {
      id: 'faye',
      role: 'Intelligence Officer',
      position: { x: 400, y: 220 },
      status: 'active',
      asset: '/avatars/faye.png',
    },
  ],
};
