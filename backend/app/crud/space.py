# Space CRUD — database operations for Space and SpaceElement models.
#
# Express equivalent: the Prisma calls inside routes/v1/space.ts
# For example:
#   client.space.create({ data: { name, width, height, creatorId } })
#   client.space.findMany({ where: { creatorId: userId } })
#   client.spaceElements.create({ data: { elementId, spaceId, x, y } })

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Element, Map, MapElement, Space, SpaceElement


def create_space(
    session: Session, user_id: str, name: str, dimensions: str, map_id: str | None
) -> Space:
    """Create a new space, optionally copying elements from a map template.

    Equivalent to Express's space.ts POST "/" handler:
    - If no mapId: create empty space with given dimensions
    - If mapId provided: create space with map's dimensions and copy all map elements

    Express code:
        if (!parsedData.data.mapId) {
            const space = await client.space.create({ data: { name, width, height, creatorId } })
        } else {
            const map = await client.map.findFirst({ where: { id: mapId } })
            // copy map elements into space
        }
    """
    width = int(dimensions.split("x")[0])
    height = int(dimensions.split("x")[1])

    if not map_id:
        # Create blank space
        space = Space(name=name, width=width, height=height, creator_id=user_id)
        session.add(space)
        session.commit()
        session.refresh(space)
        return space

    # Create space from map template
    map_obj = session.get(Map, map_id)
    if not map_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Map not found",
        )

    # Use map's dimensions (override whatever the user sent)
    space = Space(
        name=name,
        width=map_obj.width,
        height=map_obj.height,
        thumbnail=map_obj.thumbnail,
        creator_id=user_id,
    )
    session.add(space)
    session.flush()  # Get space.id without committing yet

    # Copy all elements from the map template into the new space
    map_elements = session.exec(
        select(MapElement).where(MapElement.map_id == map_id)
    ).all()
    for me in map_elements:
        space_element = SpaceElement(
            element_id=me.element_id,
            space_id=space.id,
            x=me.x or 0,
            y=me.y or 0,
        )
        session.add(space_element)

    session.commit()
    session.refresh(space)
    return space


def delete_space(session: Session, space_id: str, user_id: str) -> None:
    """Delete a space. Only the creator can delete it.

    Equivalent to Express's:
        const space = await client.space.findUnique({ where: { id: spaceId } })
        if (space?.creatorId !== userId) { return 403 }
        await client.space.delete({ where: { id: spaceId } })
    """
    space = session.get(Space, space_id)
    if not space:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space not found",
        )
    if space.name in {
        "Central Metaverse HQ",
        "Cyberpunk Coffee Lounge",
        "Town Hall Auditorium",
        "Arcade & Recreation Hub",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Official public spaces cannot be deleted",
        )
    if space.creator_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the creator of this space",
        )

    # Delete all space elements first (manual cascade)
    space_elements = session.exec(
        select(SpaceElement).where(SpaceElement.space_id == space_id)
    ).all()
    for se in space_elements:
        session.delete(se)

    session.delete(space)
    session.commit()


def get_user_spaces(session: Session, user_id: str) -> list[Space]:
    """Get all spaces created by a user.

    Equivalent to Express's:
        client.space.findMany({ where: { creatorId: userId } })
    """
    return list(
        session.exec(select(Space).where(Space.creator_id == user_id)).all()
    )


def get_all_spaces_list(session: Session, limit: int = 50) -> list[Space]:
    """Get all spaces across the entire metaverse so players can discover and join each other."""
    return list(session.exec(select(Space).limit(limit)).all())


def find_space_by_name(session: Session, name: str) -> Space | None:
    """Find an existing space by name (for shared starter spaces)."""
    return session.exec(select(Space).where(Space.name == name)).first()


def get_space_detail(session: Session, space_id: str) -> Space:
    """Get a space with all its elements.

    Equivalent to Express's:
        client.space.findUnique({
            where: { id: spaceId },
            include: { elements: { include: { element: true } } }
        })
    """
    space = session.get(Space, space_id)
    if not space:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space not found",
        )
    return space


def add_element_to_space(
    session: Session, element_id: str, space_id: str, x: int, y: int
) -> SpaceElement:
    """Place an element inside a space at position (x, y).

    Equivalent to Express's:
        client.spaceElements.create({ data: { elementId, spaceId, x, y } })
    """
    # Verify space exists
    space = session.get(Space, space_id)
    if not space:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space not found",
        )

    # Verify element exists
    element = session.get(Element, element_id)
    if not element:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Element not found",
        )

    # Verify position is within space dimensions
    if x < 0 or x >= space.width or y < 0 or y >= space.height:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Position ({x}, {y}) is outside space dimensions ({space.width}x{space.height})",
        )

    space_element = SpaceElement(
        element_id=element_id,
        space_id=space_id,
        x=x,
        y=y,
    )
    session.add(space_element)
    session.commit()
    session.refresh(space_element)
    return space_element


def delete_space_element(session: Session, space_element_id: str) -> None:
    """Remove a placed element from a space.

    Equivalent to Express's:
        client.spaceElements.delete({ where: { id } })
    """
    space_element = session.get(SpaceElement, space_element_id)
    if not space_element:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space element not found",
        )
    session.delete(space_element)
    session.commit()
