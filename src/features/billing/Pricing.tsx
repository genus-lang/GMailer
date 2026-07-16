import React, { useState } from 'react';
import { Check, X as XIcon, Shield, Crown, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentService } from '../../services/payment.service';
import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const Pricing = () => {
  const { userPlan, refreshPlan, jwtToken, userEmail, upgradeContextMessage } = useStore();
  const [loadingPlan, setLoadingPlan] = useState<'PRO' | 'MAX' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planToUpgrade: 'PRO' | 'MAX') => {
    if (!jwtToken) {
      setError("Please ensure you are fully logged in.");
      return;
    }
    
    setLoadingPlan(planToUpgrade);
    setError(null);
    try {
      const order = await PaymentService.createOrder(planToUpgrade, jwtToken);
      
      const success = await PaymentService.openCashfreeCheckout(
        order, 
        jwtToken, 
        { name: 'User', email: userEmail }
      );
      
      if (success) {
        await refreshPlan();
        setLoadingPlan(null);
      } else {
        setLoadingPlan(null);
      }
    } catch (err: any) {
      console.error('Payment flow failed:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setLoadingPlan(null);
    }
  };

  const features = [
    { name: 'Gmail Accounts', free: '1', pro: 'Unlimited (future)', max: 'Unlimited' },
    { name: 'Contacts', free: '100', pro: 'Unlimited', max: 'Unlimited' },
    { name: 'Emails/Day', free: '50', pro: 'Provider limits apply', max: 'Provider limits apply' },
    { name: 'Campaigns', free: '2', pro: 'Unlimited', max: 'Unlimited' },
    { name: 'Templates', free: '3 custom', pro: 'Unlimited', max: 'Unlimited' },
    { name: 'Built-in Templates', free: '5', pro: '50+', max: '50+' },
    { name: 'AI Generation', free: false, pro: true, max: true },
    { name: 'Smart Inbox', free: 'Basic', pro: 'AI Powered', max: 'AI Powered' },
    { name: 'Analytics', free: 'Basic', pro: 'Advanced', max: 'Advanced' },
    { name: 'Scheduling', free: false, pro: true, max: true },
    { name: 'Auto Follow-up', free: false, pro: true, max: true },
    { name: 'Export Data', free: false, pro: true, max: true },
    { name: 'Notes & Tags', free: false, pro: true, max: true },
    { name: 'Dark Mode', free: false, pro: true, max: true },
    { name: '4,000 Recruiter Emails', free: false, pro: false, max: true },
  ];

  const renderValue = (val: string | boolean) => {
    if (val === true) return <Check className="w-5 h-5 text-indigo-400 mx-auto" />;
    if (val === false) return <XIcon className="w-4 h-4 text-gray-600/50 mx-auto" />;
    return <span className="font-medium">{val}</span>;
  };

  return (
    <div className="relative overflow-hidden w-full h-full flex flex-col p-8 bg-[#0a0a0b] text-gray-200 min-h-[600px] max-h-[85vh] overflow-y-auto custom-scrollbar">
      {/* Dynamic Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        
        {upgradeContextMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-8 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-indigo-100 leading-relaxed">
              {upgradeContextMessage}
            </p>
          </motion.div>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-lg shadow-indigo-500/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-4xl font-bold text-white mb-3 tracking-tight">Upgrade your Outreach</h3>
          <p className="text-gray-400 text-base max-w-lg mx-auto">
            Choose the plan that fits your needs. Get unlimited access with Plus, or supercharge your pipeline with the Max recruiter database.
          </p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8 backdrop-blur-sm">
          <div className="grid grid-cols-12 bg-white/5 border-b border-white/10 p-4 sticky top-0 backdrop-blur-xl z-20">
            <div className="col-span-4 font-semibold text-gray-400 text-sm uppercase tracking-wider">Feature</div>
            <div className="col-span-2 text-center font-semibold text-gray-400 text-sm uppercase tracking-wider">Free</div>
            <div className="col-span-3 text-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200 text-sm uppercase tracking-wider">
              Plus (₹25)
            </div>
            <div className="col-span-3 text-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-sm uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Crown className="w-4 h-4 text-pink-400" />
              Max (₹99)
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {features.map((feature, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.03 }}
                key={idx}
                className={cn(
                  "grid grid-cols-12 p-4 hover:bg-white/5 transition-colors items-center",
                  feature.name === '4,000 Recruiter Emails' && "bg-purple-500/5 border-l-2 border-l-purple-500"
                )}
              >
                <div className="col-span-4 font-medium text-sm text-gray-300">{feature.name}</div>
                <div className="col-span-2 text-center text-sm text-gray-500">{renderValue(feature.free)}</div>
                <div className="col-span-3 text-center text-sm text-indigo-100 font-semibold">{renderValue(feature.pro)}</div>
                <div className="col-span-3 text-center text-sm text-pink-100 font-semibold">{renderValue(feature.max)}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto">
          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-400 text-sm mb-4 text-center font-medium bg-red-400/10 py-3 px-4 rounded-lg w-full border border-red-400/20"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Plus Button */}
            <Button 
              onClick={() => handleUpgrade('PRO')} 
              disabled={loadingPlan !== null || userPlan === 'PRO' || userPlan === 'MAX'}
              className={cn(
                "w-full h-14 text-base font-bold shadow-xl transition-all duration-300 relative overflow-hidden group rounded-xl",
                userPlan === 'PRO' || userPlan === 'MAX'
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/20 border-0'
              )}
            >
              {loadingPlan === 'PRO' ? (
                <span className="flex items-center gap-2">
                  <LoaderIcon /> Connecting...
                </span>
              ) : userPlan === 'PRO' ? (
                <span className="flex items-center gap-2 text-green-400">
                  <Shield className="w-5 h-5" /> Current Plan
                </span>
              ) : (
                'Upgrade to Plus (₹25)'
              )}
            </Button>

            {/* Max Button */}
            <Button 
              onClick={() => handleUpgrade('MAX')} 
              disabled={loadingPlan !== null || userPlan === 'MAX'}
              className={cn(
                "w-full h-14 text-base font-bold shadow-2xl transition-all duration-300 relative overflow-hidden group rounded-xl",
                userPlan === 'MAX' 
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-700' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 hover:scale-[1.02] hover:shadow-purple-500/30 border-0'
              )}
            >
              {loadingPlan === 'MAX' ? (
                <span className="flex items-center gap-2">
                  <LoaderIcon /> Connecting...
                </span>
              ) : userPlan === 'MAX' ? (
                <span className="flex items-center gap-2 text-green-400">
                  <Crown className="w-5 h-5" /> Current Plan
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Crown className="w-5 h-5" /> Upgrade to Max (₹99)
                </span>
              )}
            </Button>
          </div>

          <p className="text-gray-500 text-xs mt-6 flex items-center justify-center gap-2 opacity-80 font-medium">
            <Shield className="w-4 h-4" />
            Secure checkout via Razorpay. Cancel anytime.
          </p>
        </div>

      </div>
    </div>
  );
};

const LoaderIcon = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
);
