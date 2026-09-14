# ==============================================================================
# TESTS: User Metadata API Routes (/api/v1/user/metadata & /bulk)
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# -----------------------------
# 1. WHAT ARE PROTECTED ROUTES?
#    These routes require the user to be logged in.
#    To simulate this in tests, we pass the `headers=normal_user_headers` parameter:
#        client.post("/api/v1/user/metadata", headers=normal_user_headers, json=...)
#    FastAPI's `CurrentUserDep` extracts the token from this header, decodes it,
#    and validates the user.
#
# 2. TESTING WITHOUT HEADERS (Unauthenticated):
#    A crucial security test is making sure that if someone calls the API WITHOUT
#    the Authorization header, the server rejects them with HTTP 401 Unauthorized!
# ==============================================================================

import json
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Avatar, User
from tests.utils.user import create_random_user


# ------------------------------------------------------------------------------
# Test Suite 1: POST /api/v1/user/metadata (Update Avatar)
# ------------------------------------------------------------------------------

def test_update_user_metadata_success(
    client: TestClient, session: Session, normal_user_headers: dict[str, str], normal_user: User
) -> None:
    """TEST: Authenticated user successfully updates their avatar.

    LEARNING NOTE:
    1. First we create an Avatar record directly in the test database so there is
       a valid avatar to select.
    2. Then we call POST /api/v1/user/metadata with {"avatarId": avatar.id}.
    3. We check:
       - Status 200 OK
       - Message confirmed
       - The user's row in the database actually has user.avatar_id updated!
    """
    # 1. Setup: create a test avatar in the database
    avatar = Avatar(name="Cool Cat", image_url="https://example.com/cat.png")
    session.add(avatar)
    session.commit()
    session.refresh(avatar)

    # 2. Call API with auth headers
    response = client.post(
        "/api/v1/user/metadata",
        headers=normal_user_headers,
        json={"avatarId": avatar.id},
    )

    # 3. Verify API response
    assert response.status_code == 200
    assert response.json()["message"] == "Metadata updated"

    # 4. Verify Database state: check that the user in DB now references this avatar!
    session.refresh(normal_user)
    assert normal_user.avatar_id == avatar.id


def test_update_user_metadata_nonexistent_avatar_fails(
    client: TestClient, normal_user_headers: dict[str, str]
) -> None:
    """TEST (Sad Path): Selecting an avatar ID that doesn't exist in DB must return 400.

    LEARNING NOTE:
    The API should validate foreign keys: you cannot set your avatar to a random
    fake ID if that avatar doesn't exist in the system.
    """
    fake_avatar_id = "non-existent-avatar-uuid-12345"
    response = client.post(
        "/api/v1/user/metadata",
        headers=normal_user_headers,
        json={"avatarId": fake_avatar_id},
    )

    assert response.status_code == 400
    assert "Avatar not found" in response.json()["detail"]


def test_update_user_metadata_unauthenticated_fails(client: TestClient) -> None:
    """TEST (Security): Calling /user/metadata WITHOUT auth headers must return 401.

    LEARNING NOTE:
    Notice we don't pass `headers`. FastAPI's HTTPBearer dependency catches this
    and immediately returns 401 Unauthorized before any route code runs.
    """
    response = client.post(
        "/api/v1/user/metadata",
        json={"avatarId": "some-id"},
    )
    assert response.status_code == 401, "Missing token must be rejected with 401"


# ------------------------------------------------------------------------------
# Test Suite 2: GET /api/v1/user/metadata/bulk (Fetch multiple user avatars)
# ------------------------------------------------------------------------------

def test_get_user_metadata_bulk_success(
    client: TestClient, session: Session, normal_user_headers: dict[str, str]
) -> None:
    """TEST: Fetch avatar metadata for multiple users in a single request.

    LEARNING NOTE:
    1. We create 2 users in the test DB, one with an avatar and one without.
    2. We pass their IDs in the query string: `?ids=["id1","id2"]`.
    3. We verify that the returned list contains both users with their respective image URLs.
    """
    # 1. Setup test avatar & users
    avatar = Avatar(name="Doggo", image_url="https://example.com/dog.png")
    session.add(avatar)
    session.commit()
    session.refresh(avatar)

    user1, _ = create_random_user(session=session)
    user1.avatar_id = avatar.id
    session.add(user1)

    user2, _ = create_random_user(session=session)
    # user2 has no avatar
    session.commit()

    # 2. Call bulk endpoint with JSON array of user IDs
    ids_param = json.dumps([user1.id, user2.id])
    response = client.get(
        f"/api/v1/user/metadata/bulk?ids={ids_param}",
        headers=normal_user_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "avatars" in data
    avatars_list = data["avatars"]
    assert len(avatars_list) == 2

    # Verify user1 has the image and user2 has null
    user1_result = next((item for item in avatars_list if item["userId"] == user1.id), None)
    assert user1_result is not None
    assert user1_result["imageUrl"] == "https://example.com/dog.png"

    user2_result = next((item for item in avatars_list if item["userId"] == user2.id), None)
    assert user2_result is not None
    assert user2_result["imageUrl"] is None


def test_get_user_metadata_bulk_unauthenticated_fails(client: TestClient) -> None:
    """TEST (Security): Bulk metadata endpoint must reject unauthenticated requests."""
    response = client.get("/api/v1/user/metadata/bulk?ids=[]")
    assert response.status_code == 401

