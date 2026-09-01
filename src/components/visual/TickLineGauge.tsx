import React from 'react';
import { formatINR } from '../../services/accountingEngine';

interface TickLineGaugeProps {
  label: string;
  amount: number;
  maxAmount: number;
  highlightColor?: string;
  unitLabel?: string;
}

export const TickLineGauge: React.FC<TickLineGaugeProps> = ({
  label,
  amount,
  maxAmount,
  highlightColor = '#6366f1',
  unitLabel = 'LEFT',
}) => {
  const percentage = maxAmount > 0 ? Math.min(100, Math.max(0, Math.round((amount / maxAmount) * 100))) : 0;
  
  const totalTicks = 32;
  const activeTicks = Math.round((percentage / 100) * totalTicks);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-[10px] font-mono text-[var(--card-text-sub)]">
          {label}
        </span>
        <div className="flex items-baseline space-x-1">
          <span className="font-extrabold font-mono-num text-sm text-[var(--card-text-main)]">
            {formatINR(amount)}
          </span>
          <span className="text-[10px] font-mono text-[var(--card-text-sub)]">
            {unitLabel}
          </span>
        </div>
      </div>

      {/* Barcode Tick Line Visualizer */}
      <div className="flex items-center justify-between space-x-[3px] py-1">
        {Array.from({ length: totalTicks }).map((_, i) => {
          const isActive = i < activeTicks;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-300 ${
                isActive
                  ? 'h-4 opacity-90'
                  : 'h-2.5 opacity-20 bg-current'
              }`}
              style={{
                backgroundColor: isActive ? highlightColor : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
