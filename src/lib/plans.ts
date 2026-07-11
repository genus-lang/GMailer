/**
 * Premium Plans & Rate Limits
 * Single source of truth for all plan limits and capabilities.
 * Plan keys: 'FREE' | 'PRO' | 'MAX' — always uppercase internally.
 */

export type UserPlan = 'FREE' | 'PRO' | 'MAX';

export interface PlanDefinition {
  name: string;
  displayName: string;
  emailsPerDay: number;
  campaignsPerMonth: number;
  aiCallsPerDay: number;
  contactsLimit: number;
  price: string;
  features: string[];
}

export const PLANS: Record<UserPlan, PlanDefinition> = {
  FREE: {
    name: 'FREE',
    displayName: 'Free',
    emailsPerDay: 50,
    campaignsPerMonth: 3,
    aiCallsPerDay: 0,
    contactsLimit: 100,
    price: '₹0/mo',
    features: ['50 emails/day', '3 campaigns/month', '100 contacts', 'Basic templates'],
  },
  PRO: {
    name: 'PRO',
    displayName: 'GMailer Plus',
    emailsPerDay: 500,
    campaignsPerMonth: 30,
    aiCallsPerDay: 200,
    contactsLimit: 5000,
    price: '₹25/mo',
    features: ['500 emails/day', '30 campaigns/month', '5,000 contacts', 'AI writing', 'Job Inbox', 'Advanced analytics'],
  },
  MAX: {
    name: 'MAX',
    displayName: 'GMailer Max',
    emailsPerDay: 2000,
    campaignsPerMonth: -1, // unlimited
    aiCallsPerDay: -1,     // unlimited
    contactsLimit: -1,     // unlimited (4,000 recruiter DB included)
    price: '₹99/mo',
    features: ['2,000 emails/day', 'Unlimited campaigns', 'Unlimited contacts', '4,000 recruiter DB', 'All AI features', 'Priority support'],
  },
};

/** Normalize any plan string to a valid uppercase UserPlan key */
export function normalizePlan(raw: any): UserPlan {
  if (!raw) return 'FREE';
  const upper = String(raw).toUpperCase();
  // Map legacy / alternate names
  if (upper === 'PRO' || upper === 'PLUS' || upper === 'GMAILER PLUS') return 'PRO';
  if (upper === 'MAX' || upper === 'BUSINESS' || upper === 'GMAILER MAX') return 'MAX';
  return 'FREE';
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  emailsSent: number;
  aiCallsMade: number;
  campaignsCreated: number;
}

export async function getDailyUsage(): Promise<DailyUsage> {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['daily_usage'], (res) => {
        const usage: DailyUsage = res.daily_usage;
        if (usage && usage.date === today) {
          resolve(usage);
        } else {
          resolve({ date: today, emailsSent: 0, aiCallsMade: 0, campaignsCreated: 0 });
        }
      });
    } else {
      resolve({ date: today, emailsSent: 0, aiCallsMade: 0, campaignsCreated: 0 });
    }
  });
}

export async function incrementDailyUsage(field: keyof Omit<DailyUsage, 'date'>, by = 1): Promise<void> {
  const usage = await getDailyUsage();
  usage[field] = (usage[field] as number) + by;
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ daily_usage: usage });
  }
}

export async function canSendEmail(plan: string): Promise<{ allowed: boolean; reason?: string }> {
  const normalizedPlan = normalizePlan(plan);
  const usage = await getDailyUsage();
  const limit = PLANS[normalizedPlan].emailsPerDay;
  if (limit === -1) return { allowed: true }; // unlimited
  if (usage.emailsSent >= limit) {
    return { allowed: false, reason: `Daily limit of ${limit} emails reached for ${PLANS[normalizedPlan].displayName} plan. Resets at midnight.` };
  }
  return { allowed: true };
}

export async function canUseAI(plan: string): Promise<{ allowed: boolean; reason?: string }> {
  const normalizedPlan = normalizePlan(plan);
  const usage = await getDailyUsage();
  const limit = PLANS[normalizedPlan].aiCallsPerDay;
  if (limit === -1) return { allowed: true }; // unlimited
  if (limit === 0) {
    return { allowed: false, reason: `AI features are not available on the ${PLANS[normalizedPlan].displayName} plan. Upgrade to GMailer Plus.` };
  }
  if (usage.aiCallsMade >= limit) {
    return { allowed: false, reason: `Daily AI limit of ${limit} calls reached. Resets at midnight.` };
  }
  return { allowed: true };
}

/** Check if a plan can access a specific named feature */
export function planHasFeature(plan: string, feature: 'AI_EMAIL' | 'JOB_INBOX' | 'ADVANCED_ANALYTICS' | 'RECRUITER_DB' | 'UNLIMITED_CONTACTS' | 'CAMPAIGN_SCHEDULING'): boolean {
  const p = normalizePlan(plan);
  switch (feature) {
    case 'AI_EMAIL': return p === 'PRO' || p === 'MAX';
    case 'JOB_INBOX': return p === 'PRO' || p === 'MAX';
    case 'ADVANCED_ANALYTICS': return p === 'PRO' || p === 'MAX';
    case 'RECRUITER_DB': return p === 'MAX';
    case 'UNLIMITED_CONTACTS': return p === 'PRO' || p === 'MAX';
    case 'CAMPAIGN_SCHEDULING': return p === 'PRO' || p === 'MAX';
    default: return false;
  }
}
