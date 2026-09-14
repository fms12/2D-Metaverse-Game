# CRUD package — all database operations live here.
# This is the layer that does NOT exist in hkirat's Express project.
#
# In the Express project, all Prisma queries (client.user.create, client.space.findFirst, etc.)
# are written directly inside the route handlers.
#
# We're adding this layer because it's the FastAPI fullstack best practice:
# - Routes stay thin (just validate → call CRUD → return response)
# - CRUD functions are reusable (routes, tests, WebSocket handlers can all call them)
# - DB logic is isolated (if you switch from Postgres to MongoDB, only CRUD files change)
