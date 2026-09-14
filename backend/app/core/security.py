# Security utilities — password hashing and JWT tokens.
# This is the FastAPI equivalent of:
#   - Express's scrypt.ts (hash/compare)
#   - Express's config.ts (JWT_PASSWORD)
#   - Express's middleware/user.ts (jwt.verify)
#
# In the Express project, these were spread across 3 files.
# Here we consolidate them into one module because they're all "security" concerns.

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


# ── Password Hashing ────────────────────────────────────────────────
# bcrypt automatically handles salting (no need to manage salt separately).
# Express project used Node's scrypt — bcrypt is the Python standard.


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt.

    Example:
        hashed = hash_password("my_secret_123")
        # hashed = "$2b$12$..."  (60-char string stored in DB)
    """
    # encode() converts string to bytes (bcrypt works with bytes).
    # bcrypt.gensalt() creates a random salt each time.
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")  # store as string in DB


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if a plain-text password matches the stored hash.

    Example:
        is_valid = verify_password("my_secret_123", user.password)
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ── JWT Tokens ───────────────────────────────────────────────────────
# JWT (JSON Web Token) is a signed string that proves who the user is.
# Express project: jwt.sign({ userId, role }, JWT_PASSWORD)
# FastAPI equivalent: create_access_token(user_id, role)


def create_access_token(user_id: str, role: str) -> str:
    """Create a JWT token containing the user's ID and role.

    The token is signed with JWT_SECRET so nobody can forge it.
    It expires after JWT_EXPIRATION_HOURS (default: 24 hours).

    Example:
        token = create_access_token("abc-123", "User")
        # token = "eyJhbGciOiJIUzI1NiIs..."
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,  # "sub" = subject = who this token belongs to
        "role": role,
        "exp": expire,  # "exp" = expiration time (auto-checked by PyJWT)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT token. Returns the payload dict.

    Raises jwt.InvalidTokenError if the token is expired, tampered, or invalid.

    Example:
        payload = decode_access_token("eyJhbGci...")
        user_id = payload["sub"]  # "abc-123"
        role = payload["role"]    # "User"
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
