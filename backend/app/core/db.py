from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings


engine = create_engine(settings.DATABASE_URL)


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        yield session


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
