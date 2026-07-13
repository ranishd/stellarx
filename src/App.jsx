import React, { useState, useEffect } from 'react';
import AutopilotHUD from './components/AutopilotHUD';
import SpaceGlobe from './components/SpaceGlobe';
import HardwareUplink from './components/HardwareUplink';
import CommanderView from './components/CommanderView';
import DecisionCards from './components/DecisionCards';
import AgentActivityGraph from './components/AgentActivityGraph';
import MissionReplay from './components/MissionReplay';
import AutonomyAnalytics from './components/AutonomyAnalytics';

const WS_URL = window.location.hostname === 'localhost' ? 'ws://localhost:8080' : 'wss://stellarx-backend-h4v7.onrender.com';

function ChaosPanel({ ws, isAwaitingAI, setIsAwaitingAI, activeBtn, setActiveBtn }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const injectChaos = (payload) => {
    if (ws && ws.readyState === WebSocket.OPEN && !isAwaitingAI) {
      setActiveBtn(payload);
      setIsAwaitingAI(true);
      ws.send(JSON.stringify({ type: 'INJECT_CHAOS', payload }));
      setIsExpanded(false);
    }
  };

  return (
    <div className="border border-white/20 p-4 md:p-6 flex flex-col gap-4 font-mono w-full bg-black/60 backdrop-blur-md">
      <div className="flex justify-between items-center cursor-pointer md:cursor-default" onClick={() => setIsExpanded(!isExpanded)}>
        <h2 className="text-sm tracking-[0.2em] text-white/60">CHAOS INJECTION</h2>
        <span className="md:hidden text-white/60">{isExpanded ? '▼' : '▲'}</span>
      </div>
      <div className={`${isExpanded ? 'flex' : 'hidden'} md:flex flex-col gap-2 md:gap-4`}>
        <button disabled={isAwaitingAI} onClick={() => injectChaos('DEBRIS_STORM')} className={`bg-transparent border border-neon-red text-neon-red py-1 md:py-1 px-4 text-[10px] md:text-sm transition-colors duration-300 ${isAwaitingAI ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neon-red hover:text-space-black cursor-pointer'}`}>
          {activeBtn === 'DEBRIS_STORM' ? 'AWAITING AI...' : 'DEBRIS STORM'}
        </button>
        <button disabled={isAwaitingAI} onClick={() => injectChaos('SOLAR_FLARE')} className={`bg-transparent border border-white/50 text-white/80 py-1 md:py-1 px-4 text-[10px] md:text-sm transition-colors duration-300 ${isAwaitingAI ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:text-space-black cursor-pointer'}`}>
          {activeBtn === 'SOLAR_FLARE' ? 'AWAITING AI...' : 'SOLAR FLARE'}
        </button>
        <button disabled={isAwaitingAI} onClick={() => injectChaos('SYSTEM_FAILURE')} className={`bg-red-500/20 border border-red-500 text-red-500 py-1 md:py-1 px-4 text-[10px] md:text-sm font-bold transition-colors duration-300 ${isAwaitingAI ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500 hover:text-white cursor-pointer'}`}>
          {activeBtn === 'SYSTEM_FAILURE' ? 'AWAITING AI...' : 'SYSTEM FAILURE'}
        </button>
      </div>
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(window.innerWidth >= 768);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoOverlay, setDemoOverlay] = useState(null);
  const [isAwaitingAI, setIsAwaitingAI] = useState(false);
  const [activeChaosBtn, setActiveChaosBtn] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let isConnected = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);
      setWs(socket);

      socket.onopen = () => {
        console.log('Connected to StellarX Telemetry');
        isConnected = true;
        setIsWsConnected(true);
      };
      
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TELEMETRY_STREAM') {
            setTelemetry(msg.data);
          } else if (msg.type === 'AGENT_DECISION') {
            setDecision(msg.data);
            setIsAwaitingAI(false);
            setActiveChaosBtn(null);
          } else if (msg.type === 'MISSION_HANDOFF') {
            setHandoff(msg.data);
            // Show handoff for 3s, then flash recovery banner
            setTimeout(() => {
              setHandoff(null);
              setRecoveryBanner(true);
              setTimeout(() => setRecoveryBanner(false), 4000);
            }, 3000);
          } else if (msg.type === 'CLEAR_DECISION') {
            // setDecision(null); // Ignored so popups stay on screen until manually closed
          }
        } catch (err) {
          console.error(err);
        }
      };

      socket.onclose = () => {
        if (isConnected) console.log('WebSocket disconnected. Attempting to reconnect...');
        isConnected = false;
        setIsWsConnected(false);
        // Try to reconnect every 3 seconds
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        socket.close(); // Force close to trigger onclose and reconnect
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
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
      <div className={`poster-grid relative z-10 overflow-x-hidden ${viewMode === 'EGO' ? 'pointer-events-none' : ''}`}>
        
        {/* Top Bar */}
        <div className="col-start-1 col-end-4 row-start-1 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pointer-events-auto bg-black/40 backdrop-blur-md p-4 border-b border-white/10 z-50">
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center justify-between md:justify-start gap-8">
              <h1 className="text-xl font-bold tracking-[0.2em] text-white">STELLAR<span className="text-white/50">X</span></h1>
              <div className="hidden md:flex text-xs font-mono text-white/50 tracking-widest items-center gap-6">
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
            
            {/* WS Connection Status */}
            <div className={`font-mono text-[10px] tracking-widest flex items-center gap-3 px-3 py-1 rounded w-fit ${isWsConnected ? 'bg-green-900/50 text-green-400 border border-green-500/50' : 'bg-red-900/50 text-red-400 border border-red-500/50 animate-pulse'}`}>
              <span className="opacity-80">SERVER LINK</span>
              <span className="font-bold uppercase">{isWsConnected ? 'SECURE' : 'OFFLINE - RECONNECTING'}</span>
            </div>
          </div>
          
          {/* Fleet Intelligence Index (Center) */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 flex-col items-center">
            <div className="text-[9px] tracking-[0.3em] text-white/40 mb-1">STELLAR INDEX</div>
            <div className="text-3xl font-serif tracking-tighter drop-shadow-md text-white">
              {stellarIndex}
            </div>
          </div>
          
          {/* Live Global Metrics */}
          <div className="flex overflow-x-auto w-full md:w-auto gap-6 md:gap-8 items-center text-xs font-mono md:text-right mt-4 md:mt-1 pb-2 md:pb-0 hide-scrollbar">
             <div className="flex-shrink-0"><span className="text-white/40 block text-[9px] mb-1 tracking-widest">INDEX</span><span className="text-white md:hidden">{stellarIndex}</span></div>
             <div className="flex-shrink-0"><span className="text-white/40 block text-[9px] mb-1 tracking-widest">COVERAGE</span><span className="text-white">{coverage.toFixed(0)}%</span></div>
             <div className="flex-shrink-0"><span className="text-white/40 block text-[9px] mb-1 tracking-widest">MISSION SUCCESS</span><span className="text-white">{missionSuccess.toFixed(1)}%</span></div>
             <div className="flex-shrink-0 border-l border-white/20 pl-4 md:pl-6">
                <span className="text-white/40 block text-[9px] mb-1 tracking-widest">AUTONOMOUS DECISIONS</span>
                <span key={autoDecisions} className="text-cyan-400 text-lg font-bold inline-block animate-[pulse_0.5s_ease-out]">{autoDecisions}</span>
             </div>
             <button 
               onClick={runDemo} 
               disabled={demoRunning}
               className={`flex-shrink-0 ml-2 md:ml-4 px-4 py-2 border text-[10px] tracking-widest cursor-pointer transition-colors ${demoRunning ? 'border-white/20 text-white/30' : 'border-green-400 text-green-400 hover:bg-green-400 hover:text-black'}`}
             >
               {demoRunning ? 'RUNNING...' : 'DEMO'}
             </button>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'COMMANDER' ? (
          <div className="col-start-1 col-end-4 row-start-2 w-full pointer-events-auto">
             <CommanderView telemetry={telemetry} visualState={visualState} />
          </div>
        ) : viewMode === 'ANALYTICS' ? (
          <div className="col-start-1 col-end-4 row-start-2 w-full pointer-events-auto">
             <AutonomyAnalytics telemetry={telemetry} />
          </div>
        ) : viewMode === 'FLEET' ? (
          <>
            <div className="col-start-1 col-end-4 row-start-2 flex items-center justify-center p-0 md:p-8 w-full h-[60vh] md:h-[600px] pointer-events-auto relative">

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
            {/* EGO View: Side/Bottom Drawer */}
            <div className={`fixed left-0 right-0 md:left-auto md:right-0 md:top-24 bottom-16 md:bottom-0 w-full md:w-80 h-[60vh] md:h-[calc(100vh-6rem)] bg-black/90 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/20 font-mono text-xs text-white/60 transition-transform duration-500 z-[110] pointer-events-auto flex flex-col ${isDrawerOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}>
               <div 
                 className="absolute left-1/2 -top-8 -translate-x-1/2 md:-left-10 md:top-1/2 md:-translate-y-1/2 md:-translate-x-0 bg-black/90 border border-white/20 px-4 py-1 md:px-2 md:py-8 text-[10px] tracking-widest text-white/50 cursor-pointer hover:bg-white border-l-neon-blue hover:text-black hover:border-white transition-all z-10 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8)]" 
                 onClick={() => setIsDrawerOpen(!isDrawerOpen)}
               >
                 <span className="block md:hidden">TELEMETRY {isDrawerOpen ? '▼' : '▲'}</span>
                 <span className="hidden md:flex flex-col items-center gap-4">
                   <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>TELEMETRY</span>
                   <span className="text-neon-blue font-bold text-sm">{isDrawerOpen ? '▶' : '◀'}</span>
                 </span>
               </div>
               
               <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-6 pb-24 md:pb-16">
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
            <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-8 md:right-8 flex flex-col md:flex-row justify-between items-center md:items-end pointer-events-none z-[100] gap-4">
              
              {/* LEFT: Chaos */}
              <div className="w-full md:w-[300px] pointer-events-auto flex flex-col gap-4">
                <ChaosPanel ws={ws} isAwaitingAI={isAwaitingAI} setIsAwaitingAI={setIsAwaitingAI} activeBtn={activeChaosBtn} setActiveBtn={setActiveChaosBtn} />
              </div>
              
              {/* CENTER: Agent Activity */}
              <div className="hidden md:block flex-1 max-w-[600px] pointer-events-auto h-[180px]">
                {decision && <div className="h-full animate-slide-up-fade"><AgentActivityGraph decision={decision} /></div>}
              </div>

              {/* RIGHT: AI Decision Cards & Forecast */}
              <div className="w-full md:w-[450px] pointer-events-auto flex flex-col justify-end relative">
                {decision ? (
                  <div className="relative animate-slide-up-fade">
                    <button 
                      onClick={() => setDecision(null)} 
                      className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-8 h-8 rounded-full bg-red-500 text-white font-bold text-sm flex items-center justify-center z-50 cursor-pointer shadow-[0_0_10px_rgba(255,0,0,0.5)] border border-red-300 hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                    <DecisionCards decision={decision} coverage={coverage} />
                  </div>
                ) : (
                   <div className="hidden md:block bg-black/80 backdrop-blur-md border border-white/10 p-6 font-mono text-xs text-white/50 text-center shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                     SYSTEM NOMINAL. AWAITING CHAOS INJECTION.
                   </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-lg border-t border-white/10 z-[120] flex justify-around items-center px-2 font-mono text-[10px] tracking-widest pointer-events-auto">
        <button onClick={() => setViewMode('COMMANDER')} className={`flex flex-col items-center gap-1 ${viewMode === 'COMMANDER' ? 'text-white' : 'text-white/40'}`}>
          <span className="text-lg">⊚</span>
          <span>CMD</span>
        </button>
        <button onClick={() => setViewMode('FLEET')} className={`flex flex-col items-center gap-1 ${viewMode === 'FLEET' ? 'text-white' : 'text-white/40'}`}>
          <span className="text-lg">▤</span>
          <span>FLEET</span>
        </button>
        <button onClick={() => setViewMode('EGO')} className={`flex flex-col items-center gap-1 ${viewMode === 'EGO' ? 'text-white' : 'text-white/40'}`}>
          <span className="text-lg">◎</span>
          <span>EGO</span>
        </button>
        <button onClick={() => setViewMode('ANALYTICS')} className={`flex flex-col items-center gap-1 ${viewMode === 'ANALYTICS' ? 'text-green-400' : 'text-white/40'}`}>
          <span className="text-lg">◱</span>
          <span>IMPACT</span>
        </button>
      </div>
    </>
  );
}

export default App;
