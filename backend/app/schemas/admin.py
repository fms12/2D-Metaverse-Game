# Admin schemas — request/response shapes for admin-only endpoints.
#
# Express equivalent (types/index.ts):
#   CreateElementSchema = z.object({ imageUrl: z.string(), width: z.number(), height: z.number(), static: z.boolean() })
#   UpdateElementSchema = z.object({ imageUrl: z.string() })
#   CreateAvatarSchema  = z.object({ imageUrl: z.string(), name: z.string() })
#   CreateMapSchema     = z.object({ thumbnail: z.string(), dimensions: z.string().regex(...), name: z.string(), defaultElements: z.array(...) })

from typing import Annotated

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.common import Dimension


class CreateElementRequest(BaseModel):
    """POST /api/v1/admin/element — request body.

    Example JSON:
        {"imageUrl": "https://...", "width": 1, "height": 1, "static": true}
    """
    imageUrl: str
    width: Annotated[int, Field(gt=0)]
    height: Annotated[int, Field(gt=0)]
    static: bool  # True = collision/can't walk through; False = can overlap


class CreateElementResponse(BaseModel):
    """POST /api/v1/admin/element — response body.

    Example JSON:
        {"id": "element-uuid-123"}
    """
    id: str


class UpdateElementRequest(BaseModel):
    """PUT /api/v1/admin/element/{elementId} — request body.
    Can only update imageUrl, not dimensions (per API spec).

    Example JSON:
        {"imageUrl": "https://new-image.com/chair.png"}
    """
    imageUrl: str


class CreateAvatarRequest(BaseModel):
    """POST /api/v1/admin/avatar — request body.

    Example JSON:
        {"imageUrl": "https://...", "name": "Timmy"}
    """
    imageUrl: str
    name: str


class CreateAvatarResponse(BaseModel):
    """POST /api/v1/admin/avatar — response body.

    Example JSON:
        {"avatarId": "avatar-uuid-123"}
    """
    avatarId: str


class DefaultElementSchema(BaseModel):
    """One pre-placed element inside a map template."""
    elementId: str
    x: Annotated[int, Field(ge=0)]
    y: Annotated[int, Field(ge=0)]


class CreateMapRequest(BaseModel):
    """POST /api/v1/admin/map — request body.

    Example JSON:
        {
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{"elementId": "chair1", "x": 20, "y": 20}]
        }
    """
    thumbnail: HttpUrl
    dimensions: Dimension
    name: Annotated[str, Field(min_length=1, max_length=100)]
    defaultElements: list[DefaultElementSchema]


class CreateMapResponse(BaseModel):
    """POST /api/v1/admin/map — response body.

    Example JSON:
        {"id": "map-uuid-123"}
    """
    id: str
