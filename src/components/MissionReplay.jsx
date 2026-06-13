import React from 'react';

const EVENT_COLORS = {
  THREAT: 'text-red-400 border-red-500/30',
  EVALUATE: 'text-white/60 border-white/20',
  DECISION: 'text-white border-white/30',
  HANDOFF: 'text-blue-400 border-blue-400/30',
  COVERAGE: 'text-green-400 border-green-400/30',
  RESOLVED: 'text-green-400 border-green-400/30',
  SYSTEM: 'text-white/40 border-white/10',
};

export default function MissionReplay({ eventLog }) {
  const events = eventLog || [];

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm text-white tracking-[0.2em] mb-4">MISSION REPLAY</h2>
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2">
        {events.map((evt, i) => {
          const time = new Date(evt.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
          const colors = EVENT_COLORS[evt.type] || EVENT_COLORS.SYSTEM;
          return (
            <div key={i} className={`flex gap-3 items-start border-l-2 pl-3 py-1 ${colors}`}>
              <span className="text-[10px] font-mono whitespace-nowrap mt-0.5">{time}</span>
              <div className="flex flex-col">
                <span className="text-[10px] leading-relaxed">{evt.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
