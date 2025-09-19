import React, { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { comparePoseQuaternion } from '../../utils/comparePoseQuaternion'

export function AnalystBetaViewer({ hudFrame }) {
  // Placeholder for rigSpec until rigging.yaml is loaded
  const rigSpec = {}; 
  const poseMatch = hudFrame?.avatar && rigSpec[hudFrame.avatar.pose] ? comparePoseQuaternion(hudFrame.avatar, rigSpec[hudFrame.avatar.pose]) : true;

  const { scene, animations } = useGLTF('/models/analyst-beta.glb')
  const { actions } = useAnimations(animations, scene)

  useEffect(() => {
    const anim = hudFrame?.avatar?.animation || 'idle'
    if (actions[anim]) {
      actions[anim].reset().fadeIn(0.5).play()
    }
    return () => actions[anim]?.fadeOut(0.5)
  }, [hudFrame, actions])

  return (
    <>
      {!poseMatch && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          ⚠ Pose deviation detected
        </div>
      )}
      <Canvas camera={{ position: [0, 2, 5] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
      <primitive object={scene} scale={1.5} />
    </Canvas>
  )
}