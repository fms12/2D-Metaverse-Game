# ==============================================================================
# TEST UTILITIES: User & Auth Helpers
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# Many API tests require an authenticated user (e.g. creating a space, placing elements).
# If every test had to manually run a full signup and signin process first, the test
# files would become hundreds of lines long and repetitive.
#
# This file provides quick helper functions to:
# 1. Create a user directly in the database session
# 2. Generate a valid JWT token / auth header for that user
# ==============================================================================

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import create_access_token
from app.crud.user import create_user
from app.models import Role, User
from tests.utils.utils import get_auth_header, random_lower_string


def create_random_user(
    session: Session, role: str = "user", password: str = "password123"
) -> tuple[User, str]:
    """Create a random user in the test database and return the User object and plain password.

    WHY WE USE THIS:
    Instead of calling the HTTP signup endpoint in every test, this helper
    creates a user directly in the database using our CRUD layer. It is faster
    and provides the user object immediately.

    Returns:
        (user, plain_password): A tuple containing the created User and their password.
    """
    username = f"user_{random_lower_string(8)}"
    user = create_user(
        session=session,
        username=username,
        password=password,
        role=role,
    )
    return user, password


def get_user_auth_headers(user: User) -> dict[str, str]:
    """Create a valid JWT Bearer header for a given user.

    WHY WE USE THIS:
    In tests, we can generate a valid JWT directly using our `create_access_token`
    function without needing to make a network call to `/signin`.
    This makes tests much faster and keeps each test focused on what it is testing.

    Example:
        headers = get_user_auth_headers(test_user)
        client.get("/api/v1/space/all", headers=headers)
    """
    token = create_access_token(user_id=user.id, role=user.role.value)
    return get_auth_header(token)


def get_token_via_signin(
    client: TestClient, username: str, password: str
) -> dict[str, str]:
    """Sign in through the actual HTTP API endpoint and return auth headers.

    WHY WE USE THIS:
    When we want to test that the real HTTP login endpoint works from the client's
    perspective, we use this function to submit JSON to `/api/v1/signin` and
    extract the token from the response.
    """
    response = client.post(
        "/api/v1/signin",
        json={"username": username, "password": password},
    )
    data = response.json()
    return get_auth_header(data["token"])

