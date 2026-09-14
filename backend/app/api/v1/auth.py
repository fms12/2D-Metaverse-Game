# Auth routes — signup and signin (no auth required).
#
# Express equivalent: routes/v1/index.ts (the signup and signin handlers)
# These are the only routes that DON'T need a Bearer token.
#
# In the Express project, signup and signin were in the root v1/index.ts
# along with the router.use() calls for sub-routers.
# In FastAPI, we give them their own file for clean separation.

from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep
from app.core.security import create_access_token, verify_password
from app.crud.user import create_user, get_user_by_username
from app.schemas.auth import SigninRequest, SigninResponse, SignupRequest, SignupResponse

router = APIRouter(tags=["Auth"])


@router.post("/signup", response_model=SignupResponse)
async def signup(payload: SignupRequest, session: SessionDep):
    """Register a new user.

    Express equivalent (routes/v1/index.ts):
        router.post("/signup", async (req, res) => {
            const parsedData = SignupSchema.safeParse(req.body)
            const hashedPassword = await hash(parsedData.data.password)
            const user = await client.user.create({ data: { username, password: hashedPassword, role } })
            res.json({ userId: user.id })
        })

    FastAPI differences:
    - Validation is automatic (SignupRequest type hint = Zod's .safeParse())
    - Password hashing is inside crud.create_user() instead of inline
    - response_model=SignupResponse ensures only {userId} is returned
    """
    user = create_user(session, payload.username, payload.password, payload.type)
    return SignupResponse(userId=user.id)


@router.post("/signin", response_model=SigninResponse)
async def signin(payload: SigninRequest, session: SessionDep):
    """Authenticate and get a JWT token.

    Express equivalent (routes/v1/index.ts):
        router.post("/signin", async (req, res) => {
            const parsedData = SigninSchema.safeParse(req.body)
            const user = await client.user.findUnique({ where: { username } })
            const isValid = await compare(parsedData.data.password, user.password)
            const token = jwt.sign({ userId: user.id, role: user.role }, JWT_PASSWORD)
            res.json({ token })
        })
    """
    user = get_user_by_username(session, payload.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid username or password",
        )

    if not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid username or password",
        )

    token = create_access_token(user.id, user.role.value)
    return SigninResponse(token=token)
