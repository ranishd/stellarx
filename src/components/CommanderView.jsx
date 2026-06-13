import React from 'react';
import StarfieldBackground from './StarfieldBackground';

export default function CommanderView({ telemetry, mood = 'NOMINAL' }) {
  const kpis = telemetry?.globalKpis || { fleetSurvivalProbability: 100, missionSuccessRate: 100, overallFuelEfficiency: 100, coverageScore: 98, strategicForecasts: [], activeAnomalies: [] };
  const hasFailure = kpis.activeAnomalies.some(a => a.threat === 'SYSTEM_FAILURE');

  // Get top 5 missions by priority
  const topMissions = (telemetry?.constellation || [])
    .filter(s => s.status !== 'OFFLINE' && s.mission)
    .sort((a, b) => b.mission.priority - a.mission.priority)
    .slice(0, 5);

  const forecasts = kpis.strategicForecasts || [];

  const riskColor = (risk) => {
    if (risk === 'CRITICAL') return 'text-red-400';
    if (risk === 'HIGH') return 'text-red-300';
    if (risk === 'MEDIUM') return 'text-yellow-400';
    return 'text-white/50';
  };

  return (
    <div className="absolute inset-0 w-full h-full font-sans text-white overflow-hidden pointer-events-auto bg-black">
      
      <StarfieldBackground />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen transition-all duration-1000 z-0 pointer-events-none" 
        style={{ backgroundImage: "url('/galaxy-bg.jpg')" }}
      ></div>
      <div className="texture-noise z-10"></div>

      {/* Central Content */}
      <div className="relative z-20 w-full h-full flex flex-col justify-center p-6 md:p-16 pt-16 md:pt-32">
        
        {/* Hero Block */}
        <div className="flex items-baseline gap-4 md:gap-8 mb-4">
          <span className="text-white/30 font-serif font-light text-5xl md:text-8xl">(</span>
          <span className="text-4xl md:text-6xl font-sans font-bold tracking-tighter">fleet orchestration</span>
          <span className="text-white/30 font-serif font-light text-5xl md:text-8xl">)</span>
        </div>

        <div className="flex items-baseline gap-4 md:gap-8 ml-2 md:ml-8 mb-8 md:mb-16">
           <div className={`text-[6rem] md:text-[10rem] leading-none font-serif tracking-tighter drop-shadow-2xl transition-colors duration-1000 ${
             mood === 'CRITICAL' ? 'text-red-500' :
             mood === 'WARNING' ? 'text-orange-400' :
             mood === 'RECOVERY' ? 'text-green-400' : 'text-white'
           }`}>
             {kpis.coverageScore?.toFixed(0) || 98}
           </div>
           <div className="flex flex-col gap-2">
              <div className="text-sm md:text-lg font-bold tracking-tight uppercase bg-white text-black px-4 py-1">COVERAGE</div>
              <div className="text-xs md:text-sm font-bold tracking-tight uppercase text-white/50">
                {kpis.missionSuccessRate?.toFixed(1)}% mission success
              </div>
              <div className="text-xs md:text-sm font-bold tracking-tight uppercase text-white/50">
                {kpis.fleetSurvivalProbability?.toFixed(1)}% survival probability
              </div>
           </div>
        </div>

        {/* Bottom Row: Active Missions + Strategic Forecasts + Anomalies */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 ml-0 md:ml-8 pb-20 md:pb-0">

          {/* Active Missions */}
          <div className="flex-1 bg-black/60 backdrop-blur-xl p-6 md:p-8 border border-white/10 max-w-full md:max-w-md">
            <div className="text-sm font-bold tracking-tight mb-6 uppercase border-b border-white/20 pb-3 flex justify-between">
              <span>Active Missions</span>
              <span className="text-white/40 font-normal">{topMissions.length} / {telemetry?.constellation?.length || 100}</span>
            </div>
            <div className="flex flex-col gap-4">
              {topMissions.map((sat, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white">{sat.mission.label}</div>
                    <div className="text-[10px] text-white/40">{sat.id} · PRI {sat.mission.priority}</div>
                  </div>
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/60 rounded-full" style={{ width: `${sat.mission.completion * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] text-white/60 w-10 text-right">{(sat.mission.completion * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Forecasts */}
          <div className="flex-1 bg-black/60 backdrop-blur-xl p-6 md:p-8 border border-white/10 max-w-full md:max-w-sm">
            <div className="text-sm font-bold tracking-tight mb-6 uppercase border-b border-white/20 pb-3">
              Strategic Forecast
            </div>
            <div className="flex flex-col gap-4">
              {forecasts.map((f, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="text-[10px] text-white/40 font-mono w-12 mt-0.5">{f.time}</div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white">{f.type}</div>
                    <div className="text-[10px] text-white/40">{f.maneuver}</div>
                  </div>
                  <div className={`text-[10px] font-bold ${riskColor(f.risk)}`}>{f.risk}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Manifest */}
          <div className="w-full md:w-72 bg-black/60 backdrop-blur-xl p-6 md:p-8 border border-white/10">
            <div className="text-sm font-bold tracking-tight mb-6 uppercase border-b border-white/20 pb-3">
              Anomalies
            </div>
            <div className="flex flex-col gap-4">
              {kpis.activeAnomalies.length > 0 ? kpis.activeAnomalies.map((anom, i) => (
                <div key={i} className="border-l-2 border-red-500 pl-3">
                  <div className="text-xs font-bold text-white">{anom.node}</div>
                  <div className="text-[10px] text-red-400">{anom.threat.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-white/40">{anom.status}</div>
                </div>
              )) : (
                <div className="text-white/40 text-xs italic">No anomalies</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
