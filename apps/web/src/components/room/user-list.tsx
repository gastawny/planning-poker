import type { RoomUser, RoundPhase, UserRole } from "@planning-poker/types";
import { CrownIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";

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
  const isOffline = user.online === false;
  const showVoteStatus = !isOffline && phase === "voting" && user.role === "participant";
  const showContextMenu = isFacilitator && !isMe && user.role !== "facilitator" && !isOffline;
  const showSelfToggle = isMe && user.role !== "facilitator" && !isOffline;
  const toggleRole = user.role === "participant" ? "spectator" : "participant";

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/50 group transition-opacity ${
        isOffline ? "opacity-40" : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className={avatarColor(user.name)} aria-hidden="true">
          <AvatarFallback className="text-white text-xs font-semibold bg-transparent">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        {isOffline && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-muted-foreground/60 border-2 border-background"
            aria-label="Offline"
            title="Disconnected"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {user.name}
            {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
          </span>
          {isHost && (
            <CrownIcon className="size-3 text-[oklch(0.78_0.14_85)] flex-shrink-0" aria-label="Host" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isOffline ? (
            <span className="text-xs text-muted-foreground">Offline</span>
          ) : (
            <>
              <Badge variant={roleVariant[user.role]}>{roleLabel[user.role]}</Badge>
              {showVoteStatus && (
                <span
                  aria-label={user.hasVoted ? "Voted" : "Waiting"}
                  title={user.hasVoted ? "Voted" : "Waiting"}
                  className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    user.hasVoted ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"
                  }`}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {showSelfToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChangeRole(user.id, toggleRole)}
            className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={
              user.role === "participant" ? "Switch to Spectator" : "Switch to Participant"
            }
          >
            {user.role === "participant" ? "Spectate" : "Participate"}
          </Button>
        )}
        {showContextMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label={`Options for ${user.name}`} />
              }
            >
              ⋮
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user.role !== "facilitator" && (
                <DropdownMenuItem onClick={() => onChangeRole(user.id, toggleRole)}>
                  {user.role === "participant" ? "Make Spectator" : "Make Participant"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onKick(user.id)}
                className="text-destructive focus:text-destructive"
              >
                Kick
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
  const sections = [
    { title: "Facilitator", users: facilitators },
    { title: "Participants", users: participants },
    { title: "Spectators", users: spectators },
  ].filter((s) => s.users.length > 0);

  return (
    <nav aria-label="Room members" className="flex flex-col gap-2">
      {sections.map((section, idx) => (
        <div key={section.title}>
          {idx > 0 && <Separator className="my-2" />}
          <Section title={section.title} users={section.users} {...sharedProps} />
        </div>
      ))}
    </nav>
  );
}
