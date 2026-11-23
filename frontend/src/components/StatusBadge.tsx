import React from 'react';
import type { ConnectionState } from '../types';

interface StatusBadgeProps {
  status: ConnectionState | 'ready';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'connected':
      case 'ready':
        return {
          bgColor: 'bg-emerald-500/10',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          dotColor: 'bg-emerald-400 animate-pulse',
          defaultText: status === 'ready' ? 'Ready' : 'Connected',
        };
      case 'checking':
        return {
          bgColor: 'bg-amber-500/10',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/30',
          dotColor: 'bg-amber-400 animate-ping',
          defaultText: 'Connecting...',
        };
      case 'error':
        return {
          bgColor: 'bg-rose-500/10',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/30',
          dotColor: 'bg-rose-400',
          defaultText: 'Disconnected',
        };
      case 'idle':
      default:
        return {
          bgColor: 'bg-slate-500/10',
          textColor: 'text-slate-400',
          borderColor: 'border-slate-500/30',
          dotColor: 'bg-slate-400',
          defaultText: 'Idle',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      <span>{label || config.defaultText}</span>
    </span>
  );
};
