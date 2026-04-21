import type { RoomState, RoomUser, UserRole, VoteStats } from "@planning-poker/types";
import { create } from "zustand";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

interface RoomStore {
  userId: string | null;
  userName: string | null;
  roomState: RoomState | null;
  selectedVote: string | null;
  connectionStatus: ConnectionStatus;
  stats: VoteStats | null;
  nonVoters: string[];
  onAllVoted: (() => void) | null;
  onScaleUpdated: ((votesCleared: boolean) => void) | null;

  setConnectionStatus: (status: ConnectionStatus) => void;
  setUserId: (id: string) => void;
  setUserName: (name: string) => void;
  setSelectedVote: (value: string | null) => void;
  setOnAllVoted: (cb: (() => void) | null) => void;
  setOnScaleUpdated: (cb: ((votesCleared: boolean) => void) | null) => void;

  handleRoomJoined: (state: RoomState, userId: string) => void;
  handleRoomState: (state: RoomState) => void;
  handleUserJoined: (user: RoomUser) => void;
  handleUserLeft: (userId: string, kicked?: boolean) => void;
  handleUserRoleChanged: (userId: string, newRole: UserRole) => void;
  handleVoteProgress: (userId: string, votesCount: number, participantsCount: number) => void;
  handleVoteRevealed: (
    votes: Record<string, string>,
    stats: VoteStats | null,
    nonVoters: string[]
  ) => void;
  handleRoundStarted: (taskName: string | null) => void;
  handleRoundReset: () => void;
  handleScaleUpdated: (scale: string[], specialCards: string[], votesCleared: boolean) => void;
  reset: () => void;
}

const initialState = {
  userId: null,
  userName: null,
  roomState: null,
  selectedVote: null,
  connectionStatus: "disconnected" as ConnectionStatus,
  stats: null as VoteStats | null,
  nonVoters: [] as string[],
  onAllVoted: null as (() => void) | null,
  onScaleUpdated: null as ((votesCleared: boolean) => void) | null,
};

export const useRoomStore = create<RoomStore>((set, get) => ({
  ...initialState,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setUserId: (id) => set({ userId: id }),
  setUserName: (name) => set({ userName: name }),
  setSelectedVote: (value) => set({ selectedVote: value }),
  setOnAllVoted: (cb) => set({ onAllVoted: cb }),
  setOnScaleUpdated: (cb) => set({ onScaleUpdated: cb }),

  handleRoomJoined: (state, userId) =>
    set((s) => {
      const user = state.users.find((u) => u.id === userId);
      return {
        roomState: state,
        userId,
        userName: user?.name ?? s.userName,
      };
    }),

  handleRoomState: (state) => set({ roomState: state }),

  handleUserJoined: (user) =>
    set((s) => {
      if (!s.roomState) return {};
      const exists = s.roomState.users.some((u) => u.id === user.id);
      if (exists) return {};
      return { roomState: { ...s.roomState, users: [...s.roomState.users, user] } };
    }),

  handleUserLeft: (userId) =>
    set((s) => {
      if (!s.roomState) return {};
      return {
        roomState: { ...s.roomState, users: s.roomState.users.filter((u) => u.id !== userId) },
      };
    }),

  handleUserRoleChanged: (userId, newRole) =>
    set((s) => {
      if (!s.roomState) return {};
      return {
        roomState: {
          ...s.roomState,
          users: s.roomState.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
        },
      };
    }),

  handleVoteProgress: (userId, _votesCount, _participantsCount) =>
    set((s) => {
      if (!s.roomState) return {};
      return {
        roomState: {
          ...s.roomState,
          users: s.roomState.users.map((u) => (u.id === userId ? { ...u, hasVoted: true } : u)),
        },
      };
    }),

  handleVoteRevealed: (votes, stats, nonVoters) =>
    set((s) => {
      if (!s.roomState) return {};
      return {
        roomState: {
          ...s.roomState,
          phase: "revealed",
          votes,
        },
        selectedVote: null,
        stats,
        nonVoters,
      };
    }),

  handleRoundStarted: (taskName) =>
    set((s) => {
      if (!s.roomState) return {};
      return {
        roomState: {
          ...s.roomState,
          phase: "voting",
          taskName,
          votes: {},
          users: s.roomState.users.map((u) =>
            u.role === "participant" ? { ...u, hasVoted: false } : u
          ),
        },
        selectedVote: null,
        stats: null,
        nonVoters: [],
      };
    }),

  handleRoundReset: () =>
    set((s) => {
      if (!s.roomState) return {};
      return {
        roomState: {
          ...s.roomState,
          phase: "waiting",
          votes: {},
          users: s.roomState.users.map((u) => ({ ...u, hasVoted: false })),
        },
        selectedVote: null,
        stats: null,
        nonVoters: [],
      };
    }),

  handleScaleUpdated: (scale, specialCards, votesCleared) => {
    set((s) => {
      if (!s.roomState) return {};
      return {
        roomState: {
          ...s.roomState,
          scale,
          specialCards,
          ...(votesCleared
            ? {
                votes: {},
                users: s.roomState.users.map((u) => ({ ...u, hasVoted: false })),
              }
            : {}),
        },
        ...(votesCleared ? { selectedVote: null } : {}),
      };
    });
    get().onScaleUpdated?.(votesCleared);
  },

  reset: () => set(initialState),
}));
