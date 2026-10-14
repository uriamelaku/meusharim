from sqlalchemy import create_engine

from app.config import settings

# prepare_threshold=None: Supabase's transaction-mode pooler does not support
# prepared statements. Harmless on a direct local connection.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"prepare_threshold": None},
)
