import os
import sys

import psycopg


def main() -> int:
    try:
        url = os.getenv("MIGRATIONS_DATABASE_URL")
        if not url:
            url = os.getenv("DATABASE_URL")
        if not url:
            url = "postgresql://provnet:provnet@localhost:5432/provnet"

        # strip the +psycopg driver suffix for psycopg.connect
        conn_url = url.replace("postgresql+psycopg://", "postgresql://", 1)
        if conn_url.startswith("postgresql+asyncpg://"):
            conn_url = conn_url.replace("postgresql+asyncpg://", "postgresql://", 1)

        with psycopg.connect(conn_url) as conn:
            server_version = conn.info.server_version
            print(f"server_version: {server_version}")

            with conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
                row = cur.fetchone()
                if not row or not row[0]:
                    print("Error: pgvector extension is not installed.", file=sys.stderr)
                    return 1

                extversion = row[0]
                print(f"pgvector extversion: {extversion}")
                parts = [int(p) for p in extversion.split(".")[:3]]
                if parts < [0, 7, 0]:
                    print(f"Error: pgvector version {extversion} < 0.7.0", file=sys.stderr)
                    return 1

                b1 = "0" * 64
                b2 = "1" * 8 + "0" * 56
                cur.execute("SELECT CAST(%s AS bit(64)) <~> CAST(%s AS bit(64));", (b1, b2))
                dist_row = cur.fetchone()
                if not dist_row or int(dist_row[0]) != 8:
                    print(f"Error: expected hamming distance 8, got {dist_row}", file=sys.stderr)
                    return 1
                print(int(dist_row[0]))

                cur.execute("SELECT '[1,2,3]'::vector(3);")
                vec_row = cur.fetchone()
                if not vec_row or not vec_row[0]:
                    print(f"Error: failed vector roundtrip, got {vec_row}", file=sys.stderr)
                    return 1

                print("roundtrip ok")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"Database check failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
