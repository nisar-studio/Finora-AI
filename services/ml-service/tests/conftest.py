"""Shared pytest fixtures.

Sets a stable internal API key in the environment BEFORE the app settings are
first constructed, so the whole suite can exercise the real internal-key
dependency without re-instantiating `settings`.
"""

import os

os.environ.setdefault("ML_SERVICE_API_KEY", "test-ml-api-key")

TEST_API_KEY = os.environ["ML_SERVICE_API_KEY"]
API_KEY_HEADER = {"x-ml-api-key": TEST_API_KEY}