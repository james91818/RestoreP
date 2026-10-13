import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useLiveChatAlerts } from "@/hooks/useLiveChatAlerts";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const LiveChatsFab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isStaff } = useRole();
  const { alerts, totalUnread, markAllSeen } = useLiveChatAlerts();
  const [showPreview, setShowPreview] = useState(false);

  if (!user || !isStaff) return null;

  const handleOpen = (roomId?: string) => {
    markAllSeen();
    setShowPreview(false);
    if (roomId) {
      navigate(`/backoffice/live-chats?room=${roomId}`);
    } else {
      navigate("/backoffice/live-chats");
    }
  };

  return (
    <>
      {/* Floating Live Chats button — sits to the LEFT of the AI sparkles FAB (bottom-6 right-6) */}
      <div className="fixed bottom-6 right-24 z-50">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <button
            onClick={() => {
              if (totalUnread > 0) {
                setShowPreview((p) => !p);
              } else {
                handleOpen();
              }
            }}
            className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center relative overflow-visible transition-colors ${
              totalUnread > 0
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
            }`}
            aria-label="Live Chats"
            title={
              totalUnread > 0
                ? `${totalUnread} unread live chat message${totalUnread === 1 ? "" : "s"}`
                : "Live Chats"
            }
          >
            <MessageCircle className="h-6 w-6" />

            {totalUnread > 0 && (
              <>
                {/* Pulsing ring */}
                <span className="absolute inset-0 rounded-full bg-destructive opacity-60 animate-ping" />
                {/* Number badge */}
                <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-background text-destructive border-2 border-destructive text-[11px] font-bold flex items-center justify-center tabular-nums shadow-md">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              </>
            )}
          </button>

          {/* Preview popup */}
          <AnimatePresence>
            {showPreview && alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", damping: 22, stiffness: 320 }}
                className="absolute bottom-16 right-0 w-[340px] max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
              >
                <div className="sticky top-0 px-4 py-2.5 border-b border-border bg-popover flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Live Chats</p>
                    <p className="text-[11px] text-muted-foreground">
                      {totalUnread} unread message{totalUnread === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpen()}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Open all
                  </button>
                </div>
                <ul className="divide-y divide-border">
                  {alerts.map((a) => (
                    <li key={a.roomId}>
                      <button
                        onClick={() => handleOpen(a.roomId)}
                        className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate flex-1">
                            {a.clientName}
                          </p>
                          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">
                            {a.unreadCount}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {a.lastMessage}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(a.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
};

export default LiveChatsFab;
