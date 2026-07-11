/**
 * Feature Flags System — thin wrapper around plans.ts.
 * Kept for backward compatibility with any code that imports from here.
 */
export type { UserPlan } from './plans';
export { planHasFeature as isFeatureEnabled } from './plans';


export type FeatureFlag =
  | 'AI_EMAIL'
  | 'JOB_INBOX'
  | 'ADVANCED_ANALYTICS'
  | 'RECRUITER_DB'
  | 'UNLIMITED_CONTACTS'
  | 'CAMPAIGN_SCHEDULING';

// No-op stubs kept for API compat
export function loadFeatureFlags(): void {}
export function setFeatureOverride(_flag: FeatureFlag, _enabled: boolean): void {}
export function getFlagsForPlan(_plan: string): FeatureFlag[] { return []; }
export const ALL_FLAGS: FeatureFlag[] = [
  'AI_EMAIL', 'JOB_INBOX', 'ADVANCED_ANALYTICS',
  'RECRUITER_DB', 'UNLIMITED_CONTACTS', 'CAMPAIGN_SCHEDULING'
];
