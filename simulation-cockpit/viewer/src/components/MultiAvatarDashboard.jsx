import React from 'react'
import { useHudFrame } from '../hooks/useHudFrame'
import { CommanderAlphaViewer } from './CommanderAlphaViewer'
import { AnalystBetaViewer } from './AnalystBetaViewer'
import { OperatorGammaViewer } from './OperatorGammaViewer'

export default function MultiAvatarDashboard() {
  const hudFrame = useHudFrame()

  return (
    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
      {hudFrame?.persona === 'commander-alpha' && <CommanderAlphaViewer hudFrame={hudFrame} />}
      {hudFrame?.persona === 'analyst-beta' && <AnalystBetaViewer hudFrame={hudFrame} />}
      {hudFrame?.persona === 'operator-gamma' && <OperatorGammaViewer hudFrame={hudFrame} />}
    </div>
  )
}