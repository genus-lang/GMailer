import { useState, useRef, useEffect } from "react";
import { EmailThread, useInboxStore } from "@/store/useInboxStore";
import { useStore } from "@/store/useStore";
import { markThreadAsReadAPI, sendReplyAPI } from "@/lib/email/gmailInboxProvider";
import { format } from "date-fns";
import { Send, Reply as ReplyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThreadView({ thread }: { thread: EmailThread }) {
  const { markThreadRead } = useInboxStore();
  const { authToken, userEmail } = useStore();
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mark as read when opened
    if (thread.isUnread && authToken) {
      markThreadAsReadAPI(authToken, thread.id).then((success) => {
        if (success) markThreadRead(thread.id);
      });
    }
  }, [thread.id, thread.isUnread, authToken]);

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.id]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !authToken) return;
    setIsSending(true);
    
    // Find who to reply to (the last person who sent a message that wasn't us)
    const lastIncomingMessage = [...thread.messages].reverse().find(m => !m.from.includes(userEmail || ""));
    const to = lastIncomingMessage ? lastIncomingMessage.from : thread.participants[0];
    const messageId = thread.messages[thread.messages.length - 1].id;
    
    // Ensure subject has Re:
    const subject = thread.subject.toLowerCase().startsWith('re:') ? thread.subject : `Re: ${thread.subject}`;

    const success = await sendReplyAPI(
      authToken,
      thread.id,
      to,
      subject,
      replyText.replace(/\n/g, '<br/>'),
      messageId
    );

    if (success) {
      setReplyText("");
      // Ideally we would fetch the thread again here to show the new message
      // but for now, we'll just let the next background sync catch it
    } else {
      alert("Failed to send reply. Check console for details.");
    }
    
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Thread Header */}
      <div className="h-16 flex items-center px-6 border-b border-border bg-white shrink-0 shadow-sm z-10">
        <h2 className="text-lg font-semibold text-text truncate">
          {thread.subject || "No Subject"}
        </h2>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {thread.messages.map((msg, index) => {
          const isMe = msg.from.includes(userEmail || "");
          
          let dateStr = msg.date;
          try {
             dateStr = format(new Date(msg.date), "MMM d, yyyy 'at' h:mm a");
          } catch (e) {}

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1 px-1">
                <span className="text-sm font-semibold text-gray-700">
                  {isMe ? "You" : msg.from.split('<')[0].trim()}
                </span>
                <span className="text-xs text-secondary">{dateStr}</span>
              </div>
              
              <div 
                className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm text-sm ${
                  isMe 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-white border border-gray-100 text-text rounded-tl-sm'
                }`}
              >
                {/* Render HTML safely or fallback to text */}
                {msg.bodyHtml ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: msg.bodyHtml }} 
                    className={`prose prose-sm max-w-none ${isMe ? 'prose-invert' : ''}`}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.bodyText}</div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Box */}
      <div className="p-4 bg-white border-t border-border">
        <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-sm p-2 text-text"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSendReply();
              }
            }}
          />
          <Button 
            onClick={handleSendReply} 
            disabled={!replyText.trim() || isSending}
            size="icon"
            className="rounded-lg h-10 w-10 shrink-0 bg-primary hover:bg-primary-hover shadow-soft"
          >
            {isSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="text-xs text-secondary mt-2 px-2 flex justify-between">
          <span>Replies are sent directly from your Gmail account.</span>
          <span>Cmd/Ctrl + Enter to send</span>
        </div>
      </div>
    </div>
  );
}
