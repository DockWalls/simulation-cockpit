import type { ReactNode } from 'react';
import './JVerseEnvironment.css';

export default function JVerseEnvironment({ scene, children }: { scene: string | null, children: ReactNode }) {
  return (
    <div className={`jverse-scene ${scene}`}>
      {/* Background, terrain, overlays */}
      {children}
    </div>
  );
}
