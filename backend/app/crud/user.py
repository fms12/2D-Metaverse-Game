# User CRUD — database operations for User model.
#
# Express equivalent: the Prisma calls inside routes/v1/index.ts (signup) and routes/v1/user.ts
# For example:
#   client.user.create({ data: { username, password: hashedPassword, role } })
#   client.user.update({ where: { id: userId }, data: { avatarId } })
#
# Here we wrap those in reusable functions.

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.security import hash_password
from app.models import Avatar, Role, User


def create_user(session: Session, username: str, password: str, role: str) -> User:
    """Create a new user with hashed password.

    Equivalent to Express's:
        client.user.create({ data: { username, password: hashedPassword, role: type === "admin" ? "Admin" : "User" } })

    Raises HTTPException 400 if username already exists.
    """
    # Check if username already taken
    existing = session.exec(select(User).where(User.username == username)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists",
        )

    # Map "admin"/"user" string to Role enum
    user_role = Role.ADMIN if role == "admin" else Role.USER

    user = User(
        username=username,
        password=hash_password(password),
        role=user_role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_user_by_username(session: Session, username: str) -> User | None:
    """Find a user by username. Returns None if not found.

    Equivalent to Express's:
        client.user.findUnique({ where: { username } })
    """
    return session.exec(select(User).where(User.username == username)).first()


def get_user_by_id(session: Session, user_id: str) -> User | None:
    """Find a user by ID. Returns None if not found.

    Used by the auth dependency to look up the user from the JWT's "sub" claim.
    """
    return session.get(User, user_id)


def update_user_avatar(session: Session, user_id: str, avatar_id: str) -> None:
    """Update a user's avatar.

    Equivalent to Express's:
        client.user.update({ where: { id: userId }, data: { avatarId } })

    Raises HTTPException 400 if avatar doesn't exist.
    """
    # Verify avatar exists
    avatar = session.get(Avatar, avatar_id)
    if not avatar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar not found",
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )

    user.avatar_id = avatar_id
    session.add(user)
    session.commit()


def get_users_metadata_bulk(
    session: Session, user_ids: list[str]
) -> list[dict]:
    """Get avatar metadata for multiple users.

    Equivalent to Express's:
        client.user.findMany({
            where: { id: { in: ids } },
            select: { avatar: true, id: true }
        })

    Returns list of dicts with userId and imageUrl.
    """
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()  # type: ignore[attr-defined]
    result = []
    for user in users:
        image_url = user.avatar.image_url if user.avatar else None
        result.append({"userId": user.id, "imageUrl": image_url})
    return result
