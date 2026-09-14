# Admin CRUD — database operations for admin-only endpoints.
#
# Express equivalent: the Prisma calls inside routes/v1/admin.ts
# For example:
#   client.element.create({ data: { width, height, imageUrl, static } })
#   client.avatar.create({ data: { imageUrl, name } })
#   client.map.create({ data: { name, width, height, thumbnail, mapElements: { create: [...] } } })

from sqlmodel import Session

from app.models import Avatar, Element, Map, MapElement


def create_element(
    session: Session, image_url: str, width: int, height: int, static: bool
) -> Element:
    """Create a new reusable element (chair, table, tree, etc.).

    Equivalent to Express's:
        client.element.create({ data: { width, height, imageUrl, static } })
    """
    element = Element(
        image_url=image_url,
        width=width,
        height=height,
        static=static,
    )
    session.add(element)
    session.commit()
    session.refresh(element)
    return element


def update_element(session: Session, element_id: str, image_url: str) -> Element:
    """Update an element's image URL (can't change dimensions per spec).

    Equivalent to Express's:
        client.element.update({ where: { id }, data: { imageUrl } })
    """
    from fastapi import HTTPException, status

    element = session.get(Element, element_id)
    if not element:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Element not found",
        )

    element.image_url = image_url
    session.add(element)
    session.commit()
    session.refresh(element)
    return element


def create_avatar(session: Session, image_url: str, name: str) -> Avatar:
    """Create a new avatar.

    Equivalent to Express's:
        client.avatar.create({ data: { imageUrl, name } })
    """
    avatar = Avatar(
        image_url=image_url,
        name=name,
    )
    session.add(avatar)
    session.commit()
    session.refresh(avatar)
    return avatar


def create_map(
    session: Session,
    name: str,
    dimensions: str,
    thumbnail: str,
    default_elements: list[dict],
) -> Map:
    """Create a new map template with pre-placed elements.

    Equivalent to Express's:
        client.map.create({
            data: {
                name, width, height, thumbnail,
                mapElements: { create: defaultElements.map(e => ({ elementId, x, y })) }
            }
        })
    """
    width = int(dimensions.split("x")[0])
    height = int(dimensions.split("x")[1])

    map_obj = Map(
        name=name,
        width=width,
        height=height,
        thumbnail=thumbnail,
    )
    session.add(map_obj)
    session.flush()  # Get map_obj.id without committing yet

    # Create all default map elements
    for elem in default_elements:
        map_element = MapElement(
            element_id=elem["elementId"],
            map_id=map_obj.id,
            x=elem["x"],
            y=elem["y"],
        )
        session.add(map_element)

    session.commit()
    session.refresh(map_obj)
    return map_obj
