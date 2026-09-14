# Shared types used across multiple schema files.
# These are reusable "building blocks" — like Username, Password, Dimension.
#
# In Express project (types/index.ts), all types were in one file.
# Here we extract the shared ones so auth.py, space.py, etc. can import them.

from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints


# ── Reusable Type Aliases ────────────────────────────────────────────

Username = Annotated[
    str,
    StringConstraints(min_length=3, max_length=30, strip_whitespace=True),
]
# Username must be 3-30 chars. strip_whitespace removes leading/trailing spaces.
# Example: "  harkirat  " becomes "harkirat" (6 chars — valid).

Password = Annotated[str, StringConstraints(min_length=6, max_length=100)]
# Password must be 6-100 chars. We validate length here; hashing is done in security.py.

Dimension = Annotated[str, Field(pattern=r"^[0-9]{1,4}x[0-9]{1,4}$")]
# Dimension string like "100x200". Used in CreateSpace and CreateMap schemas.
# The regex ensures exactly "WIDTHxHEIGHT" with 1-4 digit numbers.


# ── Shared Response Models ───────────────────────────────────────────

class MessageResponse(BaseModel):
    """Generic response with just a message field.

    Example: {"message": "Metadata updated successfully"}
    """
    message: str
