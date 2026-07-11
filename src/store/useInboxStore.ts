import { create } from 'zustand';

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
}

export interface EmailThread {
  id: string;
  snippet: string;
  lastMessageDate: string;
  isUnread: boolean;
  messages: EmailMessage[];
  participants: string[];
  subject: string;
}

interface InboxState {
  threads: EmailThread[];
  selectedThreadId: string | null;
  isLoading: boolean;
  error: string | null;
  lastSync: number | null;
  unreadCount: number;
  
  setThreads: (threads: EmailThread[]) => void;
  setSelectedThreadId: (id: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  markThreadRead: (id: string) => void;
  
  syncWithStorage: () => void;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  threads: [],
  selectedThreadId: null,
  isLoading: false,
  error: null,
  lastSync: null,
  unreadCount: 0,

  setThreads: (threads) => {
    const unreadCount = threads.filter(t => t.isUnread).length;
    set({ threads, unreadCount, lastSync: Date.now() });
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ inbox_threads: threads, inbox_lastSync: Date.now() });
    }
  },

  setSelectedThreadId: (id) => set({ selectedThreadId: id }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  markThreadRead: (id) => {
    const { threads } = get();
    const updated = threads.map(t => t.id === id ? { ...t, isUnread: false } : t);
    get().setThreads(updated);
  },

  syncWithStorage: () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['inbox_threads', 'inbox_lastSync'], (result) => {
        if (result.inbox_threads) {
          const unreadCount = result.inbox_threads.filter((t: EmailThread) => t.isUnread).length;
          set({ 
            threads: result.inbox_threads, 
            lastSync: result.inbox_lastSync || null,
            unreadCount
          });
        }
      });
    }
  }
}));
