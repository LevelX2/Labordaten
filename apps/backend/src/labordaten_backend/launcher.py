from __future__ import annotations

import os
import shutil
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from datetime import datetime
from pathlib import Path


APP_NAME = "Labordaten"
DEFAULT_PORT = 8765


def main() -> int:
    paths = _resolve_paths()
    paths.data_root.mkdir(parents=True, exist_ok=True)
    paths.documents_root.mkdir(parents=True, exist_ok=True)
    _copy_initial_knowledge_if_needed(paths)

    preferred_base_url = f"http://127.0.0.1:{DEFAULT_PORT}"
    if _is_labordaten_running(preferred_base_url):
        _open_browser(preferred_base_url)
        return 0

    port = _select_port(DEFAULT_PORT)
    base_url = f"http://127.0.0.1:{port}"
    _configure_environment(paths, port)
    _run_migrations(paths)
    _start_server(base_url, port)
    return 0


class ReleasePaths:
    def __init__(self, *, app_root: Path, resource_root: Path, data_root: Path) -> None:
        self.app_root = app_root
        self.resource_root = resource_root
        self.data_root = data_root
        self.database_path = data_root / "labordaten.db"
        self.documents_root = data_root / "documents"
        self.knowledge_root = data_root / "Labordaten-Wissen"
        self.runtime_settings_file = data_root / "labordaten.runtime.json"
        self.frontend_root = _first_existing(resource_root / "frontend", app_root / "apps" / "frontend" / "dist")
        self.alembic_ini = _first_existing(resource_root / "alembic.ini", app_root / "apps" / "backend" / "alembic.ini")
        self.migrations_root = _first_existing(resource_root / "migrations", app_root / "apps" / "backend" / "migrations")
        self.bundled_knowledge_root = _first_existing(resource_root / "Labordaten-Wissen", app_root / "Labordaten-Wissen")


def _resolve_paths() -> ReleasePaths:
    if getattr(sys, "frozen", False):
        app_root = Path(sys.executable).resolve().parent
        resource_root = Path(getattr(sys, "_MEIPASS", app_root)).resolve()
    else:
        app_root = Path(__file__).resolve().parents[4]
        resource_root = app_root

    configured_data_root = os.environ.get("LABORDATEN_DATA_DIR")
    data_root = Path(configured_data_root).expanduser() if configured_data_root else _default_data_root()
    return ReleasePaths(app_root=app_root, resource_root=resource_root, data_root=data_root.resolve())


def _default_data_root() -> Path:
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / APP_NAME
    return Path.home() / "AppData" / "Local" / APP_NAME


def _first_existing(*candidates: Path) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def _copy_initial_knowledge_if_needed(paths: ReleasePaths) -> None:
    if paths.knowledge_root.exists() or not paths.bundled_knowledge_root.exists():
        return
    shutil.copytree(paths.bundled_knowledge_root, paths.knowledge_root)


def _configure_environment(paths: ReleasePaths, port: int) -> None:
    database_url = f"sqlite:///{paths.database_path.as_posix()}"
    os.environ["LABORDATEN_ENVIRONMENT"] = "production"
    os.environ["LABORDATEN_DATABASE_URL"] = database_url
    os.environ["LABORDATEN_DOCUMENTS_DIR"] = str(paths.documents_root)
    os.environ["LABORDATEN_RUNTIME_SETTINGS_FILE"] = str(paths.runtime_settings_file)
    os.environ["LABORDATEN_KNOWLEDGE_DIR"] = str(paths.knowledge_root)
    os.environ["LABORDATEN_FRONTEND_ORIGIN"] = f"http://127.0.0.1:{port}"
    if paths.frontend_root.exists():
        os.environ["LABORDATEN_FRONTEND_STATIC_DIR"] = str(paths.frontend_root)


def _run_migrations(paths: ReleasePaths) -> None:
    if not paths.alembic_ini.exists() or not paths.migrations_root.exists():
        raise RuntimeError("Die Datenbankmigrationen wurden im Anwendungspaket nicht gefunden.")

    from alembic import command
    from alembic.config import Config

    _backup_database_before_update(paths)
    config = Config(str(paths.alembic_ini))
    config.set_main_option("script_location", str(paths.migrations_root))
    command.upgrade(config, "head")


def _backup_database_before_update(paths: ReleasePaths) -> None:
    if not paths.database_path.exists():
        return

    from alembic.runtime.migration import MigrationContext
    from alembic.script import ScriptDirectory
    from sqlalchemy import create_engine

    config = _migration_config_for_check(paths)
    script = ScriptDirectory.from_config(config)
    engine = create_engine(os.environ["LABORDATEN_DATABASE_URL"], future=True)
    with engine.connect() as connection:
        current_revision = MigrationContext.configure(connection).get_current_revision()
    head_revision = script.get_current_head()
    if current_revision == head_revision:
        return

    backup_dir = paths.data_root / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(paths.database_path, backup_dir / f"labordaten-pre-update-{timestamp}.db")


def _migration_config_for_check(paths: ReleasePaths):
    from alembic.config import Config

    config = Config(str(paths.alembic_ini))
    config.set_main_option("script_location", str(paths.migrations_root))
    return config


def _select_port(preferred_port: int) -> int:
    if _port_available(preferred_port):
        return preferred_port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.bind(("127.0.0.1", 0))
        return int(probe.getsockname()[1])


def _port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        return probe.connect_ex(("127.0.0.1", port)) != 0


def _is_labordaten_running(base_url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{base_url}/api/system/health", timeout=1.5) as response:
            return response.status == 200 and b"Labordaten" in response.read()
    except (OSError, urllib.error.URLError):
        return False


def _start_server(base_url: str, port: int) -> None:
    import uvicorn

    config = uvicorn.Config(
        "labordaten_backend.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=False,
    )
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, name="labordaten-server", daemon=True)
    server_thread.start()

    if _wait_until_ready(base_url):
        _open_browser(base_url)
    else:
        print("Labordaten wurde gestartet, hat aber noch keine Startseite gemeldet.")
        print(base_url)

    try:
        while server_thread.is_alive():
            time.sleep(0.5)
    except KeyboardInterrupt:
        server.should_exit = True
        server_thread.join(timeout=5)


def _wait_until_ready(base_url: str) -> bool:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if _is_labordaten_running(base_url):
            return True
        time.sleep(0.5)
    return False


def _open_browser(url: str) -> None:
    if os.environ.get("LABORDATEN_NO_BROWSER") == "1":
        return
    webbrowser.open(url)


if __name__ == "__main__":
    raise SystemExit(main())
