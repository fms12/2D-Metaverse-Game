import uuid
from enum import Enum
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


def generate_uuid():
    # Auto-generate a unique string id for every row.
    return str(uuid.uuid4())


class Role(str, Enum):
    # Fixed choices for a user's role. Keeping these as an Enum ensures we don't store random strings.
    ADMIN = "Admin"
    USER = "User"


class Avatar(SQLModel, table=True):
    # Avatar is optional profile/display data for users.
    # Defined before User so User can reference Avatar directly without mapper errors.
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    name: str | None = None
    image_url: str | None = None

    # Reverse side of User.avatar: many users can reference the same avatar.
    users: list["User"] = Relationship(back_populates="avatar")


class User(SQLModel, table=True):
    # table=True means this class becomes a real database table named "user".
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    username: str = Field(unique=True)
    password: str
    avatar_id: str | None = Field(default=None, foreign_key="avatar.id")
    role: Role = Field(default=Role.USER)
    is_active: bool = Field(default=True)

    # Links to the Avatar row via avatar_id.
    avatar: Optional[Avatar] = Relationship(back_populates="users")

    # One-to-many: a user can create many spaces.
    spaces: list["Space"] = Relationship(back_populates="creator")


class Element(SQLModel, table=True):
    # Element is a reusable item definition (chair, tree, desk, etc.).
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    width: int
    height: int
    static: bool
    image_url: str

    # All placements of this Element inside user-created spaces.
    spaces: list["SpaceElement"] = Relationship(back_populates="element")
    # All placements of this Element inside maps/templates.
    map_elements: list["MapElement"] = Relationship(back_populates="element")


class Space(SQLModel, table=True):
    # A space is a user-designed room/scene.
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    name: str
    width: int
    height: int
    thumbnail: str | None = None
    creator_id: str = Field(foreign_key="user.id")

    creator: User = Relationship(back_populates="spaces")
    elements: list["SpaceElement"] = Relationship(back_populates="space")


class SpaceElement(SQLModel, table=True):
    # Join table between Space and Element.
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    element_id: str = Field(foreign_key="element.id")
    space_id: str = Field(foreign_key="space.id")
    x: int
    y: int

    space: Space = Relationship(back_populates="elements")
    element: Element = Relationship(back_populates="spaces")


class Map(SQLModel, table=True):
    # Map is a reusable template/layout. It can contain many MapElement rows.
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    name: str
    width: int
    height: int
    thumbnail: str

    map_elements: list["MapElement"] = Relationship(back_populates="map")


class MapElement(SQLModel, table=True):
    # Join table between Map and Element.
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    element_id: str = Field(foreign_key="element.id")
    map_id: str = Field(foreign_key="map.id")
    x: int | None = None
    y: int | None = None

    map: Map = Relationship(back_populates="map_elements")
    element: Element = Relationship(back_populates="map_elements")