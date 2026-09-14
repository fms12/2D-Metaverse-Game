// =============================================================================
// GLOBAL STATE MANAGEMENT (src/state/useStore.ts)
// =============================================================================
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "user";
}

export interface Space {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail?: string;
  creatorId?: string;
  creatorUsername?: string;
  isPublic?: boolean;
}

export interface RemotePlayer {
  userId: string;
  x: number;
  y: number;
  username?: string;
}

export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
}

export interface StarterSpace {
  name: string;
  width: number;
  height: number;
  description?: string;
  icon?: string;
}

interface MetaverseStore {
  // Auth state
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;

  // Space state
  spaces: Space[];
  activeSpace: Space | null;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpace: (space: Space | null) => void;

  // Previously visited spaces
  visitedSpaces: Space[];
  addVisitedSpace: (space: Space) => void;

  // Pending starter space selected before sign up
  pendingSpace: StarterSpace | null;
  setPendingSpace: (space: StarterSpace | null) => void;

  // Character selection
  selectedCharacter: string;
  setSelectedCharacter: (character: string) => void;

  // Remote players
  remotePlayers: Record<string, RemotePlayer>;
  addOrUpdatePlayer: (player: RemotePlayer) => void;
  removePlayer: (userId: string) => void;
  clearPlayers: () => void;

  // Local player position
  playerX: number;
  playerY: number;
  setPlayerPosition: (x: number, y: number) => void;
}

export const useStore = create<MetaverseStore>()(
  persist(
    (set) => ({
      // Auth
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () =>
        set({
          token: null,
          user: null,
          activeSpace: null,
          remotePlayers: {},
          playerX: 0,
          playerY: 0,
        }),

      // Spaces
      spaces: [],
      activeSpace: null,
      setSpaces: (spaces) => set({ spaces }),
      setActiveSpace: (space) => set({ activeSpace: space }),

      // Previously visited spaces
      visitedSpaces: [],
      addVisitedSpace: (space) =>
        set((state) => {
          const filtered = (state.visitedSpaces || []).filter(
            (s) => s.id !== space.id,
          );
          return { visitedSpaces: [space, ...filtered].slice(0, 10) };
        }),

      // Pending starter space selection
      pendingSpace: null,
      setPendingSpace: (pendingSpace) => set({ pendingSpace }),

      // Character selection
      selectedCharacter: "male",
      setSelectedCharacter: (character) =>
        set({ selectedCharacter: character }),

      // Remote players
      remotePlayers: {},
      addOrUpdatePlayer: (player) =>
        set((state) => ({
          remotePlayers: {
            ...state.remotePlayers,
            [player.userId]: player,
          },
        })),
      removePlayer: (userId) =>
        set((state) => {
          const updated = { ...state.remotePlayers };
          delete updated[userId];
          return { remotePlayers: updated };
        }),
      clearPlayers: () => set({ remotePlayers: {} }),

      // Local player position
      playerX: 0,
      playerY: 0,
      setPlayerPosition: (x, y) => set({ playerX: x, playerY: y }),
    }),
    {
      name: "metaverse-store",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        selectedCharacter: state.selectedCharacter,
        pendingSpace: state.pendingSpace,
        visitedSpaces: state.visitedSpaces,
      }),
    },
  ),
);
