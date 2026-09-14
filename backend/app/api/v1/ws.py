# ==============================================================================
# WEBSOCKET ROUTE ENDPOINT
# ==============================================================================
#
# 🎓 HOW WEBSOCKETS WORK IN FASTAPI (COMPARED TO EXPRESS.JS)
# ---------------------------------------------------------
# In Express.js (index.ts):
#     const wss = new WebSocketServer({ port: 3001 });
#     wss.on('connection', function connection(ws) {
#         let user = new User(ws);
#         ws.on('close', () => { user.destroy(); });
#     });
#
# In FastAPI:
#     FastAPI has native WebSocket support using `@router.websocket("/ws")`.
#     Instead of event listeners (`ws.on('message')`, `ws.on('close')`), Python uses
#     an `async with` / `while True` loop:
#     1. `await websocket.accept()`: Accepts the initial handshake from the browser.
#     2. `while True: data = await websocket.receive_text()`: Waits for player messages.
#     3. `except WebSocketDisconnect`: Catches when the player closes their browser tab.
#     4. `finally: await user.destroy()`: Guarantees cleanup (broadcasting user-left).
# ==============================================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import SessionDep
from app.realtime.manager import WSUser

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, session: SessionDep):
    """The live WebSocket gateway for all multiplayer metaverse connections.

    URL: ws://localhost:8000/api/v1/ws
    """
    # --------------------------------------------------------------------------
    # STEP 1: Handshake (Accept Connection)
    # --------------------------------------------------------------------------
    # The browser sends an HTTP Upgrade request: "Can we switch to WebSocket?"
    # Calling `await websocket.accept()` sends HTTP 101 Switching Protocols.
    # Now the connection is permanently open!
    await websocket.accept()

    # --------------------------------------------------------------------------
    # STEP 2: Create the Player's State Object
    # --------------------------------------------------------------------------
    # Wraps the raw socket and database session in our WSUser class
    # Equivalent to Express's: let user = new User(ws);
    user = WSUser(websocket=websocket, session=session)

    # --------------------------------------------------------------------------
    # STEP 3: The Message Loop
    # --------------------------------------------------------------------------
    # In Python, we listen for incoming packets using an asynchronous while loop.
    # `await websocket.receive_text()` pauses execution until the client sends a packet.
    try:
        while True:
            raw_message = await websocket.receive_text()
            await user.handle_message(raw_message)

    except WebSocketDisconnect:
        # Client closed the tab or lost internet connection
        # Equivalent to Express's: ws.on('close', () => user.destroy());
        await user.destroy()

    except Exception:
        # Any unexpected network socket drop
        await user.destroy()

