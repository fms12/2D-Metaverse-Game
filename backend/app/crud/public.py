# Public CRUD — database queries for publicly-accessible data.
#
# These are simple "list all" queries used by the GET /avatars and GET /elements endpoints.

from sqlmodel import Session, select

from app.models import Avatar, Element


def get_all_avatars(session: Session) -> list[Avatar]:
    """Get all available avatars.

    Equivalent to Express's:
        client.avatar.findMany()
    """
    return list(session.exec(select(Avatar)).all())


def get_all_elements(session: Session) -> list[Element]:
    """Get all available elements.

    Equivalent to Express's:
        client.element.findMany()
    """
    return list(session.exec(select(Element)).all())
