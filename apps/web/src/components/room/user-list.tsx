import type { RoomUser, RoundPhase, UserRole } from "@planning-poker/types";
import { useEffect, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface UserListProps {
  users: RoomUser[];
  hostId: string;
  myUserId: string;
  phase: RoundPhase;
  isFacilitator: boolean;
  onChangeRole: (targetUserId: string, newRole: "participant" | "spectator") => void;
  onKick: (targetUserId: string) => void;
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-orange-500",
  "bg-teal-500",
] as const;

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const roleVariant: Record<UserRole, "default" | "success" | "warning" | "destructive"> = {
  facilitator: "default",
  participant: "default",
  spectator: "warning",
};

const roleLabel: Record<UserRole, string> = {
  facilitator: "Facilitator",
  participant: "Participant",
  spectator: "Spectator",
};

interface ContextMenuProps {
  user: RoomUser;
  onChangeRole: (newRole: "participant" | "spectator") => void;
  onKick: () => void;
}

function ContextMenu({ user, onChangeRole, onKick }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleRole = user.role === "participant" ? "spectator" : "participant";
  const toggleLabel = user.role === "participant" ? "Make Spectator" : "Make Participant";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Options for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        ⋮
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-7 z-20 min-w-[140px] bg-white border border-zinc-200 rounded-lg shadow-md py-1 text-sm"
        >
          {user.role !== "facilitator" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onChangeRole(toggleRole);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 text-zinc-700"
            >
              {toggleLabel}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onKick();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600"
          >
            Kick
          </button>
        </div>
      )}
    </div>
  );
}

interface UserCardProps {
  user: RoomUser;
  hostId: string;
  myUserId: string;
  phase: RoundPhase;
  isFacilitator: boolean;
  onChangeRole: (targetUserId: string, newRole: "participant" | "spectator") => void;
  onKick: (targetUserId: string) => void;
}

function UserCard({
  user,
  hostId,
  myUserId,
  phase,
  isFacilitator,
  onChangeRole,
  onKick,
}: UserCardProps) {
  const isMe = user.id === myUserId;
  const isHost = user.id === hostId;
  const showVoteStatus = phase === "voting" && user.role === "participant";
  const showContextMenu = isFacilitator && !isMe && user.role !== "facilitator";
  const showSelfToggle = isMe && user.role !== "facilitator";

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-50 group">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full ${avatarColor(user.name)} flex items-center justify-center text-white text-xs font-semibold select-none`}
        aria-hidden="true"
      >
        {initials(user.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-zinc-900 truncate">
            {user.name}
            {isMe && <span className="text-zinc-400 font-normal"> (you)</span>}
          </span>
          {isHost && (
            <span aria-label="Host" title="Host" className="text-amber-500 text-xs flex-shrink-0">
              ★
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant={roleVariant[user.role]}>{roleLabel[user.role]}</Badge>
          {showVoteStatus && (
            <span
              aria-label={user.hasVoted ? "Voted" : "Waiting"}
              title={user.hasVoted ? "Voted" : "Waiting"}
              className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                user.hasVoted ? "bg-green-500" : "bg-zinc-300"
              }`}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {showSelfToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChangeRole(user.id, user.role === "participant" ? "spectator" : "participant")
            }
            className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={
              user.role === "participant" ? "Switch to Spectator" : "Switch to Participant"
            }
          >
            {user.role === "participant" ? "Spectate" : "Participate"}
          </Button>
        )}
        {showContextMenu && (
          <ContextMenu
            user={user}
            onChangeRole={(newRole) => onChangeRole(user.id, newRole)}
            onKick={() => onKick(user.id)}
          />
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  users,
  hostId,
  myUserId,
  phase,
  isFacilitator,
  onChangeRole,
  onKick,
}: {
  title: string;
  users: RoomUser[];
} & Omit<UserListProps, "users">) {
  if (users.length === 0) return null;
  return (
    <div>
      <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title} ({users.length})
      </p>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <UserCard
              user={user}
              hostId={hostId}
              myUserId={myUserId}
              phase={phase}
              isFacilitator={isFacilitator}
              onChangeRole={onChangeRole}
              onKick={onKick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UserList({
  users,
  hostId,
  myUserId,
  phase,
  isFacilitator,
  onChangeRole,
  onKick,
}: UserListProps) {
  const facilitators = users.filter((u) => u.role === "facilitator");
  const participants = users.filter((u) => u.role === "participant");
  const spectators = users.filter((u) => u.role === "spectator");

  const sharedProps = { hostId, myUserId, phase, isFacilitator, onChangeRole, onKick };

  return (
    <nav aria-label="Room members" className="flex flex-col gap-4">
      <Section title="Facilitator" users={facilitators} {...sharedProps} />
      <Section title="Participants" users={participants} {...sharedProps} />
      <Section title="Spectators" users={spectators} {...sharedProps} />
    </nav>
  );
}
