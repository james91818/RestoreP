import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { playNewLeadSound } from "@/lib/notificationSound";

export interface LiveChatAlert {
  roomId: string;
  userId: string;
  clientName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

const GLOBAL_KEY = (staffId: string) => `livechat_seen_all_${staffId}`;

const loadGlobalSeen = (staffId: string): string | null => {
  try {
    return localStorage.getItem(GLOBAL_KEY(staffId));
  } catch {
    return null;
  }
};

const saveGlobalSeen = (staffId: string, ts: string) => {
  try {
    localStorage.setItem(GLOBAL_KEY(staffId), ts);
  } catch {}
};

/**
 * Tracks unread client messages across all visible live chat rooms for staff.
 * Reads are persisted server-side in `chat_room_reads` so unread counts survive
 * across devices and re-logins. A localStorage global cutoff is used as a
 * fallback "mark all as seen" optimization.
 */
export const useLiveChatAlerts = () => {
  const { user } = useAuth();
  const { isStaff, roleName } = useRole();
  const [alerts, setAlerts] = useState<LiveChatAlert[]>([]);
  const totalUnreadRef = useRef(0);
  const initializedRef = useRef(false);
  const channelNameRef = useRef(`live-chat-alerts-${Math.random().toString(36).slice(2)}`);

  const isAgentLike =
    roleName === "Agent" ||
    roleName === "Agent Conversion" ||
    roleName === "Agent Retention";

  const refresh = useCallback(async () => {
    if (!user || !isStaff) return;

    const { data: rooms } = await supabase
      .from("chat_rooms")
      .select("id, user_id, status, mode, updated_at")
      .in("status", ["open", "waiting", "escalated"])
      .order("updated_at", { ascending: false })
      .limit(200);

    if (!rooms || rooms.length === 0) {
      setAlerts([]);
      totalUnreadRef.current = 0;
      return;
    }

    let filtered = rooms;
    if (isAgentLike) {
      const userIds = rooms.map((r: any) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, assigned_agent")
        .in("id", userIds);
      const allowed = new Set(
        (profs ?? [])
          .filter((p: any) => p.assigned_agent === user.id)
          .map((p: any) => p.id)
      );
      filtered = rooms.filter((r: any) => allowed.has(r.user_id));
    }

    if (filtered.length === 0) {
      setAlerts([]);
      totalUnreadRef.current = 0;
      return;
    }

    const roomIds = filtered.map((r: any) => r.id);

    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("id, room_id, sender_id, content, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(500);

    const clientIds = Array.from(new Set(filtered.map((r: any) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    const nameMap = new Map<string, string>();
    (profiles ?? []).forEach((p: any) =>
      nameMap.set(p.id, p.full_name || p.email || "Client")
    );

    // Server-side per-room seen timestamps
    const { data: reads } = await supabase
      .from("chat_room_reads")
      .select("room_id, last_read_at")
      .eq("staff_id", user.id)
      .in("room_id", roomIds);
    const seenMap = new Map<string, string>();
    (reads ?? []).forEach((r: any) => seenMap.set(r.room_id, r.last_read_at));

    const globalSeen = loadGlobalSeen(user.id);
    const next: LiveChatAlert[] = [];

    for (const room of filtered) {
      const roomMsgs = (msgs ?? []).filter((m: any) => m.room_id === room.id);
      const clientMsgs = roomMsgs.filter(
        (m: any) => m.sender_id === room.user_id
      );
      if (clientMsgs.length === 0) continue;

      const lastClientMsg = clientMsgs[0];
      const roomSeenAt = seenMap.get(room.id);
      const cutoff =
        roomSeenAt && globalSeen
          ? roomSeenAt > globalSeen
            ? roomSeenAt
            : globalSeen
          : roomSeenAt || globalSeen;

      const unread = cutoff
        ? clientMsgs.filter((m: any) => m.created_at > cutoff).length
        : clientMsgs.length;

      if (unread > 0) {
        next.push({
          roomId: room.id,
          userId: room.user_id,
          clientName: nameMap.get(room.user_id) ?? "Client",
          lastMessage: lastClientMsg.content,
          lastMessageAt: lastClientMsg.created_at,
          unreadCount: unread,
        });
      }
    }

    const total = next.reduce((s, a) => s + a.unreadCount, 0);
    // Only play the alert sound when the unread count actually GROWS after
    // the initial load. Otherwise pre-existing unread chats from previous
    // sessions would falsely sound like "a new chat just arrived".
    if (initializedRef.current && total > totalUnreadRef.current) {
      playNewLeadSound();
    }
    initializedRef.current = true;
    totalUnreadRef.current = total;
    setAlerts(next);
  }, [user, isStaff, isAgentLike]);

  // Mark a single room as seen — persists server-side
  const markSeen = useCallback(
    async (roomId: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      setAlerts((prev) => prev.filter((a) => a.roomId !== roomId));
      await supabase
        .from("chat_room_reads")
        .upsert(
          { room_id: roomId, staff_id: user.id, last_read_at: now },
          { onConflict: "room_id,staff_id" }
        );
    },
    [user]
  );

  // Mark all currently visible rooms as seen — persists server-side
  const markAllSeen = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    saveGlobalSeen(user.id, now);
    const rows = alerts.map((a) => ({
      room_id: a.roomId,
      staff_id: user.id,
      last_read_at: now,
    }));
    setAlerts([]);
    totalUnreadRef.current = 0;
    if (rows.length > 0) {
      await supabase
        .from("chat_room_reads")
        .upsert(rows, { onConflict: "room_id,staff_id" });
    }
  }, [user, alerts]);

  useEffect(() => {
    if (!user || !isStaff) return;

    refresh();
    const interval = setInterval(refresh, 8000);

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => refresh()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [user, isStaff, refresh]);

  const totalUnread = alerts.reduce((s, a) => s + a.unreadCount, 0);

  return { alerts, totalUnread, refresh, markSeen, markAllSeen };
};
