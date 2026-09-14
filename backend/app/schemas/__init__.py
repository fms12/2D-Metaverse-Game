# Schemas package — Pydantic models for request/response validation.
# This is the FastAPI equivalent of Express's types/index.ts (Zod schemas).
#
# In Express: Zod validates req.body manually with .safeParse()
# In FastAPI: Pydantic validates automatically when you type-hint a route parameter.
#
# We split schemas into separate files by domain (auth, user, space, admin)
# instead of one giant file, so each route file imports only what it needs.
