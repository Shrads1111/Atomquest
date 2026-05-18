import os
import sys
sys.modules['google._upb._message'] = None
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

import unittest

import json
from app import app

from services.score_service import ScoreService

class BackendVerificationTest(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        """
        1. Verify API server health checks.
        """
        res = self.app.get("/health")
        data = json.loads(res.data)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "GoalSync Compliance Core")

    def test_mock_auth_employee(self):
        """
        2. Test Auth middleware role wrappers utilizing mock headers.
        """
        res = self.app.get(
            "/api/me",
            headers={
                "X-Mock-UID": "test_emp_001",
                "X-Mock-Role": "employee",
                "X-Mock-Name": "Jane Doe"
            }
        )
        data = json.loads(res.data)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(data["uid"], "test_emp_001")
        self.assertEqual(data["role"], "employee")
        self.assertEqual(data["name"], "Jane Doe")

    def test_mock_auth_manager_access_forbidden(self):
        """
        3. Ensure role-based access block works as designed.
        """
        # Admin directory is restricted to managers/admins
        res = self.app.get(
            "/api/escalations",
            headers={
                "X-Mock-UID": "test_emp_001",
                "X-Mock-Role": "employee" # Employee is NOT allowed
            }
        )
        self.assertEqual(res.status_code, 403)

    def test_score_service_calculations(self):
        """
        4. Test UoM calculations (Min, Max, Zero-based).
        """
        # Standard Numeric progress
        self.assertEqual(ScoreService.calculate_progress("numeric", 100, 75), 75.0)
        self.assertEqual(ScoreService.calculate_progress("numeric", 100, 120), 100.0) # clamped max
        
        # Zero-based progress (failure vectors)
        self.assertEqual(ScoreService.calculate_progress("zero-based", 1, 0), 100.0) # 0 failures = 100%
        self.assertEqual(ScoreService.calculate_progress("zero-based", 1, 3), 0.0) # >0 failures = 0%
        
        # Timeline progress
        self.assertEqual(ScoreService.calculate_progress("timeline", 100, 100), 100.0)

if __name__ == "__main__":
    print("Executing Backend Verification Test Suite...")
    unittest.main()
