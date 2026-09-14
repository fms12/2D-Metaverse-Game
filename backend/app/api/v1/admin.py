# Admin routes — admin-only endpoints (admin auth required).
#
# Express equivalent: routes/v1/admin.ts
# The Express version uses: adminRouter.use(adminMiddleware)
# which applies admin auth to ALL routes in this file.
#
# FastAPI equivalent: every route uses AdminDep as a parameter.
# AdminDep first checks the JWT (via CurrentUserDep), then verifies role === Admin.

from fastapi import APIRouter

from app.api.deps import AdminDep, SessionDep
from app.crud.admin import create_avatar, create_element, create_map, update_element
from app.schemas.admin import (
    CreateAvatarRequest,
    CreateAvatarResponse,
    CreateElementRequest,
    CreateElementResponse,
    CreateMapRequest,
    CreateMapResponse,
    UpdateElementRequest,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/element", response_model=CreateElementResponse)
async def admin_create_element(
    payload: CreateElementRequest,
    admin: AdminDep,
    session: SessionDep,
):
    """Create a new reusable element (admin only).

    Express equivalent (routes/v1/admin.ts):
        adminRouter.post("/element", async (req, res) => {
            const parsedData = CreateElementSchema.safeParse(req.body)
            const element = await client.element.create({
                data: { width, height, imageUrl, static }
            })
            res.json({ id: element.id })
        })
    """
    element = create_element(
        session, payload.imageUrl, payload.width, payload.height, payload.static
    )
    return CreateElementResponse(id=element.id)


@router.put("/element/{elementId}")
async def admin_update_element(
    elementId: str,
    payload: UpdateElementRequest,
    admin: AdminDep,
    session: SessionDep,
):
    """Update an element's image URL (admin only).
    Cannot update dimensions once created (per API spec).

    Express equivalent:
        adminRouter.put("/element/:elementId", async (req, res) => {
            await client.element.update({ where: { id }, data: { imageUrl } })
        })
    """
    update_element(session, elementId, payload.imageUrl)
    return {"message": "Element updated"}


@router.post("/avatar", response_model=CreateAvatarResponse)
async def admin_create_avatar(
    payload: CreateAvatarRequest,
    admin: AdminDep,
    session: SessionDep,
):
    """Create a new avatar (admin only).

    Express equivalent:
        adminRouter.post("/avatar", async (req, res) => {
            const avatar = await client.avatar.create({ data: { imageUrl, name } })
            res.json({ avatarId: avatar.id })
        })
    """
    avatar = create_avatar(session, payload.imageUrl, payload.name)
    return CreateAvatarResponse(avatarId=avatar.id)


@router.post("/map", response_model=CreateMapResponse)
async def admin_create_map(
    payload: CreateMapRequest,
    admin: AdminDep,
    session: SessionDep,
):
    """Create a new map template with default elements (admin only).

    Express equivalent:
        adminRouter.post("/map", async (req, res) => {
            const map = await client.map.create({
                data: {
                    name, width, height, thumbnail,
                    mapElements: { create: defaultElements.map(...) }
                }
            })
            res.json({ id: map.id })
        })
    """
    # Convert HttpUrl to string for DB storage
    thumbnail_str = str(payload.thumbnail)
    default_elems = [elem.model_dump() for elem in payload.defaultElements]

    map_obj = create_map(
        session, payload.name, payload.dimensions, thumbnail_str, default_elems
    )
    return CreateMapResponse(id=map_obj.id)