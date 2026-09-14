# API router aggregation — includes all v1 route modules.
#
# Express equivalent (routes/v1/index.ts):
#   router.use("/user", userRouter)
#   router.use("/space", spaceRouter)
#   router.use("/admin", adminRouter)
#
# In FastAPI, include_router() is the equivalent of Express's router.use().
# The prefix is set on each router, so we just include them here.

from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.public import router as public_router
from app.api.v1.space import router as space_router
from app.api.v1.user import router as user_router
from app.api.v1.ws import router as ws_router

api_router = APIRouter()

# Auth routes (no prefix — /signup and /signin at root v1 level)
api_router.include_router(auth_router)

# User routes (prefix="/user" set on router)
api_router.include_router(user_router)

# Space routes (prefix="/space" set on router)
api_router.include_router(space_router)

# Admin routes (prefix="/admin" set on router)
api_router.include_router(admin_router)

# Public routes (no prefix — /avatars and /elements at root v1 level)
api_router.include_router(public_router)

# WebSocket routes (mounted at /api/v1/ws)
api_router.include_router(ws_router)