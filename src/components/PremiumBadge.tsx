import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';

interface PremiumBadgeProps {
  label?: string;
  type?: 'pro' | 'ai';
  onClick?: () => void;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ 
  label, 
  type = 'pro',
  onClick 
}) => {
  const { setUpgradeDialogOpen } = useStore();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      setUpgradeDialogOpen(true);
    }
  };

  if (type === 'ai') {
    return (
      <span 
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-700 cursor-pointer hover:shadow-sm transition-all border border-purple-200"
      >
        <Sparkles className="w-3 h-3 text-purple-500" />
        {label || 'AI Feature'}
      </span>
    );
  }

  return (
    <span 
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-white cursor-pointer hover:bg-gray-800 transition-colors shadow-sm"
    >
      <Lock className="w-3 h-3 text-yellow-400" />
      {label || 'PRO'}
    </span>
  );
};
