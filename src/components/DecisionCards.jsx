import React, { useState, useEffect } from 'react';

export default function DecisionCards({ decision, coverage = 100 }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setActiveStep(0);
    const t1 = setTimeout(() => setActiveStep(1), 800);
    const t2 = setTimeout(() => setActiveStep(2), 1600);
    const t3 = setTimeout(() => setActiveStep(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [decision]);

  const econ = decision?.economics;
  const optA = econ?.optionA;
  const optB = econ?.optionB;
  const selected = econ?.selectedOption || 'A';
  const confidence = decision?.confidence || 0;
  const threatType = decision?.threatType || decision?.incident?.replace(/_/g, ' ') || 'UNKNOWN';
  const threatLevel = decision?.threatLevel || '—';
  const utilityBreakdown = decision?.utilityBreakdown;
  const planningPipeline = decision?.planningPipeline;

  return (
    <div className="flex flex-col gap-3 font-mono w-full pointer-events-auto">
      
      {/* Step 1: Threat Detection & Agent Breakdown */}
      <div className={`transition-all duration-500 ${activeStep >= 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
        <div className="bg-red-900/40 border border-red-500/50 p-3 backdrop-blur-md mb-2">
          <div className="text-red-500 text-[10px] tracking-[0.2em] mb-1">THREAT DETECTED</div>
          <div className="text-white text-sm font-bold flex justify-between">
            <span>{threatType}</span>
            <span className="text-red-400 animate-pulse">{threatLevel}</span>
          </div>
        </div>
        
        <div className="bg-black/60 border border-white/10 p-3 backdrop-blur-md">
          <div className="text-[10px] tracking-[0.2em] mb-2 text-white/50">MULTI-AGENT CONSENSUS</div>
          <div className="space-y-1.5 text-[9px] font-mono">
            <div className="flex"><span className="w-24 text-red-400">Safety Agent:</span> <span className="text-white/70">Collision Risk Critical ({threatLevel})</span></div>
            <div className="flex"><span className="w-24 text-blue-400">Mission Agent:</span> <span className="text-white/70">Priority Override Required</span></div>
            <div className="flex"><span className="w-24 text-neon-blue">Fleet Agent:</span> <span className="text-white/70">Redundancy Path Available</span></div>
            <div className="flex"><span className="w-24 text-green-400">Commander:</span> <span className="text-white">Execute Resolution Protocol</span></div>
          </div>
        </div>
      </div>

      {/* Step 2: Utility Score Visualization */}
      <div className={`transition-all duration-500 ${activeStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
        {utilityBreakdown ? (
          <div className="bg-black/60 border border-white/10 p-3 backdrop-blur-md">
            <div className="text-[10px] tracking-[0.2em] mb-2 text-white/50">UTILITY SCORE EVALUATION</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-white/70"><span>Risk Reduction:</span><span>{utilityBreakdown.riskReduction}</span></div>
              <div className="flex justify-between text-white/70"><span>Mission Retention:</span><span>{utilityBreakdown.missionRetention}</span></div>
              <div className="flex justify-between text-white/70"><span>Coverage Retention:</span><span>{utilityBreakdown.coverageRetention}</span></div>
              <div className="flex justify-between text-white/70"><span>Fuel Cost:</span><span>{utilityBreakdown.fuelCost}</span></div>
              <div className="flex justify-between text-white font-bold border-t border-white/20 pt-1 mt-1"><span>Utility Score:</span><span>{utilityBreakdown.score}</span></div>
            </div>
          </div>
        ) : (
          <div className="bg-black/60 border border-white/10 p-3 text-white/40 text-xs">Computing utility...</div>
        )}
      </div>

      {/* Step 3: Predictive Planning & Forecast */}
      <div className={`transition-all duration-500 ${activeStep >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
        {planningPipeline ? (
          <div className="bg-black/60 border border-white/10 p-3 backdrop-blur-md">
            <div className="text-[10px] tracking-[0.2em] mb-2 text-white/50 flex justify-between">
              <span>PREDICTIVE PLANNING</span>
              <span className="text-white/30">FORECAST ENGINE</span>
            </div>
            
            <div className="flex gap-4">
              {/* Pipeline */}
              <div className="flex-1 space-y-1 text-[9px] text-white/70">
                {planningPipeline.map((step, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-cyan-400">→</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              
              {/* Forecast Outcome */}
              <div className="flex-1 border-l border-white/10 pl-4 flex gap-4 text-[9px]">
                <div className="space-y-1">
                  <div className="text-white/40 mb-1">NO ACTION</div>
                  <div className="text-white/60">Cov: {(coverage - Math.abs((decision.utilityBreakdown?.coverageRetention || 100) - 100) - 11).toFixed(0)}%</div>
                  <div className="text-white/60">Risk: 84%</div>
                </div>
                <div className="space-y-1">
                  <div className="text-green-400 mb-1">AI PLAN</div>
                  <div className="text-white">Cov: {coverage.toFixed(0)}%</div>
                  <div className="text-white">Risk: {Math.max(2, 100 - (decision.utilityBreakdown?.riskReduction || 90))}%</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Step 4: Confidence + Execution */}
      <div className={`transition-all duration-500 ${activeStep >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
        <div className="bg-green-400/10 border border-green-400/50 p-3 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-green-400 text-[10px] tracking-[0.2em] mb-1">ACTION EXECUTED</div>
              <div className="text-white text-xs">TRAJECTORY SAFE. FLEET STABILIZED.</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
          </div>
          {/* Confidence Bar */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-white/50 tracking-widest">CONFIDENCE</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all duration-1000" style={{ width: `${confidence}%` }}></div>
            </div>
            <span className="text-[10px] text-green-400 font-bold">{confidence.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
