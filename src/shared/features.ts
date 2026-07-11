/**
 * Shared feature flags — delegates to plans.ts as single source of truth.
 * All plan checks should go through planHasFeature() or PLANS[plan].
 */
import type { UserPlan } from '../lib/plans';
import { planHasFeature, normalizePlan } from '../lib/plans';

export type { UserPlan };
export { planHasFeature, normalizePlan };


export enum Features {
  AI_EMAIL = 'AI_EMAIL',
  AI_REPLY = 'AI_REPLY',
  SMART_INBOX = 'JOB_INBOX',
  UNLIMITED_CONTACTS = 'UNLIMITED_CONTACTS',
  UNLIMITED_TEMPLATES = 'UNLIMITED_CONTACTS', // same gate
  ADVANCED_ANALYTICS = 'ADVANCED_ANALYTICS',
  CAMPAIGN = 'CAMPAIGN',
  CONTACTS = 'CONTACTS',
  SEND_EMAIL = 'SEND_EMAIL',
  RECRUITER_DB = 'RECRUITER_DB',
  CAMPAIGN_SCHEDULING = 'CAMPAIGN_SCHEDULING',
}

export type PlanType = UserPlan;

/** hasFeature — unified check replacing the old PlanConfig map */
export const hasFeature = (plan: string, feature: Features): boolean => {
  const p = normalizePlan(plan);
  // Basic features everyone gets
  if (feature === Features.CAMPAIGN || feature === Features.CONTACTS || feature === Features.SEND_EMAIL) {
    return true;
  }
  // Delegate to planHasFeature for everything else
  const featureKey = feature as any;
  return planHasFeature(p, featureKey);
};
