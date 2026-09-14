# Application entry point — creates the FastAPI app and mounts the API router.
#
# Express equivalent (index.ts):
#   const app = express()
#   app.use(express.json())
#   app.use("/api/v1", router)
#
# Key fix: Previously the router was mounted TWICE (at /api and /api/v1).
# Now it's mounted once at /api/v1, matching the Express project exactly.

from fastapi import FastAPI
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.api.v1.ws import router as ws_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Custom validation exception handler:
# In FastAPI, Pydantic validation errors return HTTP 422 by default.
# The reference Express project and its test suite expect HTTP 400 when fields are invalid/missing.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"message": "Validation failed", "detail": exc.errors()},
    )

app.add_middleware(
    CORSMiddleware,# In production, restrict to your frontend domain
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routes under /api/v1 — same as Express's app.use("/api/v1", router)
# Mount all HTTP and WebSocket routes under /api/v1 (e.g. ws://localhost:8000/api/v1/ws)
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount WebSocket router at root level (ws://localhost:8000/ws) for convenience
app.include_router(ws_router)