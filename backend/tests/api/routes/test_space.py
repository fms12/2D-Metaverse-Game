# ==============================================================================
# TESTS: Space & Arena API Routes (/api/v1/space/*)
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# -----------------------------
# In our Metaverse game, a "Space" is a virtual room where avatars walk around.
# Users can:
#   1. Create a space (blank or from a map template)
#   2. List all their created spaces
#   3. View a specific space and its placed 3D/2D elements (chairs, tables)
#   4. Add an element at coordinates (x, y)
#   5. Remove an element
#   6. Delete their space
#
# This file tests ALL of these capabilities, including security boundaries
# (e.g. verifying that User A cannot delete User B's space!).
# ==============================================================================

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Element, Map, MapElement, Space, User
from tests.utils.user import create_random_user, get_user_auth_headers


# ------------------------------------------------------------------------------
# Test Suite 1: POST /api/v1/space (Create Space)
# ------------------------------------------------------------------------------

def test_create_blank_space_success(
    client: TestClient, normal_user_headers: dict[str, str]
) -> None:
    """TEST: Authenticated user creates a new blank room with specific dimensions.

    LEARNING NOTE:
    - Input: {"name": "Conference Room", "dimensions": "100x200"}
    - Expected Output: {"spaceId": "<uuid>"} with status 200 OK.
    """
    response = client.post(
        "/api/v1/space",
        headers=normal_user_headers,
        json={
            "name": "My First Virtual Office",
            "dimensions": "100x200",
        },
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert "spaceId" in data
    assert isinstance(data["spaceId"], str)


def test_create_space_from_map_template(
    client: TestClient, session: Session, normal_user_headers: dict[str, str]
) -> None:
    """TEST: Creating a space from a pre-made Map template copies all default elements.

    LEARNING NOTE:
    When a user chooses a template like "Office Map", the backend:
    1. Looks up the Map template.
    2. Uses the Map's dimensions.
    3. Automatically clones all elements (chairs, desks) from MapElement into SpaceElement!
    """
    # 1. Setup: Create an element (e.g. Chair)
    chair = Element(image_url="https://example.com/chair.png", width=1, height=1, static=True)
    session.add(chair)
    session.flush()

    # 2. Setup: Create a Map template with the chair pre-placed at (x=10, y=10)
    map_template = Map(name="Interview Room", width=50, height=50, thumbnail="https://example.com/thumb.png")
    session.add(map_template)
    session.flush()

    map_elem = MapElement(element_id=chair.id, map_id=map_template.id, x=10, y=10)
    session.add(map_elem)
    session.commit()

    # 3. Create a new space using mapId
    response = client.post(
        "/api/v1/space",
        headers=normal_user_headers,
        json={
            "name": "Team Interview Space",
            "dimensions": "50x50",
            "mapId": map_template.id,
        },
    )
    assert response.status_code == 200
    space_id = response.json()["spaceId"]

    # 4. Fetch the newly created space: it should already have 1 placed element!
    get_res = client.get(f"/api/v1/space/{space_id}", headers=normal_user_headers)
    assert get_res.status_code == 200
    space_data = get_res.json()
    assert len(space_data["elements"]) == 1
    assert space_data["elements"][0]["x"] == 10
    assert space_data["elements"][0]["y"] == 10


def test_create_space_invalid_dimension_format_fails(
    client: TestClient, normal_user_headers: dict[str, str]
) -> None:
    """TEST (Sad Path): An invalid dimension string must return HTTP 400."""
    response = client.post(
        "/api/v1/space",
        headers=normal_user_headers,
        json={
            "name": "Bad Space",
            "dimensions": "not-a-dimension",  # Must match regex: ^[0-9]{1,4}x[0-9]{1,4}$
        },
    )
    assert response.status_code == 400


# ------------------------------------------------------------------------------
# Test Suite 2: GET /api/v1/space/all (List User's Spaces)
# ------------------------------------------------------------------------------

def test_get_all_user_spaces(
    client: TestClient, normal_user_headers: dict[str, str], session: Session, normal_user: User
) -> None:
    """TEST: GET /api/v1/space/all only returns spaces created by the authenticated user."""
    # 1. Create a space owned by normal_user
    space1 = Space(name="Normal User Space", width=20, height=20, creator_id=normal_user.id)
    session.add(space1)

    # 2. Create another space owned by a DIFFERENT user
    other_user, _ = create_random_user(session=session)
    other_space = Space(name="Other User Space", width=30, height=30, creator_id=other_user.id)
    session.add(other_space)
    session.commit()

    # 3. Call GET /space/all as normal_user
    response = client.get("/api/v1/space/all", headers=normal_user_headers)
    assert response.status_code == 200
    data = response.json()
    assert "spaces" in data

    # Verify: only normal_user's space appears, not other_user's space!
    space_ids = [s["id"] for s in data["spaces"]]
    assert space1.id in space_ids
    assert other_space.id not in space_ids


# ------------------------------------------------------------------------------
# Test Suite 3: GET /api/v1/space/{spaceId} & Elements
# ------------------------------------------------------------------------------

def test_get_space_detail_and_add_element(
    client: TestClient, session: Session, normal_user_headers: dict[str, str], normal_user: User
) -> None:
    """TEST: Placing an element inside a space and verifying it shows up in space details.

    Steps:
    1. Create a space (100x100).
    2. Create an element (Desk).
    3. POST /api/v1/space/element at (x=25, y=30).
    4. GET /api/v1/space/{spaceId} and verify the Desk is at (25, 30).
    """
    # 1. Create Space & Element
    space = Space(name="Office", width=100, height=100, creator_id=normal_user.id)
    desk = Element(image_url="https://example.com/desk.png", width=2, height=1, static=True)
    session.add(space)
    session.add(desk)
    session.commit()

    # 2. Add element to space
    add_res = client.post(
        "/api/v1/space/element",
        headers=normal_user_headers,
        json={
            "spaceId": space.id,
            "elementId": desk.id,
            "x": 25,
            "y": 30,
        },
    )
    assert add_res.status_code == 200
    assert add_res.json()["message"] == "Element added"

    # 3. Get space detail and assert the placed element exists
    detail_res = client.get(f"/api/v1/space/{space.id}", headers=normal_user_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["dimensions"] == "100x100"
    assert len(detail_data["elements"]) == 1

    placed_item = detail_data["elements"][0]
    assert placed_item["x"] == 25
    assert placed_item["y"] == 30
    assert placed_item["element"]["id"] == desk.id
    assert placed_item["element"]["imageUrl"] == "https://example.com/desk.png"


def test_add_element_outside_space_bounds_fails(
    client: TestClient, session: Session, normal_user_headers: dict[str, str], normal_user: User
) -> None:
    """TEST (Boundary Check): Trying to place an element outside room boundaries must fail with 400.

    LEARNING NOTE:
    If room is 50x50, placing an element at x=999 is invalid.
    Our CRUD layer checks `x >= space.width or y >= space.height` and rejects it.
    """
    space = Space(name="Small Room", width=50, height=50, creator_id=normal_user.id)
    elem = Element(image_url="https://example.com/lamp.png", width=1, height=1, static=False)
    session.add(space)
    session.add(elem)
    session.commit()

    response = client.post(
        "/api/v1/space/element",
        headers=normal_user_headers,
        json={"spaceId": space.id, "elementId": elem.id, "x": 100, "y": 20},  # x=100 > width=50!
    )
    assert response.status_code == 400
    assert "outside space dimensions" in response.json()["detail"]


# ------------------------------------------------------------------------------
# Test Suite 4: DELETE /api/v1/space/element & DELETE /api/v1/space/{spaceId}
# ------------------------------------------------------------------------------

def test_delete_space_element(
    client: TestClient, session: Session, normal_user_headers: dict[str, str], normal_user: User
) -> None:
    """TEST: Removing a placed element from a space."""
    space = Space(name="Room", width=50, height=50, creator_id=normal_user.id)
    elem = Element(image_url="https://example.com/chair.png", width=1, height=1, static=True)
    session.add(space)
    session.add(elem)
    session.commit()

    # Place element
    client.post(
        "/api/v1/space/element",
        headers=normal_user_headers,
        json={"spaceId": space.id, "elementId": elem.id, "x": 5, "y": 5},
    )

    # Get placed element id
    detail = client.get(f"/api/v1/space/{space.id}", headers=normal_user_headers).json()
    placed_id = detail["elements"][0]["id"]

    # Delete it via DELETE /api/v1/space/element with body {"id": placed_id}
    del_res = client.request(
        "DELETE",
        "/api/v1/space/element",
        headers=normal_user_headers,
        json={"id": placed_id},
    )
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Element deleted"

    # Verify space now has 0 elements
    refreshed = client.get(f"/api/v1/space/{space.id}", headers=normal_user_headers).json()
    assert len(refreshed["elements"]) == 0


def test_delete_space_by_creator_success(
    client: TestClient, session: Session, normal_user_headers: dict[str, str], normal_user: User
) -> None:
    """TEST: Creator can successfully delete their space."""
    space = Space(name="To Delete", width=20, height=20, creator_id=normal_user.id)
    session.add(space)
    session.commit()

    del_res = client.delete(f"/api/v1/space/{space.id}", headers=normal_user_headers)
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Space deleted"


def test_delete_space_by_non_creator_fails(
    client: TestClient, session: Session, normal_user_headers: dict[str, str]
) -> None:
    """TEST (Security): A user CANNOT delete another user's space!

    LEARNING NOTE:
    We create a space owned by "other_user", then try to delete it using
    normal_user's headers. The server MUST reject with HTTP 403 Forbidden!
    """
    other_user, _ = create_random_user(session=session)
    other_space = Space(name="Victim's Space", width=50, height=50, creator_id=other_user.id)
    session.add(other_space)
    session.commit()

    # Try deleting other_user's space using normal_user's credentials:
    response = client.delete(f"/api/v1/space/{other_space.id}", headers=normal_user_headers)
    assert response.status_code == 403
    assert "not the creator" in response.json()["detail"]

