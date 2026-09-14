# User schemas — request/response shapes for user metadata endpoints.
#
# Express equivalent (types/index.ts):
#   UpdateMetadataSchema = z.object({ avatarId: z.string() })

from typing import Annotated

from pydantic import BaseModel, StringConstraints


class UpdateMetadataRequest(BaseModel):
    """POST /api/v1/user/metadata — request body.

    Example JSON:
        {"avatarId": "avatar-uuid-123"}
    """
    avatarId: Annotated[str, StringConstraints(min_length=1)]


class BulkMetadataItem(BaseModel):
    """One item in the bulk metadata response."""
    userId: str
    imageUrl: str | None = None


class BulkMetadataResponse(BaseModel):
    """GET /api/v1/user/metadata/bulk?ids=[1,3,55] — response body.

    Example JSON:
        {
            "avatars": [
                {"userId": "1", "imageUrl": "https://image.com/cat.png"},
                {"userId": "3", "imageUrl": null}
            ]
        }
    """
    avatars: list[BulkMetadataItem]
