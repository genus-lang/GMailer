import { useInboxStore, EmailThread } from "@/store/useInboxStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function ThreadList() {
  const { threads, selectedThreadId, setSelectedThreadId, isLoading } = useInboxStore();

  if (isLoading && threads.length === 0) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary text-sm p-8 text-center">
        No job responses found yet.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread) => {
        const isSelected = selectedThreadId === thread.id;
        // Parse date for display
        let dateStr = "";
        try {
          if (thread.lastMessageDate) {
            dateStr = formatDistanceToNow(new Date(thread.lastMessageDate), { addSuffix: true });
          }
        } catch (e) {
          dateStr = thread.lastMessageDate || "";
        }

        return (
          <div
            key={thread.id}
            onClick={() => setSelectedThreadId(thread.id)}
            className={cn(
              "p-4 border-b border-border cursor-pointer transition-colors relative",
              isSelected ? "bg-primary-light/50" : "hover:bg-gray-50",
              thread.isUnread && !isSelected ? "bg-white" : ""
            )}
          >
            {thread.isUnread && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            )}
            <div className="flex justify-between items-baseline mb-1">
              <span className={cn(
                "font-medium truncate pr-2 text-sm",
                thread.isUnread ? "text-text font-bold" : "text-gray-700"
              )}>
                {thread.participants[0] || "Unknown"}
              </span>
              <span className="text-xs text-secondary whitespace-nowrap">
                {dateStr}
              </span>
            </div>
            <div className={cn(
              "text-sm truncate mb-1",
              thread.isUnread ? "text-text font-semibold" : "text-text"
            )}>
              {thread.subject || "No Subject"}
            </div>
            <div className="text-xs text-secondary line-clamp-2 leading-relaxed">
              {thread.snippet.replace(/&#39;/g, "'").replace(/&quot;/g, '"')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
