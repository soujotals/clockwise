"use client";

import { cn } from "@/lib/utils";

type WorkdayStatus = 'NOT_STARTED' | 'WORKING_BEFORE_BREAK' | 'ON_BREAK' | 'WORKING_AFTER_BREAK' | 'FINISHED';

interface StatusIndicatorProps {
  status: WorkdayStatus;
  className?: string;
  showText?: boolean;
  timeAgo?: string;
}

const statusConfig = {
  'NOT_STARTED': {
    color: 'bg-gray-400',
    text: 'Fora do expediente',
    pulseColor: 'bg-gray-400',
  },
  'WORKING_BEFORE_BREAK': {
    color: 'bg-green-500',
    text: 'Trabalhando',
    pulseColor: 'bg-green-400',
  },
  'ON_BREAK': {
    color: 'bg-orange-500',
    text: 'Em intervalo',
    pulseColor: 'bg-orange-400',
  },
  'WORKING_AFTER_BREAK': {
    color: 'bg-green-500',
    text: 'Trabalhando',
    pulseColor: 'bg-green-400',
  },
  'FINISHED': {
    color: 'bg-blue-500',
    text: 'Expediente encerrado',
    pulseColor: 'bg-blue-400',
  },
};

export function StatusIndicator({ 
  status, 
  className,
  showText = true,
  timeAgo 
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const isActive = status === 'WORKING_BEFORE_BREAK' || status === 'WORKING_AFTER_BREAK';

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Status dot with pulse animation */}
      <div className="relative">
        <div className={cn(
          "w-3 h-3 rounded-full",
          config.color
        )} />
        
        {/* Pulse effect for active states */}
        {isActive && (
          <div className={cn(
            "absolute inset-0 w-3 h-3 rounded-full animate-ping",
            config.pulseColor,
            "opacity-75"
          )} />
        )}
      </div>

      {/* Status text */}
      {showText && (
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {config.text}
          </span>
          
          {/* Time ago */}
          {timeAgo && (
            <span className="text-xs text-muted-foreground ml-2">
              há {timeAgo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}