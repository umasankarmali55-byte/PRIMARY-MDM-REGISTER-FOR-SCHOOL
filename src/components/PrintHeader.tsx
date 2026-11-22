import React from 'react';

interface PrintHeaderProps {
  school: string;
  subtitle: string;
  attribution: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ school, subtitle, attribution }) => {
  return (
    <div className="hidden print-only mb-3 border-b-2 border-emerald-900 pb-2 text-center">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-emerald-900">
        Mid-Day Meal · Odisha
      </div>
      <div className="text-base font-bold text-black mt-0.5">{school}</div>
      <div className="text-xs font-semibold text-slate-800">{subtitle}</div>
      <div className="text-[9px] text-slate-600 mt-0.5">{attribution}</div>
    </div>
  );
};
