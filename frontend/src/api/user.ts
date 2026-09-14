// =============================================================================
// USER & AVATAR API FUNCTIONS (src/api/user.ts)
// =============================================================================
// Functions for user profile and avatar management.
//
// 🎓 FASTAPI ENDPOINTS WE CALL:
//   GET  /api/v1/avatars             — List all available avatars (public, no auth needed)
//   POST /api/v1/user/metadata       — Update user's avatar selection
//   GET  /api/v1/user/metadata/bulk  — Get metadata for multiple users (bulk fetch)
// =============================================================================

import apiClient from "./client";

// =============================================================================
// AVATAR TYPES
// Matches FastAPI Avatar model
// =============================================================================
export interface AvatarOption {
  id: string;
  name: string;
  imageUrl: string;
}

// =============================================================================
// GET AVAILABLE AVATARS
// =============================================================================
// GET /api/v1/avatars
// This endpoint is PUBLIC — no authentication needed (hence no Bearer token needed).
// Returns all avatar sprites that users can choose from.
// Used in the Character Selection Dialog on the Dashboard.
// =============================================================================
export async function getAvatarsApi(): Promise<{ avatars: AvatarOption[] }> {
  const { data } = await apiClient.get<{ avatars: AvatarOption[] }>(
    "/api/v1/avatars",
  );
  return data;
}

// =============================================================================
// UPDATE USER METADATA (Avatar selection)
// =============================================================================
// POST /api/v1/user/metadata
// After the user picks a character from the CharacterDialog,
// we save their choice to the backend so it persists across sessions.
// =============================================================================
export async function updateUserMetadataApi(avatarId: string): Promise<void> {
  await apiClient.post("/api/v1/user/metadata", { avatarId });
}

// =============================================================================
// GET BULK USER METADATA
// =============================================================================
// GET /api/v1/user/metadata/bulk?ids=id1&ids=id2&ids=id3
// Used to fetch display names and avatars of multiple players at once.
// (e.g., when you join a room with 5 other people already in it)
// =============================================================================
export async function getBulkUserMetadataApi(
  userIds: string[],
): Promise<{ avatarImageUrl: string; userId: string }[]> {
  // Build query params: ?ids=a&ids=b&ids=c
  const params = new URLSearchParams();
  userIds.forEach((id) => params.append("ids", id));

  const { data } = await apiClient.get<
    { avatarImageUrl: string; userId: string }[]
  >(`/api/v1/user/metadata/bulk?${params.toString()}`);
  return data;
}
