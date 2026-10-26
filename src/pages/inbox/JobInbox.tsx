import { useEffect, useState } from "react";
import { useInboxStore } from "@/store/useInboxStore";
import { useStore } from "@/store/useStore";
import { fetchInboxThreads } from "@/lib/email/gmailInboxProvider";
import { Inbox, RefreshCw, Mail, AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { AuthService } from "@/services/auth.service";
import { ApiService } from "@/services/api.service";

export function JobInbox() {
  const { 
    threads, 
    selectedThreadId, 
    isLoading, 
    setIsLoading, 
    setThreads, 
    syncWithStorage 
  } = useInboxStore();
  
  const { contacts, isConnected } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    syncWithStorage();
    // Auto-load on mount with a small delay to let auth token settle
    const timer = setTimeout(() => {
      loadInbox(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [isConnected]);

  // Retrieve valid Google OAuth Access Token
  const getFreshToken = async (interactive = false): Promise<string | null> => {
    // 1. Check existing in-memory authToken (if valid and not dummy)
    const { authToken, jwtToken, setAuthToken } = useStore.getState();
    if (authToken && authToken !== 'handled_by_backend') {
      return authToken;
    }

    // 2. Check chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const stored = await new Promise<any>((resolve) => {
        chrome.storage.local.get(['googleAccessToken'], (res) => resolve(res || {}));
      });
      if (stored.googleAccessToken) {
        setAuthToken(stored.googleAccessToken);
        return stored.googleAccessToken;
      }
    }

    // 3. Try backend GET /auth/google/token if authenticated with JWT
    if (jwtToken) {
      try {
        const res = await ApiService.get<{ accessToken: string }>('/auth/google/token', jwtToken);
        if (res?.accessToken) {
          setAuthToken(res.accessToken);
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ googleAccessToken: res.accessToken });
          }
          return res.accessToken;
        }
      } catch (e) {
        console.warn('[JobInbox] Failed to get token from backend:', e);
      }
    }

    // 4. Try launchWebAuthFlow (silent or interactive)
    try {
      const webToken = await AuthService.getGoogleAccessToken(interactive);
      if (webToken) {
        setAuthToken(webToken);
        return webToken;
      }
    } catch (e) {
      console.warn('[JobInbox] launchWebAuthFlow failed:', e);
    }

    return null;
  };

  const loadInbox = async (interactive = false) => {
    setError(null);
    setIsLoading(true);
    setIsRefreshing(true);

    try {
      const token = await getFreshToken(interactive);
      
      if (!token) {
        setError('Google authorization required to read recruiter replies.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      console.log('[JobInbox] Loading inbox, contacts:', contacts.length);
      const fetchedThreads = await fetchInboxThreads(token, contacts);
      setThreads(fetchedThreads);
      if (fetchedThreads.length === 0) {
        console.log('[JobInbox] No inbox threads found. This is normal if no replies received yet.');
      }
    } catch (err: any) {
      console.error("[JobInbox] Failed to load inbox:", err);
      if (err.message?.includes('401') || err.message?.includes('Invalid Credentials')) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.remove(['googleAccessToken']);
        }
        useStore.getState().setAuthToken(null);
        setError('Google authorization expired. Please click Authorize Inbox below.');
      } else {
        setError(err.message || 'Failed to load inbox. Please try refreshing.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">Job Inbox</h1>
            <p className="text-sm text-secondary">
              Recruiter responses — {threads.length > 0 ? `${threads.length} conversation${threads.length > 1 ? 's' : ''}` : 'No replies yet'}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadInbox(false)} 
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Error / Auth Banner */}
      {error && (
        <div className="flex items-center justify-between px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
          <Button 
            size="sm" 
            onClick={() => loadInbox(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs h-7 px-3 font-semibold shadow-sm gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Authorize Inbox
          </Button>
        </div>
      )}

      {!isConnected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Mail className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">Connect Google Account</h2>
          <p className="text-secondary max-w-md">
            Please connect your Google Account from the dashboard to view your inbox.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Thread List Sidebar */}
          <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-border flex flex-col bg-card">
            <ThreadList />
          </div>

          {/* Thread View Content */}
          <div className="flex-1 flex flex-col bg-gray-50/50 relative">
            {selectedThread ? (
              <ThreadView thread={selectedThread} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-secondary">
                <Inbox className="w-16 h-16 text-gray-200 mb-4" />
                {threads.length === 0 && !isLoading ? (
                  <>
                    <p className="font-semibold text-text mb-1">No replies found yet</p>
                    <p className="text-sm text-secondary max-w-xs text-center">
                      Once a recruiter replies to your campaign email, their response will appear here automatically.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4 gap-2" 
                      onClick={() => { void loadInbox(true); }}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Check Again
                    </Button>
                  </>
                ) : (
                  <p>Select a conversation to view</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
