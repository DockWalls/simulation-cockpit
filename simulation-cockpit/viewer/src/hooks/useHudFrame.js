import { useState, useEffect } from 'react'

export function useHudFrame(pollInterval = 2000) {
  const [hudFrame, setHudFrame] = useState(null)

  useEffect(() => {
    const fetchFrame = async () => {
      try {
        const res = await fetch('/evidence/hud-frame.json')
        const data = await res.json()
        setHudFrame(data)
      } catch (err) {
        console.error('HUD frame fetch failed:', err)
      }
    }

    fetchFrame()
    const interval = setInterval(fetchFrame, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  return hudFrame
}