import type { UserPlan } from '../lib/plans';
import { PLANS, normalizePlan } from '../lib/plans';

export type { UserPlan };


export const LIMITS = {
  FREE: {
    MAX_CONTACTS: 100,
    MAX_CAMPAIGNS: 3,
    MAX_CUSTOM_TEMPLATES: 3,
    MAX_DAILY_EMAILS: 50,
  },
  PRO: {
    MAX_CONTACTS: Infinity,
    MAX_CAMPAIGNS: Infinity,
    MAX_CUSTOM_TEMPLATES: Infinity,
    MAX_DAILY_EMAILS: 500,
  },
  MAX: {
    MAX_CONTACTS: Infinity,
    MAX_CAMPAIGNS: Infinity,
    MAX_CUSTOM_TEMPLATES: Infinity,
    MAX_DAILY_EMAILS: 2000,
  }
};

export type LimitKey = keyof typeof LIMITS.FREE;

export const getLimit = (plan: string, feature: LimitKey): number => {
  const p = normalizePlan(plan);
  return LIMITS[p][feature];
};
