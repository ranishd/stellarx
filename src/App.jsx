import React, { useState, useEffect } from 'react';
import AutopilotHUD from './components/AutopilotHUD';
import SpaceGlobe from './components/SpaceGlobe';
import HardwareUplink from './components/HardwareUplink';
import CommanderView from './components/CommanderView';
import DecisionCards from './components/DecisionCards';
import AgentActivityGraph from './components/AgentActivityGraph';
import MissionReplay from './components/MissionReplay';
import AutonomyAnalytics from './components/AutonomyAnalytics';

const WS_URL = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.hostname + ':8080';

function ChaosPanel({ ws }) {
  const [activeBtn, setActiveBtn] = useState(null);

  const injectChaos = (payload) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setActiveBtn(payload);
      ws.send(JSON.stringify({ type: 'INJECT_CHAOS', payload }));
      setTimeout(() => setActiveBtn(null), 1500);
    }
  };

  return (
    <div className="border border-white/20 p-6 flex flex-col gap-4 font-mono w-full bg-black/60 backdrop-blur-md">
      <h2 className="text-sm tracking-[0.2em] text-white/60 mb-2">CHAOS INJECTION</h2>
      <button onClick={() => injectChaos('DEBRIS_STORM')} className="bg-transparent border border-neon-red text-neon-red py-1 px-4 hover:bg-neon-red hover:text-space-black transition-colors duration-300 cursor-pointer">
        {activeBtn === 'DEBRIS_STORM' ? 'INJECTING...' : 'DEBRIS STORM'}
      </button>
      <button onClick={() => injectChaos('SOLAR_FLARE')} className="bg-transparent border border-white/50 text-white/80 py-1 px-4 hover:bg-white hover:text-space-black transition-colors duration-300 cursor-pointer">
        {activeBtn === 'SOLAR_FLARE' ? 'INJECTING...' : 'SOLAR FLARE'}
      </button>
      <button onClick={() => injectChaos('SYSTEM_FAILURE')} className="bg-red-500/20 border border-red-500 text-red-500 py-1 px-4 hover:bg-red-500 hover:text-white transition-colors duration-300 font-bold cursor-pointer">
        {activeBtn === 'SYSTEM_FAILURE' ? 'INJECTING...' : 'SYSTEM FAILURE'}
      </button>
    </div>
  );
}

function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [decision, setDecision] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const [recoveryBanner, setRecoveryBanner] = useState(false);
  const [ws, setWs] = useState(null);
  const [viewMode, setViewMode] = useState('COMMANDER');
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoOverlay, setDemoOverlay] = useState(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    setWs(socket);

    socket.onopen = () => console.log('Connected to StellarX Telemetry');
    
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'TELEMETRY_STREAM') {
          setTelemetry(msg.data);
        } else if (msg.type === 'AGENT_DECISION') {
          setDecision(msg.data);
        } else if (msg.type === 'MISSION_HANDOFF') {
          setHandoff(msg.data);
          // Show handoff for 3s, then flash recovery banner
          setTimeout(() => {
            setHandoff(null);
            setRecoveryBanner(true);
            setTimeout(() => setRecoveryBanner(false), 4000);
          }, 3000);
        } else if (msg.type === 'CLEAR_DECISION') {
          setDecision(null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => socket.close();
  }, []);

  // DEMO MODE
  const runDemo = () => {
    if (!ws || demoRunning) return;
    setDemoRunning(true);
    setViewMode('EGO');
    setDemoOverlay('STAGE 1: Normal operation. Observing constellation...');

    setTimeout(() => {
      setDemoOverlay('STAGE 2: Injecting critical hardware failure...');
    }, 3000);

    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'INJECT_CHAOS', payload: 'SYSTEM_FAILURE' }));
      setDemoOverlay('STAGE 3: Satellite offline. Coverage dropping...');
    }, 5000);

    setTimeout(() => {
      setDemoOverlay('STAGE 4: AI reasoning. Mission reassignment in progress...');
    }, 8000);

    setTimeout(() => {
      setDemoOverlay('STAGE 5: Coverage restored. Fleet stabilized.');
    }, 11000);

    setTimeout(() => {
      setDemoOverlay('AUTONOMOUS RECOVERY COMPLETE\nOperator Intervention Required: 0');
    }, 14000);

    setTimeout(() => {
      setDemoOverlay(null);
      setDemoRunning(false);
    }, 18000);
  };

  const activeNode = activeNodeId 
      ? telemetry?.constellation?.find(n => n.id === activeNodeId) 
      : telemetry?.constellation?.[0];

  const sat = activeNode || { id: 'WAITING...', status: '...', task: '...', altitude: 0, velocity: 0, fuel: 0, battery: 0, a:0, e:0, i:0, raan:0, arg_p:0, mission: null };
  const coverage = telemetry?.globalKpis?.coverageScore || 98;
  const missionSuccess = telemetry?.globalKpis?.missionSuccessRate || 84.1;
  const survival = telemetry?.globalKpis?.fleetSurvivalProbability || 97.4;
  const autoDecisions = telemetry?.globalKpis?.autonomousDecisions || 127;
  
  // Calculate Stellar Index
  const stellarIndex = ((coverage * 0.4) + (missionSuccess * 0.4) + (survival * 0.2)).toFixed(1);

  // Determine Constellation Visual State
  let visualState = 'NOMINAL';
  if (telemetry?.globalKpis?.activeAnomalies?.length > 0) {
    visualState = 'THREAT';
  } else if (handoff || decision || recoveryBanner) {
    visualState = 'ANALYSIS';
  }

  const statusColors = {
    NOMINAL: 'bg-green-400 text-black',
    ANALYSIS: 'bg-cyan-400 text-black',
    THREAT: 'bg-red-500 text-white animate-pulse',
  };

  // Commander Narration
  let aiStatus = 'NOMINAL';
  if (handoff) {
    aiStatus = 'HANDOFF IN PROGRESS';
  } else if (recoveryBanner) {
    aiStatus = 'RECOVERING';
  } else if (decision) {
    aiStatus = 'OPTIMIZING';
  } else if (telemetry?.globalKpis?.activeAnomalies?.length > 0) {
    aiStatus = 'FORECASTING';
  }

  return (
    <>
      {/* Demo Overlay */}
      {demoOverlay && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="font-serif text-4xl text-white tracking-tight whitespace-pre-line leading-relaxed">{demoOverlay}</div>
            {demoOverlay.includes('AUTONOMOUS RECOVERY') && (
              <div className="mt-8 text-green-400 text-lg font-mono tracking-widest animate-pulse">FLEET NOMINAL</div>
            )}
          </div>
        </div>
      )}

      {/* Recovery Celebration Banner */}
      {recoveryBanner && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center pointer-events-none bg-green-900/20 mix-blend-screen transition-opacity duration-1000">
          <div className="text-center animate-[bounce_1s_ease-in-out]">
            <div className="text-green-400 text-2xl font-mono tracking-[0.5em] mb-4">AUTONOMOUS RECOVERY</div>
            <div className="font-serif text-[8rem] leading-none text-white drop-shadow-[0_0_30px_rgba(74,222,128,0.5)]">
              COVERAGE RESTORED
            </div>
          </div>
        </div>
      )}

      {/* Handoff Notification */}
      {handoff && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[150] bg-black/90 backdrop-blur-md border border-white px-12 py-6 font-mono text-center shadow-[0_0_50px_rgba(255,255,255,0.2)]">
          <div className="text-xs text-white/50 tracking-[0.3em] mb-2">MISSION TRANSFER</div>
          <div className="text-xl text-white"><span className="text-white/80">{handoff.from}</span> → <span className="text-white/80">{handoff.to}</span></div>
        </div>
      )}

      {/* Background layer for EGO view */}
      {viewMode === 'EGO' && (
        <div className="fixed inset-0 z-0 pointer-events-auto">
          <AutopilotHUD telemetry={telemetry} decision={decision} visualState={visualState} />
        </div>
      )}

      {/* Main UI Overlay Grid */}
      <div className={`poster-grid relative z-10 overflow-hidden ${viewMode === 'EGO' ? 'pointer-events-none' : ''}`}>
        
        {/* Top Bar */}
        <div className="col-start-1 col-end-4 row-start-1 flex justify-between items-start mb-8 pointer-events-auto bg-black/40 backdrop-blur-md p-4 border-b border-white/10 z-50">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold tracking-[0.2em] text-white">STELLAR<span className="text-white/50">X</span></h1>
              <div className="text-xs font-mono text-white/50 tracking-widest flex items-center gap-6">
                <button onClick={() => setViewMode('COMMANDER')} className={`hover:text-white transition-colors pb-1 border-b-2 cursor-pointer ${viewMode === 'COMMANDER' ? 'text-white border-white' : 'border-transparent'}`}>COMMANDER</button>
                <button onClick={() => setViewMode('FLEET')} className={`hover:text-white transition-colors pb-1 border-b-2 cursor-pointer ${viewMode === 'FLEET' ? 'text-white border-white' : 'border-transparent'}`}>FLEET</button>
                <button onClick={() => setViewMode('EGO')} className={`hover:text-white transition-colors pb-1 border-b-2 cursor-pointer ${viewMode === 'EGO' ? 'text-white border-white' : 'border-transparent'}`}>EGO VIEW</button>
                <button onClick={() => setViewMode('ANALYTICS')} className={`hover:text-white transition-colors pb-1 border-b-2 cursor-pointer ${viewMode === 'ANALYTICS' ? 'text-green-400 border-green-400' : 'border-transparent'}`}>IMPACT</button>
              </div>
            </div>
            
            {/* Commander Narration Layer */}
            <div className={`font-mono text-[10px] tracking-widest flex items-center gap-3 px-3 py-1 rounded w-fit ${statusColors[visualState]}`}>
              <span className="text-inherit opacity-60">AI STATUS</span>
              <span className="font-bold uppercase">{aiStatus}</span>
            </div>
          </div>
          
          {/* Fleet Intelligence Index (Center) */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-[9px] tracking-[0.3em] text-white/40 mb-1">STELLAR INDEX</div>
            <div className="text-3xl font-serif tracking-tighter drop-shadow-md text-white">
              {stellarIndex}
            </div>
          </div>
          
          {/* Live Global Metrics */}
          <div className="flex gap-8 items-center text-xs font-mono text-right mt-1">
             <div><span className="text-white/40 block text-[9px] mb-1 tracking-widest">COVERAGE</span><span className="text-white">{coverage.toFixed(0)}%</span></div>
             <div><span className="text-white/40 block text-[9px] mb-1 tracking-widest">MISSION SUCCESS</span><span className="text-white">{missionSuccess.toFixed(1)}%</span></div>
             <div className="border-l border-white/20 pl-6">
                <span className="text-white/40 block text-[9px] mb-1 tracking-widest">AUTONOMOUS DECISIONS</span>
                <span key={autoDecisions} className="text-cyan-400 text-lg font-bold inline-block animate-[pulse_0.5s_ease-out]">{autoDecisions}</span>
             </div>
             <button 
               onClick={runDemo} 
               disabled={demoRunning}
               className={`ml-4 px-4 py-2 border text-[10px] tracking-widest cursor-pointer transition-colors ${demoRunning ? 'border-white/20 text-white/30' : 'border-green-400 text-green-400 hover:bg-green-400 hover:text-black'}`}
             >
               {demoRunning ? 'RUNNING...' : 'DEMO'}
             </button>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'COMMANDER' ? (
          <div className="col-start-1 col-end-4 row-start-2 h-[800px] pointer-events-auto">
             <CommanderView telemetry={telemetry} visualState={visualState} />
          </div>
        ) : viewMode === 'ANALYTICS' ? (
          <div className="col-start-1 col-end-4 row-start-2 h-[800px] pointer-events-auto">
             <AutonomyAnalytics telemetry={telemetry} />
          </div>
        ) : viewMode === 'FLEET' ? (
          <>
            <div className="col-start-1 col-end-4 row-start-2 flex items-center justify-center p-8 h-[600px] pointer-events-auto relative">

               {/* Simulation Time Control */}
               <div className="absolute top-12 right-12 z-20 flex flex-col items-end text-right font-mono text-xs">
                 <span className="block text-white/30 tracking-widest mb-2">SIMULATION TIME</span>
                 <div className="flex gap-2 text-white/50">
                   {[0, 1, 10, 100].map(mult => (
                     <button 
                       key={mult}
                       onClick={() => {
                         if(ws?.readyState === 1) {
                           ws.send(JSON.stringify({ type: 'SET_TIME_MULTIPLIER', payload: mult }));
                         }
                       }}
                       className={`px-3 py-1 border border-white/20 hover:border-white hover:text-white transition-colors cursor-pointer ${telemetry?.timeMultiplier === mult ? 'bg-white text-black border-white' : 'bg-black/50 backdrop-blur-sm'}`}
                     >
                       {mult === 0 ? 'PAUSE' : `${mult}X`}
                     </button>
                   ))}
                 </div>
               </div>

               <SpaceGlobe 
                 telemetry={telemetry} 
                 visualState={visualState}
                 handoffEvent={handoff}
                 onSelectNode={(id) => {
                   setActiveNodeId(id);
                   setViewMode('EGO');
                 }} 
               />
            </div>
            
            <div className="col-start-1 col-end-4 row-start-3 text-center text-xs font-mono text-white/30 mt-4 pointer-events-auto">
              SELECT A SATELLITE NODE FROM THE CONSTELLATION TO DIVE INTO EGO-CENTRIC ORCHESTRATION.
            </div>
          </>
        ) : (
          <>
            {/* EGO View: Side Drawer */}
            <div className={`fixed right-0 top-24 bottom-0 w-80 bg-black/90 backdrop-blur-xl border-l border-white/20 font-mono text-xs text-white/60 transition-transform duration-500 z-[110] pointer-events-auto flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
               <div 
                 className="absolute -left-6 top-1/2 -translate-y-1/2 bg-black/90 border border-white/20 px-1 py-4 text-[10px] tracking-widest text-white/50 cursor-pointer hover:bg-white/10 hover:text-white transition-colors z-10" 
                 style={{ writingMode: 'vertical-rl' }}
                 onClick={() => setIsDrawerOpen(!isDrawerOpen)}
               >
                 TELEMETRY
               </div>
               
               <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-6 pb-16">
                 <h2 className="text-sm text-white tracking-[0.2em] mb-2">RAW TELEMETRY</h2>
                 <div className="grid grid-cols-2 gap-4">
                   <div><span className="block text-white/30">NODE ID</span><span className="text-white">{sat.id}</span></div>
                   <div><span className="block text-white/30">STATUS</span><span className={sat.status === 'NOMINAL' ? 'text-white' : 'text-neon-red font-bold animate-pulse'}>{sat.status}</span></div>
                   
                   <div className="col-span-2 border-t border-white/10 pt-2 mt-1"></div>
                   
                   <div><span className="block text-white/30">SPECIALIZATION</span><span className="text-white">{sat.specialization || 'MULTI-ROLE'}</span></div>
                   <div><span className="block text-white/30">AI CONFIDENCE</span><span className="text-white">{sat.confidence || 94}%</span></div>
                   
                   <div className="col-span-2 border-t border-white/10 pt-2 mt-1"></div>

                   <div><span className="block text-white/30">REMAINING ΔV</span><span className="text-white">{sat.remainingDeltaV || '145.2'} m/s</span></div>
                   <div><span className="block text-white/30">EST. MANEUVER</span><span className="text-white">{sat.nextBurn || '2.3'} m/s</span></div>
                   
                   <div className="col-span-2 border-t border-white/10 pt-2 mt-1"></div>

                   <div><span className="block text-white/30">MISSION</span><span className="text-white/80">{sat.mission?.label || '—'}</span></div>
                   <div><span className="block text-white/30">PRIORITY</span><span>{sat.mission?.priority || '—'}</span></div>
                   <div><span className="block text-white/30">ALTITUDE</span><span>{sat.altitude.toFixed(1)} KM</span></div>
                   <div><span className="block text-white/30">VELOCITY</span><span>{sat.velocity.toFixed(2)} KM/S</span></div>
                   <div><span className="block text-white/30">FUEL</span><span>{sat.fuel.toFixed(1)} %</span></div>
                   <div><span className="block text-white/30">POWER</span><span>{sat.battery.toFixed(1)} %</span></div>
                   <div><span className="block text-white/30">INCLINATION</span><span>{(sat.i * (180/Math.PI)).toFixed(2)}°</span></div>
                   <div><span className="block text-white/30">ECCENTRICITY</span><span>{sat.e.toFixed(4)}</span></div>
                 </div>

                 <div className="border-t border-white/20 pt-6">
                   <h2 className="text-sm text-white tracking-[0.2em] mb-4">PHYSICS MODULES</h2>
                   <div className="flex justify-between text-white mb-2"><span>KEPLERIAN 2-BODY</span><span>[ ACTIVE ]</span></div>
                   <div className="flex justify-between text-white/30 mb-2"><span>J2 PERTURBATION</span><span>[ V2.0 ]</span></div>
                   <div className="flex justify-between text-white/30 mb-2"><span>ATMOSPHERIC DRAG</span><span>[ V2.0 ]</span></div>
                 </div>

                 {/* Mission Replay Timeline */}
                 <div className="border-t border-white/20 pt-6">
                   <div className="font-mono text-xs text-white/50 tracking-[0.2em] mb-4">MISSION REPLAY LOG</div>
                   <MissionReplay eventLog={telemetry?.eventLog} />
                 </div>
               </div>
            </div>

            {/* Bottom Controls */}
            <div className="fixed bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none z-[100] gap-4">
              
              {/* LEFT: Chaos */}
              <div className="w-[300px] pointer-events-auto flex flex-col gap-4">
                <ChaosPanel ws={ws} />
              </div>
              
              {/* CENTER: Agent Activity */}
              <div className="flex-1 max-w-[600px] pointer-events-auto h-[180px]">
                {decision && <AgentActivityGraph decision={decision} />}
              </div>

              {/* RIGHT: AI Decision Cards & Forecast */}
              <div className="w-[450px] pointer-events-auto flex flex-col justify-end">
                {decision ? <DecisionCards decision={decision} coverage={coverage} /> : (
                   <div className="bg-black/80 backdrop-blur-md border border-white/10 p-6 font-mono text-xs text-white/50 text-center shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                     SYSTEM NOMINAL. AWAITING CHAOS INJECTION.
                   </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}

export default App;
