# Auth schemas — request/response shapes for signup and signin.
#
# Express equivalent (types/index.ts):
#   SignupSchema = z.object({ username: z.string(), password: z.string(), type: z.enum(["user", "admin"]) })
#   SigninSchema = z.object({ username: z.string(), password: z.string() })
#
# In FastAPI, Pydantic does validation automatically — no .safeParse() needed.
# When you write: async def signup(payload: SignupRequest):
# FastAPI auto-validates and returns 422 if invalid.

from typing import Literal

from pydantic import BaseModel

from app.schemas.common import Password, Username


class SignupRequest(BaseModel):
    """POST /api/v1/signup — request body.

    Example JSON:
        {"username": "harkirat", "password": "123random", "type": "admin"}
    """
    username: Username
    password: Password
    type: Literal["user", "admin"] = "user"
    # Literal["user", "admin"] = Express's z.enum(["user", "admin"])
    # Default is "user" if not provided.


class SignupResponse(BaseModel):
    """POST /api/v1/signup — response body.

    Example JSON:
        {"userId": "abc-123-def"}
    """
    userId: str


class SigninRequest(BaseModel):
    """POST /api/v1/signin — request body.

    Example JSON:
        {"username": "harkirat", "password": "123random"}
    """
    username: Username
    password: str  # No min-length check on signin (just needs to match)


class SigninResponse(BaseModel):
    """POST /api/v1/signin — response body.

    Example JSON:
        {"token": "eyJhbGciOiJIUzI1NiIs..."}
    """
    token: str
