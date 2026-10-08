import hashlib
import json
import logging
from typing import Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)

class CacheService:
    """
    Result caching based on SHA-256 hash of (input_bytes + params).
    Prevents redundant GPU computation on identical inputs.
    """
    def __init__(self):
        self._memory_cache = {}

    def compute_hash(self, file_path_or_bytes: Any, **params) -> str:
        h = hashlib.sha256()
        if isinstance(file_path_or_bytes, (str, Path)):
            with open(file_path_or_bytes, "rb") as f:
                while chunk := f.read(65536):
                    h.update(chunk)
        elif isinstance(file_path_or_bytes, bytes):
            h.update(file_path_or_bytes)

        # Hash normalized params
        sorted_params = json.dumps(params, sort_keys=True)
        h.update(sorted_params.encode("utf-8"))
        return h.hexdigest()

    def get(self, cache_key: str) -> Optional[dict]:
        return self._memory_cache.get(cache_key)

    def set(self, cache_key: str, data: dict):
        self._memory_cache[cache_key] = data

cache_service = CacheService()
