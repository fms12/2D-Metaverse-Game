# Space routes — CRUD for spaces and space elements (auth required).
#
# Express equivalent: routes/v1/space.ts
# All routes use userMiddleware → FastAPI equivalent is CurrentUserDep.
#
# This file demonstrates a common FastAPI pattern:
#   - Multiple related endpoints on one router with a shared prefix
#   - Path parameters (spaceId) for resource-specific operations
#   - Body parameters for creation/deletion

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.crud.space import (
    add_element_to_space,
    create_space,
    delete_space,
    delete_space_element,
    find_space_by_name,
    get_all_spaces_list,
    get_space_detail,
    get_user_spaces,
)
from app.schemas.space import (
    AddElementRequest,
    CreateSpaceRequest,
    CreateSpaceResponse,
    DeleteElementRequest,
    SpaceDetailResponse,
    SpaceElementDetail,
    SpaceElementInfo,
    SpaceListItem,
    SpaceListResponse,
)

router = APIRouter(prefix="/space", tags=["Space"])


@router.post("/", response_model=CreateSpaceResponse)
async def create_new_space(
    payload: CreateSpaceRequest,
    user: CurrentUserDep,
    session: SessionDep,
):
    """Create a new space (optionally from a map template).

    Express equivalent (routes/v1/space.ts):
        spaceRouter.post("/", userMiddleware, async (req, res) => {
            const parsedData = CreateSpaceSchema.safeParse(req.body)
            if (!parsedData.data.mapId) {
                const space = await client.space.create(...)
            } else {
                const map = await client.map.findFirst(...)
                // ... copy elements
            }
            res.json({ spaceId: space.id })
        })
    """
    space = create_space(
        session, user.id, payload.name, payload.dimensions, payload.mapId
    )
    return CreateSpaceResponse(spaceId=space.id)


@router.delete("/element")
async def remove_element(
    payload: DeleteElementRequest,
    user: CurrentUserDep,
    session: SessionDep,
):
    """Remove a placed element from a space.

    Express equivalent:
        spaceRouter.delete("/element", userMiddleware, async (req, res) => {
            await client.spaceElements.delete({ where: { id: req.body.id } })
        })
    """
    delete_space_element(session, payload.id)
    return {"message": "Element deleted"}


@router.delete("/{spaceId}")
async def remove_space(
    spaceId: str,
    user: CurrentUserDep,
    session: SessionDep,
):
    """Delete a space (only the creator can delete).

    Express equivalent:
        spaceRouter.delete("/:spaceId", userMiddleware, async (req, res) => {
            const space = await client.space.findUnique(...)
            if (space?.creatorId !== req.userId) { res.status(403)... }
            await client.space.delete(...)
        })
    """
    delete_space(session, spaceId, user.id)
    return {"message": "Space deleted"}


# 4 Official Public Metaverse Starter Spaces
PUBLIC_SPACES_CONFIG = [
    {"name": "Central Metaverse HQ", "dimensions": "80x60"},
    {"name": "Cyberpunk Coffee Lounge", "dimensions": "60x45"},
    {"name": "Town Hall Auditorium", "dimensions": "100x70"},
    {"name": "Arcade & Recreation Hub", "dimensions": "70x50"},
]
PUBLIC_SPACE_NAMES = {cfg["name"] for cfg in PUBLIC_SPACES_CONFIG}


@router.get("/all", response_model=SpaceListResponse)
async def get_all_spaces(
    user: CurrentUserDep,
    session: SessionDep,
):
    """Get all spaces created by the current user (excluding public starter spaces).

    Express equivalent:
        spaceRouter.get("/all", userMiddleware, async (req, res) => {
            const spaces = await client.space.findMany({ where: { creatorId: req.userId! } })
            res.json({ spaces: spaces.map(s => ({ id: s.id, name: s.name, ... })) })
        })
    """
    spaces = get_user_spaces(session, user.id)
    # Filter out public starter spaces so they don't get wrongly attributed to this user as private spaces
    user_spaces = [s for s in spaces if s.name not in PUBLIC_SPACE_NAMES]
    return SpaceListResponse(
        spaces=[
            SpaceListItem(
                id=s.id,
                name=s.name,
                dimensions=f"{s.width}x{s.height}",
                thumbnail=s.thumbnail,
                creatorId=s.creator_id,
                creatorUsername=user.username,
                isPublic=False,
            )
            for s in user_spaces
        ]
    )


@router.get("/public", response_model=SpaceListResponse)
async def get_public_spaces(
    user: CurrentUserDep,
    session: SessionDep,
):
    """Get all official public starter spaces. Ensures all 4 official spaces exist in DB."""
    public_items: list[SpaceListItem] = []
    for cfg in PUBLIC_SPACES_CONFIG:
        existing = find_space_by_name(session, cfg["name"])
        if not existing:
            existing = create_space(
                session, user.id, cfg["name"], cfg["dimensions"], None
            )
        public_items.append(
            SpaceListItem(
                id=existing.id,
                name=existing.name,
                dimensions=f"{existing.width}x{existing.height}",
                thumbnail=existing.thumbnail,
                creatorId=None,
                creatorUsername="Public",
                isPublic=True,
            )
        )
    return SpaceListResponse(spaces=public_items)


@router.post("/find-or-create", response_model=CreateSpaceResponse)
async def find_or_create_space(
    payload: CreateSpaceRequest,
    user: CurrentUserDep,
    session: SessionDep,
):
    """Find an existing space by name (e.g. starter spaces) or create it if not found."""
    existing = find_space_by_name(session, payload.name)
    if existing:
        return CreateSpaceResponse(spaceId=existing.id)
    space = create_space(
        session, user.id, payload.name, payload.dimensions, payload.mapId
    )
    return CreateSpaceResponse(spaceId=space.id)


@router.get("/community", response_model=SpaceListResponse)
async def get_community_spaces(
    user: CurrentUserDep,
    session: SessionDep,
):
    """Get all spaces across the entire metaverse so players can discover and join each other."""
    spaces = get_all_spaces_list(session)
    return SpaceListResponse(
        spaces=[
            SpaceListItem(
                id=s.id,
                name=s.name,
                dimensions=f"{s.width}x{s.height}",
                thumbnail=s.thumbnail,
                creatorId=None if s.name in PUBLIC_SPACE_NAMES else s.creator_id,
                creatorUsername="Public" if s.name in PUBLIC_SPACE_NAMES else (s.creator.username if s.creator else None),
                isPublic=(s.name in PUBLIC_SPACE_NAMES),
            )
            for s in spaces
        ]
    )


@router.get("/{spaceId}", response_model=SpaceDetailResponse)
async def get_space(
    spaceId: str,
    user: CurrentUserDep,
    session: SessionDep,
):
    """Get a space with all its elements.

    Express equivalent:
        spaceRouter.get("/:spaceId", async (req, res) => {
            const space = await client.space.findUnique({
                where: { id: req.params.spaceId },
                include: { elements: { include: { element: true } } }
            })
            res.json({ dimensions: `${space.width}x${space.height}`, elements: ... })
        })
    """
    space = get_space_detail(session, spaceId)
    is_public = space.name in PUBLIC_SPACE_NAMES
    return SpaceDetailResponse(
        id=space.id,
        name=space.name,
        dimensions=f"{space.width}x{space.height}",
        creatorId=None if is_public else space.creator_id,
        creatorUsername="Public" if is_public else (space.creator.username if space.creator else None),
        isPublic=is_public,
        elements=[
            SpaceElementDetail(
                id=se.id,
                element=SpaceElementInfo(
                    id=se.element.id,
                    imageUrl=se.element.image_url,
                    static=se.element.static,
                    height=se.element.height,
                    width=se.element.width,
                ),
                x=se.x,
                y=se.y,
            )
            for se in space.elements
        ],
    )


@router.post("/element")
async def add_element(
    payload: AddElementRequest,
    user: CurrentUserDep,
    session: SessionDep,
):
    """Place an element inside a space.

    Express equivalent:
        spaceRouter.post("/element", userMiddleware, async (req, res) => {
            const parsedData = AddElementSchema.safeParse(req.body)
            await client.spaceElements.create({ data: { ... } })
        })
    """
    add_element_to_space(session, payload.elementId, payload.spaceId, payload.x, payload.y)
    return {"message": "Element added"}
