import { useState, useEffect } from "react";
import {
  Bell,
  Check,
  Trash2,
  ShieldAlert,
  Award,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: "approval" | "rework" | "alert" | "system";
  read: boolean;
  ts: string;
  link?: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const db = getFirebaseDb();
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.id),
      orderBy("ts", "desc"),
      limit(25),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as NotificationItem[];
        setNotifications(items);
        setUnreadCount(items.filter((i) => !i.read).length);
      },
      (err) => {
        console.warn("Notifications connection closed:", err);
      },
    );

    return () => unsubscribe();
  }, [user?.id]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const db = getFirebaseDb();
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const db = getFirebaseDb();
      const unread = notifications.filter((n) => !n.read);
      const promises = unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDeleteNotif = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    handleMarkAsRead(item.id);
    setIsOpen(false);
    if (item.link) {
      navigate({ to: item.link });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "approval":
        return <Award className="h-4 w-4 text-emerald-400" />;
      case "rework":
        return <Clock className="h-4 w-4 text-amber-400" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-9 w-9 rounded-full bg-slate-900 border border-white/5 hover:border-indigo-500/50 hover:bg-white/1 transition-all flex items-center justify-center relative"
          aria-label="Notification center"
        >
          <Bell className="h-4 w-4 text-indigo-200" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-rose-500 text-[8px] font-bold font-mono-metric text-white flex items-center justify-center animate-pulse border border-[#090d16]">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 border border-white/10 bg-slate-950/95 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-bold text-white">Security Alerts & Updates</span>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[9px] uppercase tracking-wider text-indigo-400 hover:text-indigo-300 font-mono-metric font-bold"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-mono-metric">
              No new alerts or notifications.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3.5 flex gap-3 text-left hover:bg-white/2 cursor-pointer transition-all ${
                  !item.read ? "bg-indigo-500/5 border-l-2 border-indigo-500" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0">{getCategoryIcon(item.category)}</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="text-xs font-semibold text-white/95 truncate">{item.title}</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{item.body}</p>
                  <div className="text-[9px] text-muted-foreground/60 font-mono-metric">
                    {item.ts}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteNotif(e, item.id)}
                  className="p-1 hover:bg-white/5 rounded text-muted-foreground hover:text-red-400 transition-colors self-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
