# ==============================================================================
# CONFTEST.PY: The Heart of Pytest Configuration & Shared Fixtures
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# -----------------------------
# 1. WHAT IS CONFTEST.PY?
#    In pytest, any file named `conftest.py` is automatically loaded before any test runs.
#    Functions decorated with `@pytest.fixture` in this file are available to EVERY test
#    file without needing to write `import ...`!
#
# 2. WHAT IS A FIXTURE (@pytest.fixture)?
#    A fixture is a setup-and-teardown function. Think of it like preparing the kitchen
#    before cooking (setup) and washing the dishes afterwards (teardown).
#    When a test function lists a fixture name in its arguments:
#        def test_something(client, session):
#    pytest runs the `client` and `session` fixtures first, passes their results to the test,
#    and then cleans them up when the test finishes.
#
# 3. WHAT IS `yield` IN A FIXTURE?
#    Code BEFORE `yield` runs BEFORE the test (Setup).
#    Code AFTER `yield` runs AFTER the test completes (Teardown / Cleanup).
#
# 4. HOW DOES DOCKER POSTGRES TESTING WORK?
#    We connect to your Docker PostgreSQL database (`DATABASE_URL`).
#    We create the tables with `SQLModel.metadata.create_all(engine)`.
#    FastAPI's dependency injection (`app.dependency_overrides`) replaces the normal
#    database session with our test session!
#    If Docker Postgres is ever offline, we provide an automatic SQLite fallback so
#    your tests can run anywhere.
# ==============================================================================

from collections.abc import Generator
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.db import get_session
from app.main import app
from app.models import User
from tests.utils.user import create_random_user, get_user_auth_headers


# ------------------------------------------------------------------------------
# Fixture 1: Database Engine (Connects to Docker Postgres)
# ------------------------------------------------------------------------------
@pytest.fixture(scope="session")
def db_engine():
    """Create the database engine once for the entire test session.

    `scope="session"` means this engine is created ONCE at the start of pytest,
    rather than reconnecting on every single individual test function.
    """
    try:
        # Connect to your Docker PostgreSQL container
        engine = create_engine(settings.DATABASE_URL)
        # Test the connection to ensure Docker Postgres is up
        with engine.connect() as conn:
            pass
        # Ensure all tables exist in PostgreSQL
        SQLModel.metadata.create_all(engine)
        return engine
    except Exception as exc:
        # Fallback to in-memory SQLite if Docker is not currently running
        print(f"\n[NOTICE] Docker Postgres connection failed ({exc}). Using in-memory SQLite for tests.")
        sqlite_engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(sqlite_engine)
        return sqlite_engine


# ------------------------------------------------------------------------------
# Fixture 2: Database Session for each test
# ------------------------------------------------------------------------------
@pytest.fixture(name="session")
def session_fixture(db_engine) -> Generator[Session, None, None]:
    """Provide a clean, isolated database Session for each test function.

    LEARNING NOTE:
    Every test gets its own fresh `with Session(db_engine)` block.
    When the test ends, the session closes automatically.
    """
    with Session(db_engine) as session:
        yield session
        # Any cleanup after the test runs here


# ------------------------------------------------------------------------------
# Fixture 3: TestClient (Simulates the browser/frontend)
# ------------------------------------------------------------------------------
@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    """Create a FastAPI TestClient that uses our test database session.

    LEARNING NOTE:
    1. WHAT IS TestClient?
       FastAPI provides `TestClient(app)`. It simulates sending real HTTP requests
       (GET, POST, PUT, DELETE) to your API without needing to start a live Uvicorn
       server on port 8000. It is fast and runs completely in Python memory.

    2. WHAT IS `app.dependency_overrides`?
       Remember `SessionDep` in our route handlers? Normally it calls `get_session()`
       to connect to PostgreSQL.
       Here, we tell FastAPI:
       "Whenever any API route asks for `get_session`, give it our test `session` instead!"
       This is the true superpower of FastAPI's Dependency Injection.
    """
    def get_session_override():
        return session

    # Override the real DB dependency with our test session
    app.dependency_overrides[get_session] = get_session_override

    # Create the test client
    with TestClient(app) as client:
        yield client

    # Clean up: restore original dependencies after the test completes
    app.dependency_overrides.clear()


# ------------------------------------------------------------------------------
# Fixture 4: A pre-created Normal User & Authorization Headers
# ------------------------------------------------------------------------------
@pytest.fixture
def normal_user(session: Session) -> User:
    """Fixture that creates and returns a regular test user in the database."""
    user, _ = create_random_user(session=session, role="user")
    return user


@pytest.fixture
def normal_user_headers(normal_user: User) -> dict[str, str]:
    """Fixture that returns valid JWT Authorization headers for the normal test user.

    Usage in tests:
        def test_my_route(client, normal_user_headers):
            response = client.get("/api/v1/space/all", headers=normal_user_headers)
    """
    return get_user_auth_headers(normal_user)


# ------------------------------------------------------------------------------
# Fixture 5: A pre-created Admin User & Authorization Headers
# ------------------------------------------------------------------------------
@pytest.fixture
def admin_user(session: Session) -> User:
    """Fixture that creates and returns an admin user in the database."""
    user, _ = create_random_user(session=session, role="admin")
    return user


@pytest.fixture
def admin_user_headers(admin_user: User) -> dict[str, str]:
    """Fixture that returns valid JWT Authorization headers for the admin test user.

    Usage in tests:
        def test_admin_route(client, admin_user_headers):
            response = client.post("/api/v1/admin/element", headers=admin_user_headers, json=...)
    """
    return get_user_auth_headers(admin_user)

