# ==============================================================================
# TEST UTILITIES: General Helper Functions
# ==============================================================================
#
# LEARNING NOTE FOR BEGINNERS:
# When writing automated tests, you often need to generate test data (like unique
# usernames, emails, or formatted headers).
# Instead of copying and pasting string generation code in every test file,
# we place reusable helpers in this `utils` directory.
# ==============================================================================

import random
import string


def random_lower_string(length: int = 10) -> str:
    """Generate a random lowercase string of letters and digits.

    WHY WE USE THIS IN TESTS:
    In our database, usernames must be unique (User.username has unique=True).
    If you hardcode a username like "testuser", the first test might pass,
    but the second test will fail with "User already exists"!
    Using a random string (e.g. "user_k8m2p9") ensures every single test runs
    with brand-new, non-conflicting data.

    Example:
        username = f"user_{random_lower_string(8)}"  # -> "user_a9f2bc1d"
    """
    letters = string.ascii_lowercase + string.digits
    return "".join(random.choice(letters) for _ in range(length))


def get_auth_header(token: str) -> dict[str, str]:
    """Format a JWT token into the HTTP Authorization header dictionary.

    WHY WE USE THIS IN TESTS:
    Protected endpoints require an HTTP header in this exact format:
        Authorization: Bearer <jwt_token>
    This helper saves us from typing this dictionary over and over again.

    Example:
        headers = get_auth_header("eyJhbGciOi...")
        # Returns: {"Authorization": "Bearer eyJhbGciOi..."}
    """
    return {"Authorization": f"Bearer {token}"}

