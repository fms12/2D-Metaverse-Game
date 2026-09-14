# ==============================================================================
# TESTS: Admin-Only API Routes (/api/v1/admin/*)
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# -----------------------------
# 1. WHAT IS ROLE-BASED ACCESS CONTROL (RBAC)?
#    Some API endpoints should only be accessible by system administrators (e.g. creating
#    official furniture items, avatars, or map templates).
#    In our FastAPI backend, we implemented `AdminDep` in `app/api/deps.py`:
#        def get_current_admin(user: CurrentUserDep):
#            if user.role != Role.ADMIN:
#                raise HTTPException(403, "Admin access required")
#
# 2. WHAT WE MUST TEST FOR ADMIN ENDPOINTS:
#    - Test A (Happy Path): When an Admin calls the route -> 200 OK.
#    - Test B (Authorization Check): When a Normal User calls the route -> 403 Forbidden.
#    - Test C (Authentication Check): When an anonymous client calls without a token -> 401 Unauthorized.
# ==============================================================================

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Element


# ------------------------------------------------------------------------------
# Test Suite 1: POST /api/v1/admin/element & PUT /api/v1/admin/element/{id}
# ------------------------------------------------------------------------------

def test_admin_create_element_success(
    client: TestClient, admin_user_headers: dict[str, str]
) -> None:
    """TEST: Admin creates a new 3D/2D reusable element."""
    response = client.post(
        "/api/v1/admin/element",
        headers=admin_user_headers,
        json={
            "imageUrl": "https://example.com/tree.png",
            "width": 2,
            "height": 2,
            "static": True,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert isinstance(data["id"], str)


def test_normal_user_cannot_create_element(
    client: TestClient, normal_user_headers: dict[str, str]
) -> None:
    """TEST (Security): Regular non-admin users must be rejected with 403 Forbidden."""
    response = client.post(
        "/api/v1/admin/element",
        headers=normal_user_headers,
        json={"imageUrl": "https://example.com/hack.png", "width": 1, "height": 1, "static": False},
    )

    assert response.status_code == 403
    assert "Admin access required" in response.json()["detail"]


def test_admin_update_element_success(
    client: TestClient, session: Session, admin_user_headers: dict[str, str]
) -> None:
    """TEST: Admin updates an existing element's image URL."""
    # 1. Create an element in DB
    elem = Element(image_url="https://example.com/old.png", width=1, height=1, static=True)
    session.add(elem)
    session.commit()

    # 2. Update via PUT /api/v1/admin/element/{id}
    new_url = "https://example.com/updated_hd.png"
    response = client.put(
        f"/api/v1/admin/element/{elem.id}",
        headers=admin_user_headers,
        json={"imageUrl": new_url},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Element updated"

    # 3. Verify in DB
    session.refresh(elem)
    assert elem.image_url == new_url


def test_normal_user_cannot_update_element(
    client: TestClient, normal_user_headers: dict[str, str]
) -> None:
    """TEST (Security): Regular non-admin users cannot update elements."""
    response = client.put(
        "/api/v1/admin/element/123",
        headers=normal_user_headers,
        json={"imageUrl": "https://example.com/new.png"},
    )
    assert response.status_code == 403


# ------------------------------------------------------------------------------
# Test Suite 2: POST /api/v1/admin/avatar
# ------------------------------------------------------------------------------

def test_admin_create_avatar_success(
    client: TestClient, admin_user_headers: dict[str, str]
) -> None:
    """TEST: Admin creates a new selectable avatar for users."""
    response = client.post(
        "/api/v1/admin/avatar",
        headers=admin_user_headers,
        json={
            "imageUrl": "https://example.com/robot.png",
            "name": "Robo",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "avatarId" in data
    assert isinstance(data["avatarId"], str)


def test_normal_user_cannot_create_avatar(
    client: TestClient, normal_user_headers: dict[str, str]
) -> None:
    """TEST (Security): Regular user cannot create avatars."""
    response = client.post(
        "/api/v1/admin/avatar",
        headers=normal_user_headers,
        json={"imageUrl": "https://example.com/fake.png", "name": "Fake"},
    )
    assert response.status_code == 403


# ------------------------------------------------------------------------------
# Test Suite 3: POST /api/v1/admin/map (Create Map Template)
# ------------------------------------------------------------------------------

def test_admin_create_map_success(
    client: TestClient, session: Session, admin_user_headers: dict[str, str]
) -> None:
    """TEST: Admin creates a new map template with default placed elements."""
    # 1. Setup: Create a chair element to put in the map template
    chair = Element(image_url="https://example.com/chair.png", width=1, height=1, static=True)
    session.add(chair)
    session.commit()

    # 2. Admin calls POST /api/v1/admin/map
    response = client.post(
        "/api/v1/admin/map",
        headers=admin_user_headers,
        json={
            "name": "Classroom Template",
            "dimensions": "80x60",
            "thumbnail": "https://example.com/classroom_thumb.png",
            "defaultElements": [
                {"elementId": chair.id, "x": 10, "y": 10},
                {"elementId": chair.id, "x": 20, "y": 10},
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert isinstance(data["id"], str)


def test_normal_user_cannot_create_map(
    client: TestClient, normal_user_headers: dict[str, str]
) -> None:
    """TEST (Security): Regular user cannot create map templates."""
    response = client.post(
        "/api/v1/admin/map",
        headers=normal_user_headers,
        json={
            "name": "Illegal Map",
            "dimensions": "50x50",
            "thumbnail": "https://example.com/thumb.png",
            "defaultElements": [],
        },
    )
    assert response.status_code == 403
