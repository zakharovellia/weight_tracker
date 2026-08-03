import os
import asyncpg

_pool: asyncpg.Pool | None = None


async def init_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        host=os.environ.get("PGHOST", "postgres.storage"),
        port=int(os.environ.get("PGPORT", "5432")),
        user=os.environ.get("PGUSER", "worker"),
        password=os.environ["PG_PASSWORD"],
        database=os.environ.get("PGDATABASE", "postgres"),
        min_size=1,
        max_size=5,
    )


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    assert _pool is not None, "Pool not initialized"
    return _pool
