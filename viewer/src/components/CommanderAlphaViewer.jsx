import React, { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'

export function CommanderAlphaViewer({ hudFrame }) {
  const { scene, animations } = useGLTF('/models/commander-alpha.glb')
  const { actions } = useAnimations(animations, scene)

  useEffect(() => {
    const anim = hudFrame?.avatar?.animation || 'idle'
    if (actions[anim]) {
      actions[anim].reset().fadeIn(0.5).play()
    }
    return () => actions[anim]?.fadeOut(0.5)
  }, [hudFrame, actions])

  return (
    <Canvas camera={{ position: [0, 2, 5] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
      <primitive object={scene} scale={1.5} />
    </Canvas>
  )
}