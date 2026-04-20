from __future__ import annotations

import json
import socket
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4


LOCK_FILENAME = ".labordaten.lock.json"
HEARTBEAT_INTERVAL_SECONDS = 30
STALE_AFTER_SECONDS = 120


@dataclass
class LockRecord:
    instance_id: str
    hostname: str
    pid: int
    acquired_at: str
    heartbeat_at: str


class SingleUserLockManager:
    def __init__(self, data_path: str) -> None:
        self.instance_id = str(uuid4())
        self.hostname = socket.gethostname()
        self.pid = _current_pid()
        self._data_path = Path(data_path).expanduser().resolve()
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._state_lock = threading.Lock()
        self._status = "uninitialized"
        self._message = "Sperre noch nicht initialisiert."

    @property
    def lock_path(self) -> Path:
        return self._data_path / LOCK_FILENAME

    def start(self) -> None:
        self._data_path.mkdir(parents=True, exist_ok=True)
        self._acquire_or_conflict()
        self._thread = threading.Thread(target=self._heartbeat_loop, name="labordaten-lock-heartbeat", daemon=True)
        self._thread.start()

    def shutdown(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
        self.release()

    def refresh(self) -> None:
        with self._state_lock:
            if self._status != "active":
                return
        record = self._read_record()
        if record is None or record.instance_id != self.instance_id:
            with self._state_lock:
                self._status = "conflict"
                self._message = "Die Sperre wurde von einer anderen Instanz übernommen."
            return
        self._write_record(self._new_record(acquired_at=record.acquired_at))

    def release(self) -> None:
        record = self._read_record()
        if record is not None and record.instance_id == self.instance_id and self.lock_path.exists():
            self.lock_path.unlink(missing_ok=True)
        with self._state_lock:
            if self._status == "active":
                self._status = "released"
                self._message = "Sperre wurde freigegeben."

    def reset(self) -> None:
        self._data_path.mkdir(parents=True, exist_ok=True)
        self._write_record(self._new_record())
        with self._state_lock:
            self._status = "active"
            self._message = "Sperre wurde kontrolliert zurückgesetzt."

    def reconfigure(self, data_path: str) -> None:
        old_path = self.lock_path
        old_record = self._read_record()
        if old_record is not None and old_record.instance_id == self.instance_id and old_path.exists():
            old_path.unlink(missing_ok=True)
        self._data_path = Path(data_path).expanduser().resolve()
        self._data_path.mkdir(parents=True, exist_ok=True)
        self._acquire_or_conflict()

    def status_payload(self) -> dict[str, object]:
        record = self._read_record()
        stale = self._is_stale(record) if record is not None else False
        with self._state_lock:
            return {
                "status": self._status,
                "message": self._message,
                "instance_id": self.instance_id,
                "lock_path": str(self.lock_path),
                "owner_hostname": record.hostname if record is not None else None,
                "owner_pid": record.pid if record is not None else None,
                "acquired_at": record.acquired_at if record is not None else None,
                "heartbeat_at": record.heartbeat_at if record is not None else None,
                "stale": stale,
            }

    def is_conflicted(self) -> bool:
        with self._state_lock:
            return self._status == "conflict"

    def _heartbeat_loop(self) -> None:
        while not self._stop_event.wait(HEARTBEAT_INTERVAL_SECONDS):
            self.refresh()

    def _acquire_or_conflict(self) -> None:
        record = self._read_record()
        if record is None or record.instance_id == self.instance_id or self._is_stale(record):
            self._write_record(self._new_record(acquired_at=record.acquired_at if record and record.instance_id == self.instance_id else None))
            with self._state_lock:
                self._status = "active"
                self._message = "Sperre aktiv."
            return

        with self._state_lock:
            self._status = "conflict"
            self._message = f"Datenbasis wird bereits von {record.hostname} (PID {record.pid}) verwendet."

    def _new_record(self, *, acquired_at: str | None = None) -> LockRecord:
        now = _utcnow_iso()
        return LockRecord(
            instance_id=self.instance_id,
            hostname=self.hostname,
            pid=self.pid,
            acquired_at=acquired_at or now,
            heartbeat_at=now,
        )

    def _read_record(self) -> LockRecord | None:
        if not self.lock_path.exists():
            return None
        try:
            payload = json.loads(self.lock_path.read_text(encoding="utf-8"))
            return LockRecord(**payload)
        except Exception:  # noqa: BLE001
            return None

    def _write_record(self, record: LockRecord) -> None:
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)
        self.lock_path.write_text(json.dumps(asdict(record), ensure_ascii=False, indent=2), encoding="utf-8")

    def _is_stale(self, record: LockRecord | None) -> bool:
        if record is None:
            return False
        try:
            heartbeat = datetime.fromisoformat(record.heartbeat_at)
        except ValueError:
            return True
        return heartbeat < datetime.now(timezone.utc) - timedelta(seconds=STALE_AFTER_SECONDS)


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _current_pid() -> int:
    import os

    return os.getpid()
