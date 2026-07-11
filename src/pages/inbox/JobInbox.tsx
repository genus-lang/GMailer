import { useEffect, useState } from "react";
import { useInboxStore } from "@/store/useInboxStore";
import { useStore } from "@/store/useStore";
import { fetchInboxThreads } from "@/lib/email/gmailInboxProvider";
import { Inbox, RefreshCw, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";

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
      loadInbox();
    }, 800);
    return () => clearTimeout(timer);
  }, [isConnected]);

  // Get fresh token from chrome.identity directly (avoids stale authToken state)
  const getFreshToken = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.identity) {
        resolve(null);
        return;
      }
      chrome.identity.getAuthToken({ interactive: false }, (token: any) => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError || !token) {
          console.warn('[JobInbox] Could not get auth token:', runtime.lastError?.message);
          resolve(null);
        } else {
          resolve(typeof token === 'string' ? token : null);
        }
      });
    });
  };

  const loadInbox = async () => {
    setError(null);
    const token = await getFreshToken();
    
    if (!token) {
      setError('Not authenticated. Please connect your Google account.');
      return;
    }

    setIsLoading(true);
    setIsRefreshing(true);
    try {
      console.log('[JobInbox] Loading inbox, contacts:', contacts.length);
      const fetchedThreads = await fetchInboxThreads(token, contacts);
      setThreads(fetchedThreads);
      if (fetchedThreads.length === 0) {
        console.log('[JobInbox] No inbox threads found. This is normal if no replies received yet.');
      }
    } catch (err: any) {
      console.error("[JobInbox] Failed to load inbox:", err);
      setError(err.message || 'Failed to load inbox. Please try refreshing.');
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
          onClick={loadInbox} 
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
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
                      onClick={loadInbox}
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
