from sqlalchemy.dialects.postgresql import BIT
from sqlalchemy.types import TypeDecorator


def hex_to_bits(h: str) -> str:
    n = int(h, 16)
    return format(n, "064b")


def bits_to_hex(b: str) -> str:
    n = int(b, 2)
    return f"{n:016x}"


class Hash64(TypeDecorator):
    """16-char lowercase hex in Python <-> BIT(64) in PostgreSQL."""

    impl = BIT(64)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        n = int(value, 16)
        if dialect and dialect.driver == "asyncpg":
            return n.to_bytes(8, "big")
        return format(n, "064b")

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if hasattr(value, "to_int"):
            n = value.to_int()
        elif hasattr(value, "as_string"):
            n = int(value.as_string().replace(" ", ""), 2)
        else:
            n = int(str(value), 2)
        return f"{n:016x}"
