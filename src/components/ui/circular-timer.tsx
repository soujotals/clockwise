"use client";

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CircularTimerProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  color?: string;
  backgroundColor?: string;
}

export function CircularTimer({
  progress,
  size = 128,
  strokeWidth = 8,
  className,
  children,
  color = "hsl(var(--primary))",
  backgroundColor = "hsl(var(--muted))"
}: CircularTimerProps) {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  
  const progressOffset = useMemo(() => {
    const clampedProgress = Math.max(0, Math.min(100, progress));
    return circumference - (clampedProgress / 100) * circumference;
  }, [progress, circumference]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: progress > 0 ? 'drop-shadow(0 0 8px currentColor)' : 'none'
          }}
        />
      </svg>
      
      {/* Content in center */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}