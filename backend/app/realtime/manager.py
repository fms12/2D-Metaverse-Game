# ==============================================================================
# REAL-TIME WEBSOCKET MANAGER (According to Metaverse WebSocket Schema)
# ==============================================================================
#
# 🎓 WHAT IS A WEBSOCKET? (REAL-LIFE ANALOGY FOR BEGINNERS)
# --------------------------------------------------------
# 1. HTTP vs WEBSOCKET:
#    - Standard HTTP is like SENDING LETTERS BY POSTAL MAIL ✉️:
#      Your browser writes a request (GET /space), sends it, gets a response back,
#      and the connection closes. The server CANNOT talk to you unless you ask first!
#      This is too slow for games. Imagine playing Gather Town and sending 60 HTTP requests
#      every second just to ask: "Did anyone move?" (That would crash the server).
#
#    - A WebSocket is like a LIVE PHONE CALL 📞:
#      Your browser dials the server once (the "Handshake"). Once connected, the line
#      STAYS OPEN continuously. Both you and the server can send messages back and forth
#      instantaneously with almost zero delay (low latency)!
#
# 2. TYPESCRIPT vs FASTAPI ARCHITECTURE COMPARISON:
#    ---------------------------------------------------------------------------
#    TypeScript Reference Repo (`apps/ws/src/`)    FastAPI Equivalent (`app/realtime/manager.py`)
#    ---------------------------------------------------------------------------
#    `RoomManager.ts` (Singleton class)          `RoomManager` class (Singleton in Python)
#    `User.ts` (Class wrapping a socket)         `WSUser` class (Wraps FastAPI's WebSocket)
#    `Map<string, User[]>`                       `dict[str, list[WSUser]]`
#    `jwt.verify(token, JWT_PASSWORD)`           `decode_access_token(token)` (from app.core.security)
#    `client.space.findFirst(...)`               `session.get(Space, space_id)` (SQLModel ORM)
#    `ws.send(JSON.stringify(payload))`          `await self.websocket.send_json(payload)`
#    ---------------------------------------------------------------------------
# ==============================================================================

import json
import random
import string
from typing import Any, Optional

from fastapi import WebSocket
from sqlmodel import Session

from app.core.security import decode_access_token
from app.models import Space, User


def get_random_string(length: int = 10) -> str:
    """Generate a temporary unique connection ID for each socket.

    TypeScript equivalent in User.ts:
        function getRandomString(length: number) { ... }
    """
    characters = string.ascii_letters + string.digits
    return "".join(random.choice(characters) for _ in range(length))


# ==============================================================================
# CLASS 1: RoomManager (The Virtual Space Operator)
# ==============================================================================
# Real-Life Analogy:
# Think of a hotel manager holding a clipboard with room numbers.
# Room "space-123" has: [Alice, Bob, Charlie]
# Room "space-456" has: [David]
#
# When Alice moves, she tells the RoomManager: "I moved to (5, 8)".
# The RoomManager walks into room "space-123" and whispers to Bob and Charlie:
# "Alice just moved to (5, 8)!" (Notice it does NOT repeat it to Alice herself).
# ==============================================================================

class RoomManager:
    """Singleton room manager that tracks active players in every virtual room/space.

    TypeScript equivalent:
        export class RoomManager {
            rooms: Map<string, User[]> = new Map();
            static instance: RoomManager;
            ...
        }
    """
    _instance: Optional["RoomManager"] = None

    def __init__(self) -> None:
        # A dictionary mapping spaceId -> list of connected WSUser objects
        # In TypeScript: rooms: Map<string, User[]> = new Map();
        self.rooms: dict[str, list["WSUser"]] = {}

    @classmethod
    def get_instance(cls) -> "RoomManager":
        """Singleton pattern: ensures only ONE RoomManager exists across the whole app.

        TypeScript equivalent:
            static getInstance() {
                if (!this.instance) { this.instance = new RoomManager(); }
                return this.instance;
            }
        """
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def add_user(self, space_id: str, user: "WSUser") -> None:
        """Add a player connection to a virtual space.

        TypeScript equivalent:
            public addUser(spaceId: string, user: User) { ... }
        """
        if space_id not in self.rooms:
            self.rooms[space_id] = [user]
        else:
            self.rooms[space_id].append(user)

    def remove_user(self, space_id: str, user: "WSUser") -> None:
        """Remove a player connection from a virtual space when they leave or disconnect.

        TypeScript equivalent:
            public removeUser(user: User, spaceId: string) { ... }
        """
        if space_id not in self.rooms:
            return

        self.rooms[space_id] = [u for u in self.rooms[space_id] if u.id != user.id]

        # If room is completely empty, delete room key to save RAM
        if not self.rooms[space_id]:
            del self.rooms[space_id]

    async def broadcast(self, message: dict[str, Any], sender: "WSUser", room_id: str) -> None:
        """Broadcast a message to every player in the room EXCEPT the sender.

        TypeScript equivalent:
            public broadcast(message: OutgoingMessage, user: User, roomId: string) {
                this.rooms.get(roomId)?.forEach((u) => {
                    if (u.id !== user.id) { u.send(message); }
                });
            }
        """
        if room_id not in self.rooms:
            return

        for user in self.rooms[room_id]:
            # Do NOT send the message back to the person who originated it!
            if user.id != sender.id:
                await user.send(message)


# ==============================================================================
# CLASS 2: WSUser (Represents One Player's Live WebSocket Connection)
# ==============================================================================
# Real-Life Analogy:
# Think of an avatar in the game. It has:
# - An active phone call to the server (`websocket`)
# - An $(x, y)$ position on the tile grid
# - A user identity (`user_id` from their JWT badge)
# - The room they are currently standing in (`space_id`)
# ==============================================================================

class WSUser:
    """Manages an individual player's WebSocket connection and gameplay events.

    TypeScript equivalent:
        export class User {
            public id: string;
            public userId?: string;
            private spaceId?: string;
            private x: number;
            private y: number;
            private ws: WebSocket;
            ...
        }
    """

    def __init__(self, websocket: WebSocket, session: Session) -> None:
        self.websocket: WebSocket = websocket
        self.session: Session = session

        # Unique random ID for this specific socket connection
        self.id: str = get_random_string(10)

        # Player position on the 2D grid
        self.x: int = 0
        self.y: int = 0

        # Room boundary and static element caches
        self.space_width: int = 1000
        self.space_height: int = 1000
        self.static_elements: set[tuple[int, int]] = set()

        # Authenticated user ID (from JWT), username, and current space ID
        self.user_id: Optional[str] = None
        self.username: Optional[str] = None
        self.space_id: Optional[str] = None
 
    async def handle_message(self, raw_data: str) -> None:
        """Process incoming WebSocket JSON messages from the player according to schema."""
        try:
            parsed_data = json.loads(raw_data)
        except json.JSONDecodeError:
            # If client sends invalid JSON, ignore
            return

        msg_type = parsed_data.get("type")
        payload = parsed_data.get("payload", {})

        # ======================================================================
        # SCHEMA EVENT 1: Client sends "join"
        # ======================================================================
        # Client sends:
        # {
        #     "type": "join",
        #     "payload": {
        #         "spaceId": "123",
        #         "token": "token_received_during_login"
        #     }
        # }
        # ======================================================================
        if msg_type == "join":
            space_id = payload.get("spaceId")
            token = payload.get("token")

            # 1. Verify JWT token
            try:
                decoded = decode_access_token(token)
                self.user_id = decoded.get("sub")
            except Exception:
                # Invalid or expired token: close connection
                await self.websocket.close(code=1008)
                return

            if not self.user_id:
                await self.websocket.close(code=1008)
                return

            # Lookup username from database
            db_user = self.session.get(User, self.user_id)
            if db_user:
                self.username = db_user.username
            else:
                self.username = "Player"

            # 2. Check if space exists in database
            space = self.session.get(Space, space_id)
            if not space:
                # Space doesn't exist: close connection
                await self.websocket.close(code=1008)
                return

            self.space_id = space_id
            self.space_width = space.width
            self.space_height = space.height

            # Cache static collision elements for this space (chairs, desks, walls)
            self.static_elements = set()
            if space.elements:
                for se in space.elements:
                    if se.element and se.element.static:
                        self.static_elements.add((se.x, se.y))

            # 3. Add user to the RoomManager
            RoomManager.get_instance().add_user(space_id, self)

            # 4. Spawn nearby players together, avoiding occupied and static tiles.
            self.x, self.y = self._find_spawn_position()

            # 5. SERVER SENDS EVENT: "space-joined" to the player
            # Schema format:
            # { 
            #     "type": "space-joined",
            #     "payload": {
            #         "spawn": { "x": 2, "y": 3 },
            #         "users": [{ "id": 1 }]
            #     }
            # }
            existing_players = [
                {
                    "id": u.user_id or u.id,
                    "userId": u.user_id or u.id,
                    "username": u.username or "Player",
                    "x": u.x,
                    "y": u.y,
                }
                for u in RoomManager.get_instance().rooms.get(space_id, [])
                if u.id != self.id
            ]

            await self.send({
                "type": "space-joined",
                "payload": {
                    "spawn": {
                        "x": self.x,
                        "y": self.y,
                    },
                    "users": existing_players,
                },
            })

            # 6. SERVER BROADCASTS EVENT: "user-joined" to all other players in room
            # Schema format:
            # {
            #     "type": "user-joined",
            #     "payload": {
            #         "userId": "123",
            #         "username": "alice",
            #         "x": 1,
            #         "y": 2
            #     }
            # }
            await RoomManager.get_instance().broadcast(
                {
                    "type": "user-joined",
                    "payload": {
                        "userId": self.user_id,
                        "username": self.username or "Player",
                        "x": self.x,
                        "y": self.y,
                    },
                },
                sender=self,
                room_id=self.space_id,
            )

        # ======================================================================
        # SCHEMA EVENT 2: Client sends "move"
        # ======================================================================
        # Client sends:
        # {
        #     "type": "move",
        #     "payload": {
        #         "x": 2,
        #         "y": 3
        #     }
        # }
        # ======================================================================
        elif msg_type == "move":
            if not self.space_id:
                return

            move_x = payload.get("x", self.x)
            move_y = payload.get("y", self.y)

            # ------------------------------------------------------------------
            # COLLISION & MOVEMENT VALIDATION (Schema Rules):
            # 1. Step displacement: User can only move 1 tile up/down/left/right
            # 2. Wall boundary: User moves beyond the wall (outside space width/height)
            # 3. User collision: User collided with a different user in the room
            # 4. Static collision: User tried to sit/walk on an element that is static
            # ------------------------------------------------------------------
            x_displacement = abs(self.x - move_x)
            y_displacement = abs(self.y - move_y)

            # 1. Must be exactly 1 step (no teleporting, no diagonal jumps)
            is_single_step = (x_displacement == 1 and y_displacement == 0) or (
                x_displacement == 0 and y_displacement == 1
            )

            # 2. Inside wall boundaries
            is_inside_walls = (0 <= move_x < self.space_width) and (0 <= move_y < self.space_height)

            # 3. Collision with another player in the same room
            room_users = RoomManager.get_instance().rooms.get(self.space_id, [])
            collided_with_user = any(
                u.x == move_x and u.y == move_y for u in room_users if u.id != self.id
            )

            # 4. Collision with a static obstacle (wall/desk/chair)
            collided_with_static = (move_x, move_y) in self.static_elements

            # CHECK: If all valid, accept move!
            if is_single_step and is_inside_walls and not collided_with_user and not collided_with_static:
                self.x = move_x
                self.y = move_y

                # SERVER BROADCASTS EVENT: "movement" to everyone else in room
                # Schema format:
                # {
                #     "type": "movement",
                #     "payload": {
                #         "x": 1,
                #         "y": 2,
                #         "userId": "123"
                #     }
                # }
                await RoomManager.get_instance().broadcast(
                    {
                        "type": "movement",
                        "payload": {
                            "x": self.x,
                            "y": self.y,
                            "userId": self.user_id,
                        },
                    },
                    sender=self,
                    room_id=self.space_id,
                )
            else:
                # SERVER SENDS EVENT: "movement-rejected" to the moving player
                # Returns back the x, y of where they should be pushed back to!
                # Schema format:
                # {
                #    "type": "movement-rejected",
                #    "payload": {
                #        "x": 2,
                #        "y": 3
                #    }
                # }
                await self.send({
                    "type": "movement-rejected",
                    "payload": {
                        "x": self.x,
                        "y": self.y,
                    },
                })

    def _find_spawn_position(self) -> tuple[int, int]:
        occupied_positions = {
            (user.x, user.y)
            for user in RoomManager.get_instance().rooms.get(self.space_id or "", [])
            if user.id != self.id
        }
        unavailable_positions = occupied_positions | self.static_elements
        center_x = (self.space_width - 1) // 2
        center_y = (self.space_height - 1) // 2

        for distance in range(max(self.space_width, self.space_height)):
            for offset_x in range(-distance, distance + 1):
                offset_y = distance - abs(offset_x)
                offset_ys = (0,) if offset_y == 0 else (-offset_y, offset_y)

                for signed_offset_y in offset_ys:
                    candidate_x = center_x + offset_x
                    candidate_y = center_y + signed_offset_y
                    is_inside_space = (
                        0 <= candidate_x < self.space_width
                        and 0 <= candidate_y < self.space_height
                    )
                    if is_inside_space and (candidate_x, candidate_y) not in unavailable_positions:
                        return candidate_x, candidate_y

        raise RuntimeError("No free spawn position is available in this space")

    async def destroy(self) -> None:
        """Called when player closes socket, tab, or disconnects.

        SERVER BROADCASTS EVENT: "user-left"
        Schema format:
        {
            "type": "user-left",
            "payload": {
                "userId": "123"
            }
        }
        """
        if self.space_id:
            # 1. Broadcast to remaining players in room that this player left
            await RoomManager.get_instance().broadcast(
                {
                    "type": "user-left",
                    "payload": {
                        "userId": self.user_id,
                    },
                },
                sender=self,
                room_id=self.space_id,
            )

            # 2. Remove user from room manager
            RoomManager.get_instance().remove_user(self.space_id, self)

    async def send(self, payload: dict[str, Any]) -> None:
        """Send a JSON payload down the WebSocket to this client."""
        try:
            await self.websocket.send_json(payload)
        except Exception:
            pass
