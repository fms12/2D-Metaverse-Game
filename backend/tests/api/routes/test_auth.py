# ==============================================================================
# TESTS: Authentication API Routes (/api/v1/signup & /api/v1/signin)
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# -----------------------------
# 1. WHAT ARE "HAPPY PATH" AND "SAD PATH" TESTS?
#    - Happy Path: Testing that the API works when the user does everything right
#      (e.g. valid username, good password -> 200 OK + userId).
#    - Sad Path (Negative Tests): Testing that the API correctly catches and rejects
#      invalid actions (e.g. duplicate username -> 400 Bad Request, wrong password -> 403,
#      invalid JSON shape -> 422 Unprocessable Entity).
#
# 2. WHAT IS `assert`?
#    `assert` is Python's built-in check. If the condition is True, the test passes.
#    If the condition is False, the test immediately fails with an error and stops.
#    Example:
#        assert response.status_code == 200
#
# 3. WHAT IS `response.json()`?
#    The response from `client.post(...)` contains HTTP headers, status code, and body.
#    Calling `response.json()` converts the JSON text returned by the server into a
#    Python dictionary so we can inspect its fields like `data["userId"]` or `data["token"]`.
# ==============================================================================

from fastapi.testclient import TestClient
from tests.utils.utils import random_lower_string


# ------------------------------------------------------------------------------
# Test Suite 1: POST /api/v1/signup
# ------------------------------------------------------------------------------

def test_signup_success(client: TestClient) -> None:
    """TEST: Successful signup of a normal user.

    LEARNING NOTE:
    1. WHAT WE TEST: A new user registering with a valid username, password, and type.
    2. EXPECTED RESULT:
       - Status Code: 200 OK
       - Body contains: "userId" string
       - Password is NOT leaked in the response.
    """
    username = f"user_{random_lower_string(8)}"
    password = "securePassword123"

    # 1. Send simulated POST request to /api/v1/signup
    response = client.post(
        "/api/v1/signup",
        json={
            "username": username,
            "password": password,
            "type": "user",
        },
    )

    # 2. Check HTTP status code
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    # 3. Verify response JSON data
    data = response.json()
    assert "userId" in data, "Response should contain 'userId'"
    assert isinstance(data["userId"], str), "'userId' must be a string (UUID)"
    assert "password" not in data, "Security risk: Never return the password in response!"


def test_signup_admin_success(client: TestClient) -> None:
    """TEST: Successful signup of an admin user (type="admin").

    LEARNING NOTE:
    We test that `type: "admin"` correctly creates an admin user in the system.
    """
    username = f"admin_{random_lower_string(8)}"
    response = client.post(
        "/api/v1/signup",
        json={
            "username": username,
            "password": "adminPassword123",
            "type": "admin",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "userId" in data


def test_signup_duplicate_username_fails(client: TestClient) -> None:
    """TEST (Sad Path): Trying to register with an already-taken username must fail.

    LEARNING NOTE:
    If two users try to register with the same username "harkirat", the second one
    MUST receive HTTP 400 Bad Request. We test that our database uniqueness check works!
    """
    username = f"user_{random_lower_string(8)}"
    payload = {"username": username, "password": "password123", "type": "user"}

    # First registration succeeds
    res1 = client.post("/api/v1/signup", json=payload)
    assert res1.status_code == 200

    # Second registration with the EXACT same username must fail!
    res2 = client.post("/api/v1/signup", json=payload)
    assert res2.status_code == 400, "Duplicate username should return HTTP 400"
    assert "already exists" in res2.json()["detail"].lower()


def test_signup_short_password_fails_validation(client: TestClient) -> None:
    """TEST (Sad Path): Short passwords (< 6 chars) must be rejected by Pydantic.

    LEARNING NOTE:
    Notice we expect HTTP 422 (Unprocessable Entity).
    This proves that Pydantic validated the data before any database query ran!
    """
    username = f"user_{random_lower_string(8)}"
    response = client.post(
        "/api/v1/signup",
        json={
            "username": username,
            "password": "123",  # Too short! Schema requires min_length=6
            "type": "user",
        },
    )

    assert response.status_code == 422, "Pydantic validation error should return HTTP 422"


# ------------------------------------------------------------------------------
# Test Suite 2: POST /api/v1/signin
# ------------------------------------------------------------------------------

def test_signin_success(client: TestClient) -> None:
    """TEST: Successful login returns a valid JWT token.

    LEARNING NOTE:
    1. First we create a user via /signup.
    2. Then we log in via /signin with the exact same username & password.
    3. We assert that:
       - Status is 200 OK
       - A "token" field is returned
       - The token is a non-empty string (JWT)
    """
    username = f"user_{random_lower_string(8)}"
    password = "mySecretPassword123"

    # Step 1: Register the user
    signup_res = client.post(
        "/api/v1/signup",
        json={"username": username, "password": password, "type": "user"},
    )
    assert signup_res.status_code == 200

    # Step 2: Sign in with the credentials
    signin_res = client.post(
        "/api/v1/signin",
        json={"username": username, "password": password},
    )
    assert signin_res.status_code == 200

    data = signin_res.json()
    assert "token" in data, "Successful signin must return 'token'"
    assert isinstance(data["token"], str)
    assert len(data["token"]) > 20, "Token should be a long JWT string"


def test_signin_wrong_password_fails(client: TestClient) -> None:
    """TEST (Sad Path): Logging in with the wrong password must be rejected.

    LEARNING NOTE:
    Security best practice: When a password is wrong, the server returns HTTP 403
    (Forbidden) or 401 (Unauthorized) with generic "Invalid username or password".
    """
    username = f"user_{random_lower_string(8)}"
    real_password = "realPassword123"

    # Register user
    client.post(
        "/api/v1/signup",
        json={"username": username, "password": real_password, "type": "user"},
    )

    # Try signing in with WRONG password
    response = client.post(
        "/api/v1/signin",
        json={"username": username, "password": "WRONG_PASSWORD"},
    )
    assert response.status_code == 403, "Wrong password must return HTTP 403"
    assert "Invalid username or password" in response.json()["detail"]


def test_signin_nonexistent_user_fails(client: TestClient) -> None:
    """TEST (Sad Path): Logging in with a username that doesn't exist must fail.

    LEARNING NOTE:
    Notice that the error message is IDENTICAL to the wrong password error.
    This prevents attackers from guessing which usernames exist in our database.
    """
    response = client.post(
        "/api/v1/signin",
        json={"username": "non_existent_ghost_user", "password": "anyPassword123"},
    )
    assert response.status_code == 403
    assert "Invalid username or password" in response.json()["detail"]

