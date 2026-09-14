# User routes — metadata endpoints (auth required).
#
# Express equivalent: routes/v1/user.ts
# All routes use userMiddleware → FastAPI equivalent is CurrentUserDep.
#
# PATTERN TO LEARN:
# Notice how thin these route handlers are — each one is just:
#   1. Accept input (type-hinted parameters = auto-validation)
#   2. Call a CRUD function
#   3. Return a response schema
# No SQL queries, no business logic, no password hashing.

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.crud.user import get_users_metadata_bulk, update_user_avatar
from app.schemas.user import BulkMetadataItem, BulkMetadataResponse, UpdateMetadataRequest

router = APIRouter(prefix="/user", tags=["User"])


@router.post("/metadata")
async def update_metadata(
    payload: UpdateMetadataRequest,
    user: CurrentUserDep,
    session: SessionDep,
):
    """Update the current user's avatar.

    Express equivalent (routes/v1/user.ts):
        userRouter.post("/metadata", userMiddleware, async (req, res) => {
            const parsedData = UpdateMetadataSchema.safeParse(req.body)
            await client.user.update({
                where: { id: req.userId },
                data: { avatarId: parsedData.data.avatarId }
            })
            res.json({ message: "Metadata updated" })
        })

    FastAPI version:
    - userMiddleware → CurrentUserDep (injected as `user` parameter)
    - UpdateMetadataSchema.safeParse() → UpdateMetadataRequest type hint (auto-validated)
    - Prisma update → crud.update_user_avatar()
    """
    update_user_avatar(session, user.id, payload.avatarId)
    return {"message": "Metadata updated"}


@router.get("/metadata/bulk", response_model=BulkMetadataResponse)
async def get_metadata_bulk(
    user: CurrentUserDep,
    session: SessionDep,
    ids: str = Query(..., description='JSON array of user IDs, e.g. [1, 3, 55]'),
):
    """Get avatar metadata for multiple users.

    Express equivalent (routes/v1/user.ts):
        userRouter.get("/metadata/bulk", async (req, res) => {
            const userIdString = (req.query.ids as string).slice(1, -1)
            const userIds = userIdString.split(",")
            const metadata = await client.user.findMany({
                where: { id: { in: userIds } },
                select: { avatar: true, id: true }
            })
            res.json({ avatars: metadata.map(m => ({ userId: m.id, imageUrl: m.avatar?.imageUrl })) })
        })

    The query param comes as: ?ids=[1,3,55]
    We parse it the same way Express does — strip brackets and split by comma.
    """
    import json
    try:
        user_ids = json.loads(ids)
        # Ensure all IDs are strings
        user_ids = [str(uid) for uid in user_ids]
    except (json.JSONDecodeError, TypeError):
        # Fallback: try the Express-style parsing (strip brackets, split by comma)
        cleaned = ids.strip("[]")
        user_ids = [uid.strip().strip('"').strip("'") for uid in cleaned.split(",") if uid.strip()]

    avatars_data = get_users_metadata_bulk(session, user_ids)
    return BulkMetadataResponse(
        avatars=[BulkMetadataItem(**a) for a in avatars_data]
    )