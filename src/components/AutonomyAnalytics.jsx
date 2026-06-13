import React, { useState, useEffect } from 'react';
import StarfieldBackground from './StarfieldBackground';

function AnimatedNumber({ value, isFloat = false }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    if (isNaN(end)) return;

    const duration = 2000; // 2 seconds
    let startTime = null;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing out quint
      const easeOut = 1 - Math.pow(1 - progress, 5);
      const current = start + (end - start) * easeOut;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{isFloat ? displayValue.toFixed(1) : Math.floor(displayValue)}</>;
}

export default function AutonomyAnalytics({ telemetry }) {
  const kpis = telemetry?.globalKpis || {};
  const metrics = [
    { label: 'Autonomous Decisions', value: kpis.autonomousDecisions || 127, suffix: '', color: 'text-white' },
    { label: 'Threats Resolved', value: kpis.threatsResolved || 124, suffix: '', color: 'text-nebula-crimson' },
    { label: 'Missions Reassigned', value: kpis.missionsReassigned || 8, suffix: '', color: 'text-white' },
    { label: 'Operator Hours Saved', value: kpis.operatorHoursSaved || 342, suffix: 'h', color: 'text-white' },
    { label: 'Coverage Restored', value: kpis.coverageRestored || 15, suffix: '×', color: 'text-white' },
    { label: 'Fuel Optimized', value: kpis.fuelOptimized?.toFixed(1) || '4.2', suffix: '%', color: 'text-white' },
  ];

  return (
    <div className="relative w-full h-full font-sans text-white overflow-hidden pointer-events-auto bg-black">
      
      <StarfieldBackground />
      <div className="absolute inset-0 opacity-10 bg-[url('/galaxy-bg.jpg')] bg-cover bg-center grayscale pointer-events-none mix-blend-screen z-0"></div>
      <div className="texture-noise z-10"></div>

      <div className="relative z-20 w-full h-full flex items-center justify-center p-6 md:p-16 pt-16 md:pt-16">
         
         <div className="flex flex-col md:flex-row w-full max-w-7xl items-start md:items-center gap-12 md:gap-32 pb-24 md:pb-0">
            
            {/* Left Side: Title */}
            <div className="flex-1 flex flex-col items-start w-full">
               <div className="flex items-center gap-4 md:gap-6 text-5xl md:text-7xl font-sans font-bold tracking-tighter mb-4 md:mb-8">
                 <span className="text-white/40 font-serif font-light text-6xl md:text-9xl">(</span>
                 <span>analytics</span>
                 <span className="text-white/40 font-serif font-light text-6xl md:text-9xl">)</span>
               </div>
               <div className="text-sm md:text-lg font-bold tracking-tight uppercase text-white/60 leading-relaxed max-w-md border-l-4 border-white pl-4 md:pl-8">
                 Validated operational metrics across all orbital nodes. Human latency eradicated over the preceding 72-hour cycle.
               </div>
               <div className="mt-8 md:mt-12 ml-4 md:ml-8 text-xs md:text-sm font-bold tracking-tight uppercase text-white/30">
                 HUMAN INTERVENTIONS REQUIRED: <span className="text-green-400 text-xl md:text-2xl ml-2">0</span>
               </div>
            </div>

            {/* Right Side: Live Metrics */}
            <div className="flex-1 flex flex-col w-full gap-4 md:gap-6 border-l-2 border-white/20 pl-6 md:pl-16 py-4">
               {metrics.map((m, i) => (
                 <div key={i}>
                    <div className="text-xs md:text-sm font-bold tracking-tight text-white/50 mb-1 uppercase">{m.label}</div>
                    <div className={`font-serif text-4xl md:text-6xl ${m.color} tracking-tighter`}>
                      <AnimatedNumber value={m.value} isFloat={m.label === 'Fuel Optimized'} />
                      {m.suffix && <span className="text-2xl md:text-3xl text-white/40 ml-1">{m.suffix}</span>}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
