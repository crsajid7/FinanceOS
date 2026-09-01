import React from 'react';
import { formatINR } from '../../services/accountingEngine';

interface CategoryItem {
  category: string;
  amount: number;
  percentage: number;
  color?: string;
}

interface SegmentedDonutChartProps {
  centerAmount: number;
  centerLabel?: string;
  items: CategoryItem[];
  size?: number;
}

const PASTEL_COLORS = [
  '#60a5fa', // Sky Blue
  '#fb923c', // Orange
  '#4ade80', // Green
  '#c084fc', // Lavender
  '#818cf8', // Indigo
  '#facc15', // Yellow
  '#f87171', // Coral Red
  '#94a3b8', // Slate Grey
];

export const SegmentedDonutChart: React.FC<SegmentedDonutChartProps> = ({
  centerAmount,
  centerLabel = 'TOTAL SPENT',
  items,
  size = 230,
}) => {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const center = size / 2;
  const radius = size / 2 - 18;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  // If no spending recorded yet
  if (total === 0 || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-2">
        <div
          className="relative flex items-center justify-center rounded-full border-[14px] border-black/10 dark:border-black/5"
          style={{ width: size, height: size }}
        >
          <div className="text-center z-10">
            <span className="text-3xl font-black font-mono-num tracking-tight block text-[var(--card-text-main)]">
              {formatINR(centerAmount)}
            </span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase mt-1 block text-[var(--card-text-sub)] font-mono">
              {centerLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  let accumulatedPercent = 0;
  const gapPercent = Math.min(2.5, 20 / items.length);

  return (
    <div className="flex flex-col items-center justify-center relative my-2">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/10 dark:text-black/5"
        />

        {/* Dynamic colored segments */}
        {items.map((item, idx) => {
          const itemPercent = (item.amount / total) * 100;
          if (itemPercent <= 0) return null;

          const usablePercent = Math.max(0.5, itemPercent - gapPercent);
          const strokeDasharray = `${(usablePercent / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -((accumulatedPercent + gapPercent / 2) / 100) * circumference;

          accumulatedPercent += itemPercent;
          const color = item.color || PASTEL_COLORS[idx % PASTEL_COLORS.length];

          return (
            <circle
              key={item.category}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          );
        })}
      </svg>

      {/* Center Amount Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-3xl font-black font-mono-num tracking-tight block text-[var(--card-text-main)]">
          {formatINR(centerAmount)}
        </span>
        <span className="text-[10px] font-extrabold tracking-widest uppercase mt-1 block text-[var(--card-text-sub)] font-mono">
          {centerLabel}
        </span>
      </div>
    </div>
  );
};
