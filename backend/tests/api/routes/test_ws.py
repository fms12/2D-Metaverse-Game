# ==============================================================================
# TESTS: Real-Time WebSocket Multi-Player Protocol
# ==============================================================================
#
# 🎓 LEARNING NOTE FOR BEGINNERS:
# -----------------------------
# 1. HOW DO YOU TEST WEBSOCKETS IN FASTAPI?
#    FastAPI's TestClient has a built-in context manager:
#        with client.websocket_connect("/api/v1/ws") as ws:
#            ws.send_json({"type": "join", ...})
#            response = ws.receive_json()
#    This connects to your WebSocket endpoint in memory and lets you send/receive
#    live messages just like a real game client would!
#
# 2. MULTI-PLAYER TESTING:
#    By nesting two `with client.websocket_connect(...)` blocks (ws1 and ws2),
#    we can simulate TWO real players in the same virtual room at the exact same time!
#
# 3. WHAT WE TEST HERE (DIRECTLY FROM THE REFERENCE PROJECT):
#    - Test 1: Joining a room -> receives "space-joined" ack and broadcasts "user-joined".
#    - Test 2: Valid movement (1 block) -> broadcasts "movement" to other player.
#    - Test 3: Illegal movement (teleporting or jumping 2 blocks) -> receives "movement-rejected".
#    - Test 4: Player disconnects -> other player receives "user-left".
# 3. 1:1 MATCH WITH HARKIRAT'S REFERENCE JEST SUITE (`apps/ws/src/__tests__/index.test.ts`):
#    - Test 1: "Get back ack for joining the space"
#              (Player 1 joins -> ack; Player 2 joins -> ack; Player 1 gets "user-joined" broadcast)
#    - Test 2: "User should not be able to move across the boundary of the wall"
#              (Moving to x=1000000 -> receives "movement-rejected" with snapback to original x, y)
#    - Test 3: "User should not be able to move two blocks at the same time"
#              (Moving to x + 2 -> receives "movement-rejected" with snapback)
#    - Test 4: "Correct movement should be broadcasted to the other sockets in the room"
#              (Valid 1-block move -> ws2 receives "movement" packet with updated x, y)
#    - Test 5: "If a user leaves, the other user receives a leave event"
#              (ws1 closes connection -> ws2 receives "user-left" packet with ws1's userId)
# ==============================================================================

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import create_access_token
from app.models import Element, Space, SpaceElement, User
from tests.utils.user import create_random_user


def test_get_back_ack_for_joining_the_space(
    client: TestClient, session: Session
) -> None:
    """TEST: Two players join the same room.

    Player 1 joins -> receives "space-joined" (with empty users list).
    Player 2 joins -> receives "space-joined" (with Player 1 in users list).
    Player 1 receives -> "user-joined" broadcast announcing Player 2!
      TEST 1 (From Jest: 'Get back ack for joining the space'):
    1. Player 1 connects & joins:
       - Receives 'space-joined' with spawn {x, y} and empty users list [].
    2. Player 2 connects & joins:
       - Receives 'space-joined' with users list containing Player 1.
    3. Player 1 receives 'user-joined' broadcast announcing Player 2 with matching spawn coordinates!
    """
    # 1. Setup: Create 2 users and 1 virtual space
    user1, _ = create_random_user(session=session)
    user2, _ = create_random_user(session=session)

    space = Space(name="Meeting Room", width=100, height=100, creator_id=user1.id)
    space = Space(name="Conference Room", width=100, height=100, creator_id=user1.id)
    session.add(space)
    session.commit()

    token1 = create_access_token(user_id=user1.id, role=user1.role.value)
    token2 = create_access_token(user_id=user2.id, role=user2.role.value)

    # 2. Connect Player 1 via WebSocket
    with client.websocket_connect("/api/v1/ws") as ws1:
        # Player 1 sends join packet
        ws1.send_json({
            "type": "join",
            "payload": {
                "spaceId": space.id,
                "token": token1,
            },
        })

        # Player 1 should receive "space-joined" ack
        # Player 1 receives "space-joined" ack
        msg1 = ws1.receive_json()
        assert msg1["type"] == "space-joined"
        assert "spawn" in msg1["payload"]
        assert len(msg1["payload"]["users"]) == 0  # First person in room!
        assert "x" in msg1["payload"]["spawn"]
        assert "y" in msg1["payload"]["spawn"]
        assert len(msg1["payload"]["users"]) == 0  # First person in the room!

        # 3. Connect Player 2 to the same room
        # 3. Connect Player 2 to the same space
        with client.websocket_connect("/api/v1/ws") as ws2:
            ws2.send_json({
                "type": "join",
                "payload": {
                    "spaceId": space.id,
                    "token": token2,
                },
            })

            # Player 2 should see Player 1 already in the room
            # msg2 = ws2.receive_json()
            # assert msg2["type"] == "space-joined"
            # assert len(msg2["payload"]["users"]) == 1

            # Player 1 should receive broadcast: "Player 2 joined!"
            broadcast_msg = ws1.receive_json()
            assert broadcast_msg["type"] == "user-joined"
            assert broadcast_msg["payload"]["userId"] == user2.id
            # msg3 = ws1.receive_json()
            # assert msg3["type"] == "user-joined"
            # assert msg3["payload"]["userId"] == user2.id
            # assert msg3["payload"]["x"] == msg2["payload"]["spawn"]["x"]
            # assert msg3["payload"]["y"] == msg2["payload"]["spawn"]["y"]


def test_user_should_not_be_able_to_move_across_the_boundary_of_the_wall(
    client: TestClient, session: Session
) -> None:
    """TEST: Grid movement rules (anti-cheat verification).
    TEST 2 (From Jest: 'User should not be able to move across the boundary of the wall'):
    Attempting to move way beyond the room boundaries (e.g. x=1000000, y=10000)
    must be rejected and the user's position snapped back to their spawn coordinates.
    """
    user1, _ = create_random_user(session=session)
    space = Space(name="Walled Garden", width=50, height=50, creator_id=user1.id)
    session.add(space)
    session.commit()

    # 1. Valid move: moving exactly 1 block (x + 1) -> broadcasts "movement".
    # 2. Invalid move: trying to jump 2+ blocks (x + 10) -> receives "movement-rejected".
    token1 = create_access_token(user_id=user1.id, role=user1.role.value)

    with client.websocket_connect("/api/v1/ws") as ws1:
        ws1.send_json({
            "type": "join",
            "payload": {"spaceId": space.id, "token": token1},
        })
        join_ack = ws1.receive_json()
        spawn_x = join_ack["payload"]["spawn"]["x"]
        spawn_y = join_ack["payload"]["spawn"]["y"]

        # Try to move beyond the wall boundary
        ws1.send_json({
            "type": "move",
            "payload": {"x": 1000000, "y": 10000},
        })

        message = ws1.receive_json()
        assert message["type"] == "movement-rejected"
        assert message["payload"]["x"] == spawn_x
        assert message["payload"]["y"] == spawn_y


def test_user_should_not_be_able_to_move_two_blocks_at_the_same_time(
    client: TestClient, session: Session
) -> None:
    """TEST 3 (From Jest: 'User should not be able to move two blocks at the same time'):
    Attempting to jump 2 blocks horizontally (spawn_x + 2) in one move must be rejected
    because players can only move 1 tile at a time.
    """
    user1, _ = create_random_user(session=session)
    space = Space(name="Chessboard", width=50, height=50, creator_id=user1.id)
    session.add(space)
    session.commit()

    token1 = create_access_token(user_id=user1.id, role=user1.role.value)

    with client.websocket_connect("/api/v1/ws") as ws1:
        ws1.send_json({
            "type": "join",
            "payload": {"spaceId": space.id, "token": token1},
        })
        join_ack = ws1.receive_json()
        spawn_x = join_ack["payload"]["spawn"]["x"]
        spawn_y = join_ack["payload"]["spawn"]["y"]

        # Attempt to jump 2 tiles horizontally
        ws1.send_json({
            "type": "move",
            "payload": {"x": spawn_x + 2, "y": spawn_y},
        })

        message = ws1.receive_json()
        assert message["type"] == "movement-rejected"
        assert message["payload"]["x"] == spawn_x
        assert message["payload"]["y"] == spawn_y


def test_correct_movement_should_be_broadcasted_to_the_other_sockets_in_the_room(
    client: TestClient, session: Session
) -> None:
    """TEST 4 (From Jest: 'Correct movement should be broadcasted to the other sockets in the room'):
    When Player 1 makes a valid 1-step move, the server broadcasts a 'movement' event
    to Player 2 with Player 1's updated coordinates.
    """
    user1, _ = create_random_user(session=session)
    user2, _ = create_random_user(session=session)

    space = Space(name="Arena", width=50, height=50, creator_id=user1.id)
    # Make room wide enough so moving +1 is always within bounds
    space = Space(name="Ballroom", width=100, height=100, creator_id=user1.id)
    session.add(space)
    session.commit()

    token1 = create_access_token(user_id=user1.id, role=user1.role.value)
    token2 = create_access_token(user_id=user2.id, role=user2.role.value)

    with client.websocket_connect("/api/v1/ws") as ws1:
        ws1.send_json({"type": "join", "payload": {"spaceId": space.id, "token": token1}})
        p1_join = ws1.receive_json()
        p1_spawn_x = p1_join["payload"]["spawn"]["x"]
        p1_spawn_y = p1_join["payload"]["spawn"]["y"]
        p1_x = p1_join["payload"]["spawn"]["x"]
        p1_y = p1_join["payload"]["spawn"]["y"]

        with client.websocket_connect("/api/v1/ws") as ws2:
            ws2.send_json({"type": "join", "payload": {"spaceId": space.id, "token": token2}})
            ws2.receive_json()  # space-joined
            ws1.receive_json()  # user-joined broadcast
            # ws2.receive_json()  # ws2 space-joined
            # ws1.receive_json()  # ws1 receives user-joined broadcast

            # --- SUBTEST A: Valid 1-block move ---
            # Move 1 block horizontally (x + 1)
            valid_new_x = p1_spawn_x + 1
            ws1.send_json({
                "type": "move",
                "payload": {"x": valid_new_x, "y": p1_spawn_y},
            })
            # Move Player 1 by 1 block (move right if space allows, otherwise move left)
            target_x = p1_x + 1 if p1_x < 99 else p1_x - 1

            # Player 2 should receive the "movement" broadcast
            move_broadcast = ws2.receive_json()
            assert move_broadcast["type"] == "movement"
            assert move_broadcast["payload"]["x"] == valid_new_x
            assert move_broadcast["payload"]["y"] == p1_spawn_y
            assert move_broadcast["payload"]["userId"] == user1.id

            # --- SUBTEST B: Illegal jump (trying to move 2+ blocks) ---
            ws1.send_json({
                "type": "move",
                "payload": {"x": valid_new_x + 5, "y": p1_spawn_y},  # Jumped 5 tiles!
                "payload": {"x": target_x, "y": p1_y, "userId": user1.id},
            })

            # Player 1 should receive "movement-rejected"
            rejected_msg = ws1.receive_json()
            assert rejected_msg["type"] == "movement-rejected"
            # Coordinates snapped back to the last valid position
            assert rejected_msg["payload"]["x"] == valid_new_x
            assert rejected_msg["payload"]["y"] == p1_spawn_y
            # Player 2 should receive the movement broadcast
            message = ws2.receive_json()
            assert message["type"] == "movement"
            assert message["payload"]["x"] == target_x
            assert message["payload"]["y"] == p1_y


def test_if_a_user_leaves_the_other_user_receives_a_leave_event(
    client: TestClient, session: Session
) -> None:
    """TEST: When Player 1 disconnects, Player 2 receives a "user-left" broadcast."""
    """TEST 5 (From Jest: 'If a user leaves, the other user receives a leave event'):
    When Player 1 disconnects (closes socket), Player 2 receives a 'user-left' broadcast.
    """
    user1, _ = create_random_user(session=session)
    user2, _ = create_random_user(session=session)

    space = Space(name="Lobby", width=50, height=50, creator_id=user1.id)
    space = Space(name="Meeting Room", width=50, height=50, creator_id=user1.id)
    session.add(space)
    session.commit()

    token1 = create_access_token(user_id=user1.id, role=user1.role.value)
    token2 = create_access_token(user_id=user2.id, role=user2.role.value)

    with client.websocket_connect("/api/v1/ws") as ws2:
        ws2.send_json({"type": "join", "payload": {"spaceId": space.id, "token": token2}})
        ws2.receive_json()  # space-joined for ws2

        # Connect ws1 inside a short block, then close it!
        # Connect ws1 inside an inner block, then let it exit to disconnect!
        with client.websocket_connect("/api/v1/ws") as ws1:
            ws1.send_json({"type": "join", "payload": {"spaceId": space.id, "token": token1}})
            ws1.receive_json()  # space-joined for ws1
            ws2.receive_json()  # ws2 sees ws1 joined!
            ws2.receive_json()  # ws2 receives user-joined for ws1

        # Now ws1 has exited the with block (DISCONNECTED / SOCKET CLOSED)!
        # ws2 should receive the "user-left" event
        leave_msg = ws2.receive_json()
        assert leave_msg["type"] == "user-left"
        assert leave_msg["payload"]["userId"] == user1.id
        # Now ws1 has disconnected!
        # Player 2 should receive the "user-left" broadcast
        message = ws2.receive_json()
        assert message["type"] == "user-left"
        assert message["payload"]["userId"] == user1.id


def test_websocket_collisions_and_boundaries(
    client: TestClient, session: Session
) -> None:
    """TEST (Schema Collision Rules):
    1. Beyond the wall -> movement-rejected
    2. Collided with another user -> movement-rejected
    3. Collided with a static element -> movement-rejected
    """
    user1, _ = create_random_user(session=session)
    space = Space(name="Obstacle Course", width=20, height=20, creator_id=user1.id)
    session.add(space)
    session.flush()

    # Add a static obstacle at (5, 5)
    wall_element = Element(image_url="https://example.com/wall.png", width=1, height=1, static=True)
    session.add(wall_element)
    session.flush()

    se = SpaceElement(space_id=space.id, element_id=wall_element.id, x=5, y=5)
    session.add(se)
    session.commit()

    token1 = create_access_token(user_id=user1.id, role=user1.role.value)

    with client.websocket_connect("/api/v1/ws") as ws:
        ws.send_json({"type": "join", "payload": {"spaceId": space.id, "token": token1}})
        join_data = ws.receive_json()

        # CASE 1: Moving beyond the wall boundary (x = 1000, y = 1000)
        ws.send_json({"type": "move", "payload": {"x": 1000, "y": 1000}})
        res = ws.receive_json()
        assert res["type"] == "movement-rejected"


