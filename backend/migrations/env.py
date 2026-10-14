from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

from app.config import settings

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name, disable_existing_loggers=False)

# Migrations are plain SQL (op.execute), so there is no model metadata to autogenerate from.
target_metadata = None


def run_migrations_online() -> None:
    url = context.config.get_main_option("sqlalchemy.url") or settings.database_url
    engine = create_engine(url, connect_args={"prepare_threshold": None})
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


run_migrations_online()
