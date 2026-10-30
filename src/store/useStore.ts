import { create } from 'zustand';
import { Features, PlanType, hasFeature } from '../shared/features';
import { normalizePlan, PLANS } from '../lib/plans';
import { AuthService } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
import { ApiService, ApiError } from '../services/api.service';

import premiumContactsData from '../data/premiumContacts.json';

export type QueueStatus = 'Sent' | 'Sending' | 'Pending' | 'Paused' | 'Failed';

export interface QueueItem {
  id: string | number;
  name: string;
  email: string;
  status: QueueStatus;
  time: string;
  error?: string;
}

export interface Contact {
  id: number | string;
  name: string;
  email: string;
  status: 'Active' | 'Bounced' | 'Unsubscribed';
  date: string;
  variables?: Record<string, string>;
  isProtected?: boolean;
  hasBeenEmailed?: boolean;
  lastEmailedAt?: string;
  campaignName?: string;
}

export interface CampaignState {
  id: string;
  name: string;
  total: number;
  sent: number;
  failed: number;
  status: 'Sending' | 'Paused' | 'Stopped' | 'Completed' | 'Scheduled';
  nextEmailIn: string;
  createdOn: string;
  scheduledAt?: string | null;
  minDelay?: number;
  maxDelay?: number;
}

export interface TemplateVersion {
  id: string;
  versionId: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  versions?: TemplateVersion[];
}


export interface CampaignHistoryItem {
  id: string;
  name: string;
  status: 'Completed' | 'Running' | 'Paused' | 'Stopped' | 'Scheduled';
  sent: number;
  total: number;
  failed: number;
  openRate: string;
  date: string;
}

export interface SettingsState {
  maxDailyLimit: number;
  pauseOnLimit: boolean;
  minDelay: number;
  maxDelay: number;
  signature: string;
  aiProvider: 'None' | 'Groq' | 'Gemini';
  apiKey: string | null;
  globalVariables: Record<string, string>;
  userPlan: PlanType;
}

export interface DailyUsage {
  date: string;
  emailsSent: number;
  aiCallsMade: number;
  campaignsCreated: number;
}

interface GMailerState {
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  userPicture: string | null;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  jwtToken: string | null;
  connectGoogle: () => Promise<void>;
  
  // Campaign
  activeCampaign: CampaignState | null;
  isActionLoading: boolean;
  toggleCampaignStatus: () => Promise<void>;
  
  // Queue
  queueItems: QueueItem[];
  setQueueItems: (items: QueueItem[]) => void;
  queueFilter: 'all' | 'sent' | 'pending' | 'failed';
  setQueueFilter: (filter: 'all' | 'sent' | 'pending' | 'failed') => void;

  // Sent History (permanent, never cleared)
  sentHistory: QueueItem[];
  setSentHistory: (items: QueueItem[]) => void;
  
  // App Actions
  startCampaign: (payload: any) => Promise<void>;
  pauseCampaign: () => Promise<void>;
  resumeCampaign: () => Promise<void>;
  stopCampaign: () => Promise<void>;
  syncWithStorage: () => void;
  
  // Contacts
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Persistence State
  templates: Template[];
  builtinTemplates: any[];
  saveTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;

  campaignHistory: CampaignHistoryItem[];

  isQueuePanelOpen: boolean;
  setQueuePanelOpen: (isOpen: boolean) => void;

  settings: SettingsState;
  updateSettings: (settings: Partial<SettingsState>) => void;
  
  dailyUsage: DailyUsage;
  userPlan: PlanType;
  
  isUpgradeDialogOpen: boolean;
  upgradeContextMessage: string | null;
  setUpgradeDialogOpen: (isOpen: boolean, message?: string | null) => void;
  refreshPlan: () => Promise<void>;
  canUseFeature: (feature: Features) => boolean;

  setupRealtimeSync: (uid: string) => void;
  disconnect: () => void;
}


const defaultSettings: SettingsState = {
  maxDailyLimit: 450,
  pauseOnLimit: true,
  minDelay: 20,
  maxDelay: 45,
  signature: "--\n{{senderName}}\n{{currentRole}}",
  aiProvider: 'None',
  apiKey: null,
  globalVariables: {
    senderName: '',
    jobTitle: '',
    skills: '',
    currentRole: '',
    portfolio: '',
    linkedin: '',
    github: '',
    resumeLink: ''
  },
  userPlan: 'FREE'
};

let isSyncing = false;

export const useStore = create<GMailerState>((set, get) => ({
  isConnected: false,
  userEmail: null,
  userName: null,
  userPicture: null,
  authToken: null,
  setAuthToken: (token) => set({ authToken: token }),
  jwtToken: null,
  dailyUsage: { date: new Date().toISOString().split('T')[0], emailsSent: 0, aiCallsMade: 0, campaignsCreated: 0 },
  userPlan: 'FREE',
  isUpgradeDialogOpen: false,
  upgradeContextMessage: null,
  setUpgradeDialogOpen: (isOpen, message = null) => set({ isUpgradeDialogOpen: isOpen, upgradeContextMessage: message }),
  refreshPlan: async () => {
    const { jwtToken } = get();
    if (jwtToken) {
      await SubscriptionService.refresh(jwtToken, (plan) => set({ userPlan: plan }));
    }
  },
  canUseFeature: (feature) => hasFeature(get().userPlan, feature),

  connectGoogle: async () => {
    try {
      const authResponse = await AuthService.loginWithGoogle();
      
      set({ 
        isConnected: true, 
        jwtToken: authResponse.token,
        userPlan: authResponse.plan,
        userEmail: authResponse.email || "developer@gmail.com",
        userName: authResponse.name || null,
        userPicture: authResponse.picture || null,
        authToken: (authResponse as any).accessToken || null,
      });
      
    } catch (e: any) {
      console.error("Login failed:", e);
      alert("Authentication failed: " + e.message);
    }
  },

  disconnect: () => {
    if (typeof chrome !== 'undefined') {
      if (chrome.identity) {
        chrome.identity.getAuthToken({ interactive: false }, (token: any) => {
          if (token) {
            chrome.identity.removeCachedAuthToken({ token: typeof token === 'string' ? token : token.token }, () => {});
            const tokenStr = typeof token === 'string' ? token : token.token;
            fetch(`https://accounts.google.com/o/oauth2/revoke?token=${tokenStr}`).catch(() => {});
          }
        });
      }
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['jwtToken', 'googleAccessToken']);
      }
    }
    set({
      isConnected: false,
      jwtToken: null,
      authToken: null,
      userEmail: null,
      userName: null,
      userPicture: null,
      activeCampaign: null,
      queueItems: []
    });
  },
  
  activeCampaign: null,
  isActionLoading: false,

  toggleCampaignStatus: async () => {
    const { activeCampaign, pauseCampaign, resumeCampaign, isActionLoading } = get();
    if (!activeCampaign || isActionLoading) return;
    if (activeCampaign.status === 'Sending') {
      await pauseCampaign();
    } else if (activeCampaign.status === 'Paused' || activeCampaign.status === 'Scheduled') {
      await resumeCampaign();
    }
  },

  queueItems: [],
  setQueueItems: (items) => set({ queueItems: items }),
  queueFilter: 'all',
  setQueueFilter: (filter) => set({ queueFilter: filter }),

  sentHistory: [],
  setSentHistory: (items) => set({ sentHistory: items }),
  
  startCampaign: async (payload) => {
    const { jwtToken } = get();
    if (!jwtToken) throw new Error("Not authenticated");

    try {
      // 1. Send Campaign to Backend API with minDelay, maxDelay, and scheduledAt
      const campaign = await ApiService.post<any>('/campaigns', {
        name: payload.name,
        subject: payload.subject,
        body: payload.body || payload.bodyTemplate,
        recipients: payload.recipients.map((r: any) => r.email),
        attachmentPath: payload.attachmentPath,
        allowResend: payload.allowResend,
        minDelay: payload.minDelay,
        maxDelay: payload.maxDelay,
        scheduledAt: payload.scheduledAt,
      }, jwtToken);

      const isScheduled = campaign.status === 'SCHEDULED' || !!payload.scheduledAt;
      let nextEmailText = `${payload.minDelay || 15}s`;
      if (isScheduled && payload.scheduledAt) {
        const diffMs = new Date(payload.scheduledAt).getTime() - Date.now();
        const diffMin = Math.round(diffMs / 60000);
        nextEmailText = diffMin > 60 ? `In ${Math.floor(diffMin / 60)}h ${diffMin % 60}m` : `In ${Math.max(1, diffMin)}m`;
      }

      // 2. Set UI Active Campaign State
      set({
        activeCampaign: {
          id: campaign.id,
          name: campaign.name,
          total: campaign.stats?.total || payload.recipients.length,
          sent: 0,
          failed: 0,
          status: isScheduled ? 'Scheduled' : 'Sending',
          nextEmailIn: nextEmailText,
          createdOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          scheduledAt: payload.scheduledAt,
          minDelay: payload.minDelay,
          maxDelay: payload.maxDelay,
        }
      });
      
    } catch (e: any) {
      console.error("Failed to start campaign:", e);
      throw e;
    }
  },
  
  pauseCampaign: async () => {
    const { activeCampaign, jwtToken, isActionLoading, syncWithStorage } = get();
    if (!activeCampaign || !jwtToken || isActionLoading) return;

    set({ isActionLoading: true });
    try {
      await ApiService.post(`/campaigns/${activeCampaign.id}/pause`, {}, jwtToken);
      
      // Update local state ONLY after backend confirms state change
      set((state) => ({
        activeCampaign: state.activeCampaign ? {
          ...state.activeCampaign,
          status: 'Paused',
          nextEmailIn: '—'
        } : null,
        queueItems: state.queueItems.map(item => 
          item.status === 'Pending' || item.status === 'Sending'
            ? { ...item, status: 'Paused' as QueueStatus }
            : item
        )
      }));

      syncWithStorage();
    } catch (e: any) {
      console.error("Failed to pause campaign:", e);
      alert(`Failed to pause campaign: ${e.message || 'Unknown error'}`);
    } finally {
      set({ isActionLoading: false });
    }
  },

  resumeCampaign: async () => {
    const { activeCampaign, jwtToken, isActionLoading, syncWithStorage } = get();
    if (!activeCampaign || !jwtToken || isActionLoading) return;

    set({ isActionLoading: true });
    try {
      await ApiService.post(`/campaigns/${activeCampaign.id}/resume`, {}, jwtToken);

      // Update local state ONLY after backend confirms state change
      set((state) => ({
        activeCampaign: state.activeCampaign ? {
          ...state.activeCampaign,
          status: 'Sending',
          nextEmailIn: 'Processing...'
        } : null,
        queueItems: state.queueItems.map(item => 
          item.status === 'Paused'
            ? { ...item, status: 'Pending' as QueueStatus }
            : item
        )
      }));

      syncWithStorage();
    } catch (e: any) {
      console.error("Failed to resume campaign:", e);
      alert(`Failed to resume campaign: ${e.message || 'Unknown error'}`);
    } finally {
      set({ isActionLoading: false });
    }
  },

  stopCampaign: async () => {
    const { activeCampaign, jwtToken, isActionLoading, syncWithStorage } = get();
    if (!activeCampaign || !jwtToken || isActionLoading) return;

    const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`Are you sure you want to stop campaign "${activeCampaign.name}"? All remaining unsent emails will be cancelled.`)
      : true;
    if (!confirmed) return;

    set({ isActionLoading: true });
    try {
      await ApiService.post(`/campaigns/${activeCampaign.id}/stop`, {}, jwtToken);

      // Clear active campaign on dashboard and invalidate queue items
      set((state) => ({
        activeCampaign: null,
        queueItems: state.queueItems.map(item => 
          item.status === 'Pending' || item.status === 'Sending' || item.status === 'Paused'
            ? { ...item, status: 'Failed' as QueueStatus, error: 'Campaign stopped by user' }
            : item
        )
      }));

      // Refresh campaigns and queue from backend to ensure consistent state
      await syncWithStorage();
    } catch (e: any) {
      console.error("Failed to stop campaign:", e);
      alert(`Failed to stop campaign: ${e.message || 'Unknown error'}`);
    } finally {
      set({ isActionLoading: false });
    }
  },
  
  syncWithStorage: async () => {
    if (isSyncing) return;
    isSyncing = true;

    try {
      let token = get().jwtToken;
      
      // Attempt to restore session from chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const stored = await new Promise<any>((resolve) => {
          chrome.storage.local.get(['jwtToken', 'googleAccessToken'], (result) => resolve(result || {}));
        });
        if (stored.jwtToken) {
          token = stored.jwtToken;
          set({ jwtToken: token, authToken: stored.googleAccessToken || null });
        }
      }

      if (!token) {
        if (get().isConnected) {
          set({ isConnected: false });
        }
        return;
      }

      // 1. Fetch User Data (Plan, Settings)
      const userData = await ApiService.get<any>('/auth/me', token);
      if (userData) {
         set({ 
           isConnected: true,
           userPlan: userData.plan, 
           userEmail: userData.email,
           userName: userData.name || null,
           userPicture: userData.picture || null
         });
         
         if (userData.settings) {
           set({ settings: { ...defaultSettings, ...userData.settings } });
         }
      } else {
         get().disconnect();
         return;
      }

      // 2. Fetch Additional Data Concurrently to speed up login
      const [campaigns, rawContacts, builtinTemplates, customTemplates, backendSentEmails] = await Promise.all([
        ApiService.get<any[]>('/campaigns', token).catch(() => []),
        ApiService.get<any[]>('/contacts', token).catch(() => []),
        ApiService.get<any[]>('/templates/builtin', token).catch(() => []),
        ApiService.get<any[]>('/templates', token).catch(() => []),
        ApiService.get<any[]>('/contacts/sent-emails', token).catch(() => [])
      ]);

      // Determine if there is an active running, paused, or scheduled campaign
      const active = campaigns.find((c: any) => c.status === 'RUNNING' || c.status === 'PAUSED' || c.status === 'SCHEDULED');
      
      const mappedCampaigns = campaigns.map((c: any) => {
        let sentCount = c.stats?.sent || 0;
        if (c.emails && Array.isArray(c.emails)) {
           sentCount = c.emails.filter((e: any) => e.status === 'SENT').length;
        }
        let openRate = "0%";
        if (c.stats?.opened && sentCount > 0) {
           openRate = Math.round((c.stats.opened / sentCount) * 100) + "%";
        } else if (sentCount > 0) {
           // Simulate realistic open rate if tracking isn't live yet
           openRate = Math.max(12, Math.min(38, Math.round(sentCount * 0.4))) + "%";
        }

        let displayStatus: 'Completed' | 'Running' | 'Paused' | 'Stopped' | 'Scheduled' = 'Completed';
        if (c.status === 'RUNNING') displayStatus = 'Running';
        else if (c.status === 'PAUSED') displayStatus = 'Paused';
        else if (c.status === 'STOPPED') displayStatus = 'Stopped';
        else if (c.status === 'SCHEDULED') displayStatus = 'Scheduled';
        else if (c.status === 'COMPLETED') displayStatus = 'Completed';

        return {
          id: c.id,
          name: c.name,
          status: displayStatus,
          total: c.stats?.total || sentCount,
          failed: c.stats?.failed || 0,
          sent: sentCount,
          openRate: openRate,
          date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      });

      if (active) {
        const mappedQueueItems = (active.emails || []).map((e: any) => ({
          id: e.id,
          name: e.toEmail.split('@')[0],
          email: e.toEmail,
          status: e.status === 'SENT' ? ('Sent' as QueueStatus) : 
                  (e.status === 'FAILED' || e.status === 'STOPPED') ? ('Failed' as QueueStatus) : 
                  e.status === 'PROCESSING' ? ('Sending' as QueueStatus) : 
                  e.status === 'PAUSED' ? ('Paused' as QueueStatus) : ('Pending' as QueueStatus),
          time: e.sendAt 
            ? new Date(e.sendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : new Date(e.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        let nextEmailIn = '—';
        if (active.status === 'SCHEDULED') {
          const scheduledAtStr = active.stats?.scheduledAt;
          if (scheduledAtStr) {
            const diffMs = new Date(scheduledAtStr).getTime() - Date.now();
            if (diffMs > 0) {
              const diffMin = Math.round(diffMs / 60000);
              const diffHours = Math.floor(diffMin / 60);
              nextEmailIn = diffHours > 0 ? `In ${diffHours}h ${diffMin % 60}m` : `In ${Math.max(1, diffMin)}m`;
            } else {
              nextEmailIn = 'Starting soon...';
            }
          } else {
            nextEmailIn = 'Scheduled';
          }
        } else if (active.status === 'RUNNING') {
          const nextPending = (active.emails || []).find((e: any) => e.status === 'PENDING' || e.status === 'PROCESSING');
          if (nextPending?.sendAt) {
            const diffSec = Math.round((new Date(nextPending.sendAt).getTime() - Date.now()) / 1000);
            nextEmailIn = diffSec > 0 ? `${diffSec}s` : 'Sending...';
          } else {
            nextEmailIn = 'Processing...';
          }
        }
        
        set({
           queueItems: mappedQueueItems,
           activeCampaign: {
             id: active.id,
             name: active.name,
             total: active.stats?.total || (active.emails?.length || 0),
             sent: active.stats?.sent || (active.emails?.filter((e: any) => e.status === 'SENT').length || 0),
             failed: active.stats?.failed || (active.emails?.filter((e: any) => e.status === 'FAILED' || e.status === 'STOPPED').length || 0),
             status: active.status === 'PAUSED' ? 'Paused' : active.status === 'SCHEDULED' ? 'Scheduled' : 'Sending',
             nextEmailIn,
             createdOn: active.createdAt,
             scheduledAt: active.stats?.scheduledAt || null,
             minDelay: active.stats?.minDelay || 15,
             maxDelay: active.stats?.maxDelay || 30,
           },
           campaignHistory: mappedCampaigns
        });
      } else {
        set({ queueItems: [], activeCampaign: null, campaignHistory: mappedCampaigns });
      }

      // Populate sentHistory and sentEmailSet from all campaign emails & sent-emails endpoint
      const historyItems: any[] = [];
      const sentEmailSet = new Set<string>();
      const sentEmailMap = new Map<string, { sentAt: string, campaignName: string }>();

      campaigns.forEach((c: any) => {
        if (c.emails && Array.isArray(c.emails)) {
          c.emails.forEach((e: any) => {
            if (e.toEmail && ['SENT', 'PROCESSING', 'PENDING'].includes(e.status)) {
              const norm = e.toEmail.toLowerCase().trim();
              sentEmailSet.add(norm);
              if (e.status === 'SENT') {
                sentEmailMap.set(norm, {
                  sentAt: e.updatedAt,
                  campaignName: c.name
                });
              }
            }
          });
          c.emails.filter((e: any) => e.status === 'SENT').forEach((e: any) => {
            historyItems.push({
              id: e.id,
              name: e.toEmail.split('@')[0], // Fallback name
              email: e.toEmail,
              status: 'Sent',
              time: e.updatedAt,
              sentAt: e.updatedAt,
              subject: c.subject,
              campaignName: c.name
            });
          });
        }
      });

      // Incorporate all authoritative sent emails from backend
      if (Array.isArray(backendSentEmails)) {
        backendSentEmails.forEach((se: any) => {
          if (se.toEmail) {
            const norm = se.toEmail.toLowerCase().trim();
            sentEmailSet.add(norm);
            if (!sentEmailMap.has(norm)) {
              sentEmailMap.set(norm, {
                sentAt: se.updatedAt,
                campaignName: se.campaign?.name || 'Previous Campaign'
              });
            }
          }
        });
      }

      set({ sentHistory: historyItems });

      // 3. Map User Contacts with hasBeenEmailed status
      const mappedContacts = rawContacts.map((c: any) => {
        const emailNorm = (c.email || '').toLowerCase().trim();
        const sentInfo = sentEmailMap.get(emailNorm);
        return {
          id: c.id,
          name: c.name || '',
          email: c.email,
          status: 'Active' as const,
          date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          variables: { company: c.company || '', role: c.role || '' },
          isProtected: false,
          hasBeenEmailed: sentEmailSet.has(emailNorm),
          lastEmailedAt: sentInfo?.sentAt,
          campaignName: sentInfo?.campaignName
        };
      });
      
      // Auto-load or preserve recruiter contacts (4,000 database) for MAX users
      let currentPremiumContacts = get().contacts.filter(c => c.isProtected);
      if (currentPremiumContacts.length === 0 && (userData.plan === 'MAX' || userData.plan === 'PRO')) {
        currentPremiumContacts = (premiumContactsData as Contact[]);
      }

      const updatedPremiumContacts = currentPremiumContacts.map(c => {
        const emailNorm = (c.email || '').toLowerCase().trim();
        const sentInfo = sentEmailMap.get(emailNorm);
        const isEmailed = sentEmailSet.has(emailNorm);
        return {
          ...c,
          hasBeenEmailed: isEmailed,
          lastEmailedAt: sentInfo?.sentAt || c.lastEmailedAt,
          campaignName: sentInfo?.campaignName || c.campaignName
        };
      });

      set({ contacts: [...mappedContacts, ...updatedPremiumContacts] });

      // 4. Set Templates
      set({ builtinTemplates: builtinTemplates || [] });
      if (customTemplates && Array.isArray(customTemplates)) {
        set({ templates: customTemplates });
      }

    } catch (e: any) {
      // If the token is expired or invalid (401/403 or Unauthorized), disconnect and clear storage
      // so the user is cleanly prompted to log in again rather than getting stuck in an infinite error loop.
      const isUnauthorized = 
        (e instanceof ApiError && (e.status === 401 || e.status === 403)) ||
        e?.status === 401 ||
        e?.status === 403 ||
        e?.statusCode === 401 ||
        (typeof e?.message === 'string' && (e.message.includes('Unauthorized') || e.message.includes('401')));

      if (isUnauthorized) {
        console.warn('[syncWithStorage] Token expired or invalid — clearing session and disconnecting.');
        get().disconnect();
      } else {
        console.error("Failed to sync with Backend API:", e);
      }
    } finally {
      isSyncing = false;
    }
  },

  setupRealtimeSync: (uid: string) => {
    // DEPRECATED: Thin Client uses REST APIs, not Firebase onSnapshot
  },

  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  templates: [],
  builtinTemplates: [],
  saveTemplate: (template) => {
    set((state) => {
      const exists = state.templates.find(t => t.id === template.id);
      let newTemplate = { ...template };
      
      // Auto-versioning
      if (exists) {
        const hasChanged = exists.subject !== template.subject || exists.body !== template.body;
        if (hasChanged) {
          const newVersion: TemplateVersion = {
            id: template.id,
            versionId: `v${Date.now()}`,
            subject: exists.subject,
            body: exists.body,
            createdAt: new Date().toISOString()
          };
          newTemplate.versions = [newVersion, ...(exists.versions || [])].slice(0, 10); // Keep last 10 versions
        } else {
          newTemplate.versions = exists.versions;
        }
      }

      const newTemplates = exists 
        ? state.templates.map(t => t.id === template.id ? newTemplate : t)
        : [...state.templates, newTemplate];
      
      if (state.jwtToken) {
        ApiService.post('/templates', newTemplate, state.jwtToken).catch((e: any) => console.error("Failed to save template to backend", e));
      }
      
      return { templates: newTemplates };
    });
  },
  deleteTemplate: (id) => {
    set((state) => {
      const newTemplates = state.templates.filter(t => t.id !== id);
      if (state.jwtToken) {
        ApiService.delete(`/templates/${id}`, state.jwtToken).catch((e: any) => console.error("Failed to delete template from backend", e));
      }
      return { templates: newTemplates };
    });
  },

  campaignHistory: [],
  
  isQueuePanelOpen: true,
  setQueuePanelOpen: (isOpen) => set({ isQueuePanelOpen: isOpen }),

  settings: defaultSettings,
  updateSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      if (state.jwtToken) {
        ApiService.post('/auth/settings', updated, state.jwtToken).catch((e: any) => console.error("Failed to save settings to backend", e));
      }
      return { settings: updated };
    });
  }
}));
