from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def load_models() -> None:
    # Ensures model classes are registered on the metadata.
    from app import models  # noqa: F401


load_models()
