import asyncio
import os
import unittest
from unittest.mock import patch, Mock
from fastapi import HTTPException
from starlette.requests import Request
from billing_access import authenticated_user, require_owner, reserve_video, settle


def request(token=""):
    return Request({"type": "http", "headers": [(b"authorization", token.encode())]})


class BillingBoundaryTests(unittest.TestCase):
    def test_missing_configuration_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException):
                asyncio.run(authenticated_user(request()))

    def test_forged_auth_rejected(self):
        with patch.dict(os.environ, {"SUPABASE_URL": "https://project.invalid", "SUPABASE_SERVICE_ROLE_KEY": "server-test-only"}):
            with patch("billing_access.requests.get", return_value=Mock(status_code=401)):
                with self.assertRaises(HTTPException):
                    asyncio.run(authenticated_user(request("Bearer forged")))

    def test_owner_is_required_even_for_known_job(self):
        require_owner({"owner_id": "user-a"}, "user-a")
        with self.assertRaises(HTTPException):
            require_owner({"owner_id": "user-a"}, "user-b")
        with self.assertRaises(HTTPException):
            require_owner({}, "user-a")

    def test_backend_supplies_actual_metadata_and_trusted_tool(self):
        with patch("billing_access._call", return_value={"id": "job"}) as call:
            asyncio.run(reserve_video(request("Bearer verified-token"), "retry-key", {"bytes": 500, "duration_seconds": 10, "width": 640, "height": 480}))
            self.assertEqual(call.call_args.args[0], "reserve")
            self.assertEqual(call.call_args.args[1]["metadata"]["duration_seconds"], 10)
            self.assertEqual(call.call_args.args[1]["tool"], "video-watermark-remover")

    def test_expired_success_is_not_exposed(self):
        with patch("billing_access._call", return_value={"success": False}):
            with self.assertRaises(HTTPException):
                asyncio.run(settle("job", True))
            asyncio.run(settle("job", False, "processing_failed"))


if __name__ == "__main__":
    unittest.main()
