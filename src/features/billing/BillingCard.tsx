import React from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '@/components/ui/button';
import { Pricing } from './Pricing';
import { CreditCard, Zap } from 'lucide-react';

export const BillingCard = () => {
  const { userPlan, setUpgradeDialogOpen } = useStore();
  const isPremium = userPlan === 'PRO' || userPlan === 'MAX';

  return (
    <div className="p-6 bg-white rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          Current Plan: 
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${isPremium ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
            {userPlan.toUpperCase()}
          </span>
        </h4>
        <p className="text-gray-500 mt-1 text-sm">
          {isPremium ? 'You have access to premium features.' : 'Upgrade to GMailer+ to unlock AI features and unlimited usage.'}
        </p>
      </div>

      {!isPremium && (
        <Button 
          onClick={() => setUpgradeDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Upgrade to Premium
        </Button>
      )}
      
      {isPremium && (
        <Button variant="outline" className="flex items-center gap-2 text-gray-600">
          <CreditCard className="w-4 h-4" />
          Manage Billing
        </Button>
      )}
    </div>
  );
};
