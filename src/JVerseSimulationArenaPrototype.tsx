import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import HUDOverlay, { type User } from './components/hud/HUDOverlay';
import AvatarRenderer from './AvatarRenderer';
import JVerseEnvironment from './JVerseEnvironment';
import { database } from './firebase';
import { ref, push, set, get } from 'firebase/database';
import { AvatarFactoryPanel } from './components/AvatarFactoryPanel';

const expressionMap = {
  idle: 'faye.png',
  success: 'jet.png',
  error: 'spike.png',
  alert: 'faye.png',
  engaged: 'jet.png',
};

const soundMap = {
  idle: 'idle.mp3',
  success: 'success.mp3',
  error: 'error.wav',
  alert: 'alert.wav',
  engaged: 'engaged.mp3',
};

const voiceCommandMap: Record<string, SimState> = {
  engage: 'engaged',
  alert: 'alert',
  success: 'success',
  error: 'error',
  reset: 'idle',
};

const moodMap = {
  idle: 'neutral',
  success: 'bright',
  error: 'dim',
  alert: 'red-flash',
  engaged: 'focused',
};

export type SimState = 'idle' | 'success' | 'error' | 'alert' | 'engaged';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function JVerseSimulationArenaPrototype() {
  const [ethicsAlerts, setEthicsAlerts] = useState<string[]>([]);
  const [selected, setSelected] = useState<'TPE'|'EU'|null>('TPE');
  const [newsFeed, setNewsFeed] = useState<string[]>([]);

  const [simState, setSimState] = useState<SimState>('idle');
  const lastChange = useRef(Date.now());
  const [muted, setMuted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [missionInProgress, setMissionInProgress] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User>({
    role: 'pilot',
    avatar: 'J-1 A Futuristic Soldier with HUD Gauntlet No back.png',
    uid: 'user-123',
  });

  useEffect(() => {
    const expressionAnalyticsRef = ref(database, 'expressionAnalytics');
    push(expressionAnalyticsRef, {
      userId: currentUser.uid,
      role: currentUser.role,
      expression: simState,
      timestamp: Date.now(),
    });
  }, [simState, currentUser.uid, currentUser.role]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        const matchedState = voiceCommandMap[transcript];
        if (matchedState) {
          updateSimState(matchedState);
        }
      };
      recognitionRef.current = recognition;
    }
  }, []);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    const backendUrl = 'https://jverse-backend-573246767892.us-central1.run.app';
    const socket = io(backendUrl);

    socket.on('connect', () => {
      console.log(`[${new Date().toISOString()}] Connected to backend WebSocket`);
    });

    socket.on('simulation-update', (data: any) => {
      if (data.newsFeed) {
        setNewsFeed(prev => [...prev.slice(-4), data.newsFeed]);
      }
      if (data.ethicsAlert) {
        setEthicsAlerts(prev => [...prev.slice(-4), `Ethics Alert: ${data.ethicsAlert}`]);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[${new Date().toISOString()}] Disconnected from backend WebSocket`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log('Audio unlock useEffect ran');
    let audioContext: AudioContext | null = null;

    const unlockAudio = () => {
      console.log('unlockAudio function called');
      if (!audioContext) {
        console.log('Creating new AudioContext');
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      console.log('AudioContext state:', audioContext.state);
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed successfully');
        }).catch(e => console.error('Error resuming AudioContext:', e));
      } else {
        console.log('AudioContext is not suspended, current state:', audioContext.state);
      }
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true }); // Also listen for touch events

    return () => {
      console.log('Cleaning up audio unlock event listeners');
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      if (audioContext && audioContext.state !== 'closed') {
        console.log('Closing AudioContext');
        audioContext.close().catch(e => console.error('Error closing AudioContext:', e));
      }
    };
  }, []);

  const toggleListening = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
      setIsListening(prev => !prev);
    }
  };

  useEffect(() => {
    const userExpressionRef = ref(database, `users/${currentUser.uid}/expression`);
    get(userExpressionRef).then((snapshot) => {
      if (snapshot.exists()) {
        setSimState(snapshot.val());
      }
    });
  }, [currentUser.uid]);

  useEffect(() => {
    const userExpressionRef = ref(database, `users/${currentUser.uid}/expression`);
    set(userExpressionRef, simState);
  }, [simState, currentUser.uid]);

  useEffect(() => {
    if (!muted) {
      const audio = new Audio(`/sounds/${soundMap[simState]}`);
      audio.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [simState, muted]);

  useEffect(() => {
    if (currentEvent) {
      console.log("Current Event:", currentEvent);
    }
  }, [currentEvent]);

  const updateSimState = (newState: SimState) => {
    console.log(`Attempting to update simState to: ${newState}`);
    const now = Date.now();
    if (now - lastChange.current > 1000) { // 1s cooldown
      setSimState(newState);
      lastChange.current = now;
      console.log(`simState updated to: ${newState}`);
    } else {
      console.log(`simState update blocked by cooldown. Current simState: ${simState}`);
    }
  };

  const evaluateEthics = (event: string) => {
    console.log(`evaluateEthics called with event: ${event}`);
    setCurrentEvent(event);
    const violations: Record<string, string> = {
      "Cyberattack hits São Paulo logistics": "Supply chain integrity breach",
      "Naval escalation in Taiwan Strait": "Sovereignty violation",
      "FDA approves AI surgical robotics": "Unregulated medical autonomy",
      "ECB announces emergency rate hike": "Economic destabilization risk"
    };

    const alert = violations[event];
    if (alert) {
      console.log(`Ethics alert triggered for event: ${event}, alert: ${alert}`);
      setEthicsAlerts(prev => [...prev.slice(-4), `Ethics Alert: ${alert}`]);
      updateSimState('error');
    } else {
      console.log(`No ethics alert for event: ${event}`);
    }
  };

  const dispatchAvatar = (region: 'TPE' | 'EU') => {
    if (missionInProgress) {
      console.warn(`[${new Date().toISOString()}] Mission already in progress. Cannot dispatch to ${region}.`);
      return;
    }
    setMissionInProgress(true);
    updateSimState('engaged');

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Avatar dispatched to ${region}`);

    let fatigueLevel = 0;
    const fatigueInterval = setInterval(() => {
      fatigueLevel += 10;
      if (fatigueLevel === 70) {
        console.warn(`[${new Date().toISOString()}] Escalation triggered in ${region}: Avatar fatigue critical`);
        updateSimState('alert');
      }
      if (fatigueLevel >= 100) {
        clearInterval(fatigueInterval);
        console.log(`[${new Date().toISOString()}] Mission complete in ${region}`);
        updateSimState('success');
        setMissionInProgress(false);
      }
    }, 1000);
  };

  return (
    <div
      style={{ padding:16, color:'#e2e8f0', background:'#0f172a', minHeight:'100vh' }}
    >
      <h1 style={{ margin:'0 0 12px 0', position: 'relative', zIndex: 1 }}>J-Verse RedZone (Simulation)</h1>
      <div style={{ border: '1px solid #334155', padding: '16px', margin: '16px 0', borderRadius: '8px' }}>
        <AvatarFactoryPanel />
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:12, position: 'relative', zIndex: 1 }}>
        <button onClick={() => { setSelected('TPE'); dispatchAvatar('TPE'); }}>Open TPE Scene</button>
        <button onClick={() => { setSelected('EU'); dispatchAvatar('EU'); }}>Open EU Scene</button>
        <button onClick={() => setMuted(prev => !prev)}>{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleListening}>{isListening ? 'Voice Off' : 'Voice On'}</button>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:12, position: 'relative', zIndex: 1 }}>
        <button onClick={() => setCurrentUser(prev => ({ ...prev, role: 'pilot' }))}>Set Role: Pilot</button>
        <button onClick={() => setCurrentUser(prev => ({ ...prev, role: 'analyst' }))}>Set Role: Analyst</button>
        <button onClick={() => setCurrentUser(prev => ({ ...prev, role: 'admin' }))}>Set Role: Admin</button>
        <button onClick={() => setCurrentUser(prev => ({ ...prev, role: 'basic' }))}>Set Role: Basic</button>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:12, position: 'relative', zIndex: 1 }}>
        <button onClick={() => updateSimState('idle')}>Set State: Idle</button>
        <button onClick={() => updateSimState('success')}>Set State: Success</button>
        <button onClick={() => updateSimState('error')}>Set State: Error</button>
        <button onClick={() => updateSimState('alert')}>Set State: Alert</button>
        <button onClick={() => updateSimState('engaged')}>Set State: Engaged</button>
      </div>
      <JVerseEnvironment scene={selected}>
        <AvatarRenderer simState={simState} role={currentUser.role} avatar={currentUser.avatar} event={currentEvent} />
      </JVerseEnvironment>
      <ul style={{ fontSize:12, marginTop:16, position: 'relative', zIndex: 1, cursor: 'pointer' }}>
        {newsFeed.map((event, idx) => <li key={idx} onClick={() => evaluateEthics(event)}>{event}</li>)}
      </ul>

      <HUDOverlay user={currentUser} simState={simState} expressionMap={expressionMap} moodMap={moodMap} />

{ethicsAlerts.length > 0 && (
  <div style={{
    marginTop: 24,
    padding: 12,
    background: '#7f1d1d',
    borderRadius: 8,
    fontSize: 14,
    color: '#fef2f2',
    lineHeight: 1.6,
    position: 'relative',
    zIndex: 1
  }}>
    <strong>Ethics Overlay</strong>
    <ul>
      {ethicsAlerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
    </ul>
  </div>
)}

    </div>
  );
}
