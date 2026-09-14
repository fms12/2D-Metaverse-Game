# Public routes — endpoints that list available avatars and elements.
#
# These replace the old utils.py file.
# Although the API spec says these need auth (Bearer token),
# they're "public" in the sense that any authenticated user can access them
# (not admin-only).

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.crud.public import get_all_avatars, get_all_elements

router = APIRouter(tags=["Public"])


@router.get("/avatars")
async def list_avatars(
    user: CurrentUserDep,
    session: SessionDep,
):
    """Get all available avatars.

    Express equivalent (inside routes/v1/index.ts):
        router.get("/avatars", async (req, res) => {
            const avatars = await client.avatar.findMany()
            res.json({ avatars: avatars.map(x => ({ id: x.id, imageUrl: x.imageUrl, name: x.name })) })
        })
    """
    avatars = get_all_avatars(session)
    return {
        "avatars": [
            {"id": a.id, "imageUrl": a.image_url, "name": a.name}
            for a in avatars
        ]
    }


@router.get("/elements")
async def list_elements(
    user: CurrentUserDep,
    session: SessionDep,
):
    """Get all available elements.

    Express equivalent (inside routes/v1/index.ts):
        router.get("/elements", async (req, res) => {
            const elements = await client.element.findMany()
            res.json({ elements: elements.map(x => ({
                id: x.id, imageUrl: x.imageUrl, width: x.width, height: x.height, static: x.static
            })) })
        })
    """
    elements = get_all_elements(session)
    return {
        "elements": [
            {
                "id": e.id,
                "imageUrl": e.image_url,
                "width": e.width,
                "height": e.height,
                "static": e.static,
            }
            for e in elements
        ]
    }
