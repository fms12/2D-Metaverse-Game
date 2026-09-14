# API dependencies — injectable objects that FastAPI auto-provides to route handlers.
#
# This is the FastAPI equivalent of Express's middleware system:
#   Express:  router.post("/metadata", userMiddleware, async (req, res) => { ... })
#   FastAPI:  @router.post("/metadata")
#             async def update(user: CurrentUserDep, session: SessionDep): ...
#
# The key difference:
#   Express middleware: modifies req object (req.userId = decoded.userId)
#   FastAPI dependency: returns a value that's injected as a function parameter
#
# Express middleware/user.ts equivalent:
#   export const userMiddleware = (req, res, next) => {
#       const header = req.headers["authorization"];
#       const token = header?.split(" ")[1];
#       const decoded = jwt.verify(token, JWT_PASSWORD);
#       req.userId = decoded.userId;
#       next();
#   }

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.db import get_session
from app.core.security import decode_access_token
from app.crud.user import get_user_by_id
from app.models import Role, User

import jwt as pyjwt


# ── Database Session Dependency ──────────────────────────────────────
# This was already here. Each route gets a fresh DB session.

SessionDep = Annotated[Session, Depends(get_session)]


# ── Auth Dependencies ────────────────────────────────────────────────

# HTTPBearer extracts the token from "Authorization: Bearer <token>" header.
# auto_error=True means it returns 401 automatically if no token is provided.
security_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    session: SessionDep,
) -> User:
    """Decode JWT token and return the authenticated User.

    This is the FastAPI equivalent of Express's userMiddleware.
    If the token is invalid/expired, or the user doesn't exist, raises 401.

    Usage in routes:
        @router.post("/something")
        async def handler(user: CurrentUserDep):
            print(user.id)  # the authenticated user's ID
    """
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload["sub"]
    except (pyjwt.InvalidTokenError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# Annotated shortcut — use this as a type hint in any route that needs auth.
# Example: async def handler(user: CurrentUserDep): ...
CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_current_admin(user: CurrentUserDep) -> User:
    """Verify the authenticated user is an admin.

    This is the FastAPI equivalent of Express's adminMiddleware.
    Chains on top of get_current_user — first verifies the token,
    then checks the role.

    Express middleware/admin.ts equivalent:
        export const adminMiddlewa re = (req, res, next) => {
            // ... decode JWT ...
            if (decoded.role !== "Admin") {
                res.status(403).json({ message: "Unauthorized" })
                return
            }
            next()
        }
    """
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


# Annotated shortcut for admin-only routes.
# Example: async def handler(admin: AdminDep): ...
AdminDep = Annotated[User, Depends(get_current_admin)]
