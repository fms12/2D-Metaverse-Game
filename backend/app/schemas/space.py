# Space schemas — request/response shapes for space and space-element endpoints.
#
# Express equivalent (types/index.ts):
#   CreateSpaceSchema = z.object({ name: z.string(), dimensions: z.string().regex(...), mapId: z.string().optional() })
#   AddElementSchema  = z.object({ elementId: z.string(), spaceId: z.string(), x: z.number(), y: z.number() })
#   DeleteElementSchema = z.object({ id: z.string() })

from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.common import Dimension


class CreateSpaceRequest(BaseModel):
    """POST /api/v1/space — request body.

    Example JSON:
        {"name": "Test", "dimensions": "100x200", "mapId": "map1"}
    """
    name: Annotated[str, Field(min_length=1, max_length=100)]
    dimensions: Dimension
    mapId: str | None = None  # Optional — create blank space if not provided


class CreateSpaceResponse(BaseModel):
    """POST /api/v1/space — response body.

    Example JSON:
        {"spaceId": "xlapwep1"}
    """
    spaceId: str


class SpaceListItem(BaseModel):
    """One item in the "get my spaces" response."""
    id: str
    name: str
    dimensions: str
    thumbnail: str | None = None
    creatorId: str | None = None
    creatorUsername: str | None = None
    isPublic: bool = False


class SpaceListResponse(BaseModel):
    """GET /api/v1/space/all — response body.

    Example JSON:
        {"spaces": [{"id": "1", "name": "Test", "dimensions": "100x200", "thumbnail": "..."}]}
    """
    spaces: list[SpaceListItem]


class SpaceElementInfo(BaseModel):
    """Element definition nested inside a space detail."""
    id: str
    imageUrl: str
    static: bool
    height: int
    width: int


class SpaceElementDetail(BaseModel):
    """One placed element inside a space (position + element info)."""
    id: str
    element: SpaceElementInfo
    x: int
    y: int


class SpaceDetailResponse(BaseModel):
    """GET /api/v1/space/{spaceId} — response body.

    Example JSON:
        {
            "id": "123",
            "name": "Central Metaverse HQ",
            "dimensions": "100x200",
            "isPublic": true,
            "creatorUsername": "Public",
            "elements": [{"id": "1", "element": {...}, "x": 20, "y": 20}]
        }
    """
    id: str | None = None
    name: str | None = None
    dimensions: str
    creatorId: str | None = None
    creatorUsername: str | None = None
    isPublic: bool = False
    elements: list[SpaceElementDetail]


class AddElementRequest(BaseModel):
    """POST /api/v1/space/element — request body.

    Example JSON:
        {"elementId": "chair1", "spaceId": "123", "x": 50, "y": 20}
    """
    elementId: str
    spaceId: str
    x: Annotated[int, Field(ge=0)]
    y: Annotated[int, Field(ge=0)]


class DeleteElementRequest(BaseModel):
    """DELETE /api/v1/space/element — request body.

    Example JSON:
        {"id": "1"}
    """
    id: str
