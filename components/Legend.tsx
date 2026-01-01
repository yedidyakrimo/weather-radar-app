
import React from 'react';

const Legend: React.FC = () => {
  const steps = [
    { label: 'קל', color: 'rgba(0, 236, 236, 0.7)' },
    { label: '', color: 'rgba(1, 160, 246, 0.7)' },
    { label: 'בינוני', color: 'rgba(0, 0, 246, 0.7)' },
    { label: '', color: 'rgba(0, 255, 0, 0.7)' },
    { label: 'כבד', color: 'rgba(0, 200, 0, 0.7)' },
    { label: '', color: 'rgba(255, 255, 0, 0.7)' },
    { label: 'סוער', color: 'rgba(255, 128, 0, 0.7)' },
    { label: '', color: 'rgba(255, 0, 0, 0.7)' },
    { label: 'קיצוני', color: 'rgba(200, 0, 0, 0.7)' },
  ];

  return (
    <div className="absolute bottom-10 left-6 z-[1000] bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-white shadow-2xl">
      <div className="text-xs font-bold mb-2 text-center text-slate-400">עוצמת גשם (dBZ)</div>
      <div className="flex items-center gap-1 h-3 w-48">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex-1 h-full first:rounded-r-sm last:rounded-l-sm"
            style={{ backgroundColor: step.color }}
            title={step.label}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] mt-1 text-slate-300">
        <span>קל</span>
        <span>בינוני</span>
        <span>כבד</span>
      </div>
    </div>
  );
};

export default Legend;
