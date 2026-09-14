// =============================================================================
// SPACE API FUNCTIONS (src/api/space.ts)
// =============================================================================
// Functions for managing virtual Spaces (rooms) in our Metaverse.
//
// 🎓 FASTAPI ENDPOINTS WE CALL:
//   POST   /api/v1/space               — Create a new space (dimensions: "100x200")
//   GET    /api/v1/space/all           — List spaces created by user
//   GET    /api/v1/space/public        — List official public starter spaces
//   GET    /api/v1/space/community     — List all spaces across the metaverse
//   GET    /api/v1/space/:id           — Get space details (dimensions, creator, elements)
//   DELETE /api/v1/space/:id           — Delete a space (creator only)
// =============================================================================

import apiClient from "./client";
import type { Space } from "@/state/useStore";

export interface CreateSpacePayload {
  name: string;
  width: number;
  height: number;
  mapElementId?: string;
}

export interface SpaceDetail extends Space {
  elements: Array<{
    id: string;
    element: {
      id: string;
      imageUrl: string;
      width: number;
      height: number;
      static: boolean;
    };
    x: number;
    y: number;
  }>;
}

// =============================================================================
// HELPER: Parse "100x200" dimensions string into numeric width & height
// =============================================================================
function parseDimensions(dimStr?: string): { width: number; height: number } {
  if (!dimStr) return { width: 50, height: 50 };
  const parts = dimStr.split("x").map(Number);
  return {
    width: isNaN(parts[0]) ? 50 : parts[0],
    height: isNaN(parts[1]) ? 50 : parts[1],
  };
}

// =============================================================================
// BACKEND RESPONSE SCHEMAS
// =============================================================================
interface BackendSpaceItem {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
  creatorId?: string;
  creatorUsername?: string;
  isPublic?: boolean;
}

interface BackendSpaceDetail {
  id?: string;
  name?: string;
  dimensions: string;
  creatorId?: string;
  creatorUsername?: string;
  isPublic?: boolean;
  elements: Array<{
    id: string;
    element: {
      id: string;
      imageUrl: string;
      width: number;
      height: number;
      static: boolean;
    };
    x: number;
    y: number;
  }>;
}

// =============================================================================
// CREATE SPACE
// POST /api/v1/space
// =============================================================================
export async function createSpaceApi(
  payload: CreateSpacePayload,
): Promise<{ spaceId: string }> {
  const { data } = await apiClient.post<{ spaceId: string }>("/api/v1/space", {
    name: payload.name,
    dimensions: `${payload.width}x${payload.height}`,
    mapId: payload.mapElementId,
  });
  return data;
}

// =============================================================================
// FIND OR CREATE SPACE (For shared starter spaces)
// POST /api/v1/space/find-or-create
// =============================================================================
export async function findOrCreateSpaceApi(
  payload: CreateSpacePayload,
): Promise<{ spaceId: string }> {
  const { data } = await apiClient.post<{ spaceId: string }>(
    "/api/v1/space/find-or-create",
    {
      name: payload.name,
      dimensions: `${payload.width}x${payload.height}`,
      mapId: payload.mapElementId,
    },
  );
  return data;
}

// =============================================================================
// GET ALL SPACES (Created by current user)
// GET /api/v1/space/all
// =============================================================================
export async function getAllSpacesApi(): Promise<{ spaces: Space[] }> {
  const { data } = await apiClient.get<{ spaces: BackendSpaceItem[] }>(
    "/api/v1/space/all",
  );

  const spaces: Space[] = (data.spaces || []).map((s) => {
    const { width, height } = parseDimensions(s.dimensions);
    return {
      id: s.id,
      name: s.name,
      width,
      height,
      thumbnail: s.thumbnail,
      creatorId: s.creatorId,
      creatorUsername: s.creatorUsername,
      isPublic: s.isPublic ?? false,
    };
  });

  return { spaces };
}

// =============================================================================
// GET PUBLIC SPACES (Official Metaverse Starter Spaces)
// GET /api/v1/space/public
// =============================================================================
export async function getPublicSpacesApi(): Promise<{ spaces: Space[] }> {
  const { data } = await apiClient.get<{ spaces: BackendSpaceItem[] }>(
    "/api/v1/space/public",
  );

  const spaces: Space[] = (data.spaces || []).map((s) => {
    const { width, height } = parseDimensions(s.dimensions);
    return {
      id: s.id,
      name: s.name,
      width,
      height,
      thumbnail: s.thumbnail,
      creatorId: s.creatorId,
      creatorUsername: s.creatorUsername || "Public",
      isPublic: true,
    };
  });

  return { spaces };
}

// =============================================================================
// GET COMMUNITY SPACES (All spaces in the metaverse)
// GET /api/v1/space/community
// =============================================================================
export async function getCommunitySpacesApi(): Promise<{ spaces: Space[] }> {
  const { data } = await apiClient.get<{ spaces: BackendSpaceItem[] }>(
    "/api/v1/space/community",
  );

  const spaces: Space[] = (data.spaces || []).map((s) => {
    const { width, height } = parseDimensions(s.dimensions);
    return {
      id: s.id,
      name: s.name,
      width,
      height,
      thumbnail: s.thumbnail,
      creatorId: s.creatorId,
      creatorUsername: s.creatorUsername,
      isPublic: s.isPublic ?? false,
    };
  });

  return { spaces };
}

// =============================================================================
// GET SINGLE SPACE
// GET /api/v1/space/:spaceId
// =============================================================================
export async function getSpaceApi(spaceId: string): Promise<SpaceDetail> {
  const { data } = await apiClient.get<BackendSpaceDetail>(
    `/api/v1/space/${spaceId}`,
  );
  const { width, height } = parseDimensions(data.dimensions);

  return {
    id: data.id || spaceId,
    name: data.name || "Virtual Space",
    width,
    height,
    creatorId: data.creatorId,
    creatorUsername: data.creatorUsername,
    isPublic: data.isPublic ?? false,
    elements: data.elements || [],
  };
}

// =============================================================================
// DELETE SPACE
// DELETE /api/v1/space/:spaceId
// =============================================================================
export async function deleteSpaceApi(spaceId: string): Promise<void> {
  await apiClient.delete(`/api/v1/space/${spaceId}`);
}
