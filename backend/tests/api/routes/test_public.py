# ==============================================================================
# TESTS: Public Catalog API Routes (/api/v1/avatars & /api/v1/elements)
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# -----------------------------
# These endpoints allow any authenticated player in the game to see the catalog of
# available avatars and elements (chairs, desks, walls) that they can choose from.
#
# We test:
# 1. Any logged-in user can fetch the list.
# 2. Database records are properly returned in the JSON shape defined in the API spec.
# 3. Unauthenticated requests are rejected with 401 Unauthorized.
# ==============================================================================

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Avatar, Element


# ------------------------------------------------------------------------------
# Test Suite 1: GET /api/v1/avatars
# ------------------------------------------------------------------------------

def test_list_avatars_authenticated_success(
    client: TestClient, session: Session, normal_user_headers: dict[str, str]
) -> None:
    """TEST: Logged-in user can retrieve all available avatars."""
    # 1. Create test avatars in database
    avatar1 = Avatar(name="Ninja", image_url="https://example.com/ninja.png")
    avatar2 = Avatar(name="Wizard", image_url="https://example.com/wizard.png")
    session.add(avatar1)
    session.add(avatar2)
    session.commit()

    # 2. Call GET /api/v1/avatars
    response = client.get("/api/v1/avatars", headers=normal_user_headers)

    assert response.status_code == 200
    data = response.json()
    assert "avatars" in data

    # Verify our created avatars appear in the response
    avatar_ids = [a["id"] for a in data["avatars"]]
    assert avatar1.id in avatar_ids
    assert avatar2.id in avatar_ids


def test_list_avatars_unauthenticated_fails(client: TestClient) -> None:
    """TEST (Security): Fetching avatars without a token returns 401."""
    response = client.get("/api/v1/avatars")
    assert response.status_code == 401


# ------------------------------------------------------------------------------
# Test Suite 2: GET /api/v1/elements
# ------------------------------------------------------------------------------

def test_list_elements_authenticated_success(
    client: TestClient, session: Session, normal_user_headers: dict[str, str]
) -> None:
    """TEST: Logged-in user can retrieve all available elements."""
    # 1. Create test elements in database
    elem1 = Element(image_url="https://example.com/table.png", width=2, height=1, static=True)
    elem2 = Element(image_url="https://example.com/plant.png", width=1, height=1, static=False)
    session.add(elem1)
    session.add(elem2)
    session.commit()

    # 2. Call GET /api/v1/elements
    response = client.get("/api/v1/elements", headers=normal_user_headers)

    assert response.status_code == 200
    data = response.json()
    assert "elements" in data

    elem_ids = [e["id"] for e in data["elements"]]
    assert elem1.id in elem_ids
    assert elem2.id in elem_ids


def test_list_elements_unauthenticated_fails(client: TestClient) -> None:
    """TEST (Security): Fetching elements without a token returns 401."""
    response = client.get("/api/v1/elements")
    assert response.status_code == 401

