import sys
sys.modules['google._upb._message'] = None
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth

def seed_database():
    print("[START] Starting GoalSync Nexus Firestore Seeder...")

    # Set up credentials path
    cred_path = "firebase-key.json"
    if not os.path.exists(cred_path):
        print(f"[ERROR] Firebase Service Account Key not found at: {os.path.abspath(cred_path)}")
        print("Please place your firebase-key.json in the backend/ directory.")
        sys.exit(1)

    print(f"[KEY] Initializing Firebase with certificate: {cred_path}")
    cred = credentials.Certificate(cred_path)
    
    try:
        firebase_admin.initialize_app(cred)
    except ValueError:
        print("[INFO] Firebase already initialized. Using current session.")

    db = firestore.client()
    print("[DB] Connected to Cloud Firestore successfully!\n")

    # 1. Clear existing seed data to ensure a fresh, clean state (Optional/Safe)
    print("[CLEAN] Cleaning existing active telemetry seeds...")
    collections_to_clean = ["users", "cycles", "goal_sheets", "goals", "checkins", "audit_logs", "notifications"]
    for coll_name in collections_to_clean:
        docs = db.collection(coll_name).get()
        if docs:
            print(f"  - Deleting {len(docs)} documents from '{coll_name}'")
            for doc in docs:
                doc.reference.delete()

    print("\n[SEED] Seeding Corporate Identity Directory ('users' collection)...")
    users = {
        "m-01": {
            "name": "Aria Chen",
            "role": "manager",
            "email": "aria.chen@company.com",
            "employeeId": "EMP-8888",
            "department": "Core R&D Labs",
            "managerId": "None"
        },
        "e-01": {
            "name": "Sarah Jenkins",
            "role": "employee",
            "email": "sarah.j@company.com",
            "employeeId": "EMP-1001",
            "department": "Core R&D Labs",
            "managerId": "m-01"
        },
        "e-02": {
            "name": "David Kross",
            "role": "employee",
            "email": "david.k@company.com",
            "employeeId": "EMP-1002",
            "department": "Operations Engine",
            "managerId": "m-01"
        },
        "e-03": {
            "name": "Elena Rostova",
            "role": "employee",
            "email": "elena.r@company.com",
            "employeeId": "EMP-1003",
            "department": "Governance & Security",
            "managerId": "m-01"
        },
        "a-01": {
            "name": "Marcus Vance",
            "role": "admin",
            "email": "marcus.v@company.com",
            "employeeId": "EMP-9999",
            "department": "Corporate Governance",
            "managerId": "None"
        }
    }

    for uid, u_data in users.items():
        db.collection("users").document(uid).set(u_data)
        print(f"  + Seeded user document in Firestore: {u_data['name']} ({u_data['role']})")
        
        # Seed Firebase Auth Directory
        try:
            auth.get_user(uid)
            print(f"    - Auth account already exists in Firebase.")
        except auth.UserNotFoundError:
            try:
                auth.create_user(
                    uid=uid,
                    email=u_data["email"],
                    password="Password123!",
                    display_name=u_data["name"]
                )
                print(f"    + Created matching Auth account in Firebase with default password.")
            except Exception as e:
                # If email already registered to a different user, log it
                print(f"    - Notice creating auth user: {str(e)}")

    print("\n[SEED] Seeding Active Governance Cycle Settings ('cycles' collection)...")
    default_cycle = {
        "name": "Q3 2026 Cycle",
        "startDate": "2026-05-01",
        "endDate": "2026-08-31",
        "status": "open",
        "phase": "tracking"
    }
    db.collection("cycles").document("q3_2026").set(default_cycle)
    print("  + Seeded cycle: q3_2026 (Tracking Phase Active)")

    print("\n[SEED] Seeding Goal Sheets ('goal_sheets' collection)...")
    sheets = {
        "sheet_e01": {
            "employeeId": "e-01",
            "cycleId": "q3_2026",
            "lockStatus": "locked",
            "totalWeightage": 100.0,
            "status": "Approved",
            "approvedBy": "m-01",
            "approvedAt": "2026-05-05T14:00:00Z"
        },
        "sheet_e02": {
            "employeeId": "e-02",
            "cycleId": "q3_2026",
            "lockStatus": "unlocked",
            "totalWeightage": 100.0,
            "status": "Pending Review",
            "approvedBy": None,
            "approvedAt": None
        },
        "sheet_e03": {
            "employeeId": "e-03",
            "cycleId": "q3_2026",
            "lockStatus": "unlocked",
            "totalWeightage": 100.0,
            "status": "Draft",
            "approvedBy": None,
            "approvedAt": None
        }
    }

    for sid, s_data in sheets.items():
        db.collection("goal_sheets").document(sid).set(s_data)
        print(f"  + Seeded goal sheet for: {s_data['employeeId']} ({s_data['status']})")

    print("\n[SEED] Seeding Objective Targets & KPI Weights ('goals' collection)...")
    goals = {
        "g-01": {
            "sheetId": "sheet_e01",
            "title": "Optimize Kubernetes Cluster Scaling Vectors",
            "thrustArea": "Infrastructure Resiliency",
            "uom": "percentage",
            "target": 100.0,
            "weightage": 35.0,
            "description": "Improve HPA scale efficiency and cluster resilience to traffic peaks.",
            "achieved": 92.0,
            "progress": 92.0,
            "status": "On Track",
            "isShared": False,
            "sharedGoalId": None
        },
        "g-02": {
            "sheetId": "sheet_e01",
            "title": "Reduce Platform Database Query Latency by 40%",
            "thrustArea": "Operational Velocity",
            "uom": "percentage",
            "target": 100.0,
            "weightage": 40.0,
            "description": "Profile, analyze, and index slow-running corporate query transaction metrics.",
            "achieved": 80.0,
            "progress": 80.0,
            "status": "On Track",
            "isShared": False,
            "sharedGoalId": None
        },
        "g-03": {
            "sheetId": "sheet_e01",
            "title": "Draft Annual SOC-2 Security Compliance Manual",
            "thrustArea": "Governance & Risk Assurance",
            "uom": "timeline",
            "target": 1.0,
            "weightage": 25.0,
            "description": "Formulate strict corporate authorization guidelines and firewall rules.",
            "achieved": 1.0,
            "progress": 100.0,
            "status": "Completed",
            "isShared": False,
            "sharedGoalId": None
        },
        "g-04": {
            "sheetId": "sheet_e02",
            "title": "Scale Platform API Throughput by 2.5x",
            "thrustArea": "Advanced Core Architecture",
            "uom": "numeric",
            "target": 5000.0,
            "weightage": 40.0,
            "description": "Implement enterprise Redis caching layers, CDN proxies, and robust load balancing.",
            "achieved": 3500.0,
            "progress": 70.0,
            "status": "On Track",
            "isShared": False,
            "sharedGoalId": None
        },
        "g-05": {
            "sheetId": "sheet_e02",
            "title": "Maintain 99.99% Infrastructure Uptime Guarantee",
            "thrustArea": "Infrastructure Resiliency",
            "uom": "zero-based",
            "target": 0.0,
            "weightage": 30.0,
            "description": "Zero major system degradation events or cascading operational outages.",
            "achieved": 0.0,
            "progress": 100.0,
            "status": "Completed",
            "isShared": True,
            "sharedGoalId": "master-kpi-101"
        },
        "g-06": {
            "sheetId": "sheet_e02",
            "title": "Deploy Automated Integration Testing Pipelines",
            "thrustArea": "Operational Velocity",
            "uom": "percentage",
            "target": 100.0,
            "weightage": 30.0,
            "description": "Boost unit and system level testing coverages to exceed 85%.",
            "achieved": 45.0,
            "progress": 45.0,
            "status": "On Track",
            "isShared": False,
            "sharedGoalId": None
        },
        "g-07": {
            "sheetId": "sheet_e03",
            "title": "Conduct Quarterly Security Threat Assessments",
            "thrustArea": "Governance & Risk Assurance",
            "uom": "timeline",
            "target": 4.0,
            "weightage": 50.0,
            "description": "Execute internal scans and log compliance anomalies in central index.",
            "achieved": 2.0,
            "progress": 50.0,
            "status": "On Track",
            "isShared": False,
            "sharedGoalId": None
        },
        "g-08": {
            "sheetId": "sheet_e03",
            "title": "Deploy Zero-Trust JWT Authentication Tokens",
            "thrustArea": "Autonomous Intelligence",
            "uom": "percentage",
            "target": 100.0,
            "weightage": 50.0,
            "description": "Decommission weak legacy sessions in favor of stateless corporate JWTs.",
            "achieved": 15.0,
            "progress": 15.0,
            "status": "On Track",
            "isShared": False,
            "sharedGoalId": None
        }
    }

    for gid, g_data in goals.items():
        db.collection("goals").document(gid).set(g_data)
        print(f"  + Seeded goal: {g_data['title']} (Weight: {g_data['weightage']}%)")

    print("\n[SEED] Seeding Collaborative Check-in Timelines ('checkins' collection)...")
    checkins = [
        {
            "goalId": "g-01",
            "userId": "e-01",
            "achieved": 45.0,
            "progress": 45.0,
            "assessment": "align",
            "employeeComment": "Initial cluster scale thresholds configured. Commencing sandbox testing.",
            "supervisorComment": "Great start, Sarah. Keep us posted on load performance results.",
            "ts": "2026-05-08T10:00:00Z",
            "attachments": []
        },
        {
            "goalId": "g-01",
            "userId": "e-01",
            "achieved": 92.0,
            "progress": 92.0,
            "assessment": "exc",
            "employeeComment": "Staging stress test complete. Reached 92% scale velocity without degradation.",
            "supervisorComment": "Excellent progress, outstanding results!",
            "ts": "2026-05-15T16:45:00Z",
            "attachments": ["https://firebasestorage.googleapis.com/v0/b/goalsync/o/k8s_load_test.pdf"]
        },
        {
            "goalId": "g-04",
            "userId": "e-02",
            "achieved": 3500.0,
            "progress": 70.0,
            "assessment": "align",
            "employeeComment": "Redis clustering active. Scaled API throughput from 1000 to 3500 req/sec.",
            "supervisorComment": "Solid improvement, David. Goal target is 5000.",
            "ts": "2026-05-12T14:30:00Z",
            "attachments": []
        }
    ]

    for idx, c_data in enumerate(checkins):
        db.collection("checkins").document(f"c-0{idx+1}").set(c_data)
        print(f"  + Seeded check-in for goal: {c_data['goalId']} ({c_data['progress']}%)")

    print("\n[SEED] Seeding Security Audits Ledger ('audit_logs' collection)...")
    audits = [
        {
            "actor_id": "a-01",
            "actor_name": "Marcus Vance",
            "role": "admin",
            "action": "System Core Initialized",
            "rationale": "GoalSync Enterprise platform successfully launched on corporate cluster.",
            "ts": "2026-05-01T09:00:00Z",
            "sheet_id": None,
            "goal_id": None,
            "old_value": None,
            "new_value": "Initialized"
        },
        {
            "actor_id": "m-01",
            "actor_name": "Aria Chen",
            "role": "manager",
            "action": "Broadcasted Shared KPI",
            "rationale": "Broadcasted master infrastructure uptime metrics to direct report pools.",
            "ts": "2026-05-02T10:15:00Z",
            "sheet_id": None,
            "goal_id": None,
            "old_value": None,
            "new_value": "master-kpi-101"
        },
        {
            "actor_id": "e-01",
            "actor_name": "Sarah Jenkins",
            "role": "employee",
            "action": "Submitted Goal Sheet",
            "rationale": "Goal settings successfully validated and submitted for review signatures.",
            "ts": "2026-05-04T12:00:00Z",
            "sheet_id": "sheet_e01",
            "goal_id": None,
            "old_value": "Draft",
            "new_value": "Pending Review"
        },
        {
            "actor_id": "m-01",
            "actor_name": "Aria Chen",
            "role": "manager",
            "action": "Goal Sheet Approved",
            "rationale": "Signed and approved Sarah Jenkins OKR sheet for active Q3 tracking.",
            "ts": "2026-05-05T14:00:00Z",
            "sheet_id": "sheet_e01",
            "goal_id": None,
            "old_value": "Pending Review",
            "new_value": "Approved"
        }
    ]

    for idx, a_data in enumerate(audits):
        db.collection("audit_logs").document(f"audit-0{idx+1}").set(a_data)
        print(f"  + Seeded audit trail event: {a_data['action']}")

    print("\n[SEED] Seeding Alert Notifications ('notifications' collection)...")
    notifications = [
        {
            "userId": "e-01",
            "title": "Goal Sheet Signed & Approved",
            "body": "Aria Chen has signed off and approved your Q3 2026 Goal Sheet.",
            "category": "approval",
            "read": False,
            "ts": "2026-05-05T14:00:00Z",
            "link": "/employee"
        },
        {
            "userId": "m-01",
            "title": "New Team Review Submitted",
            "body": "David Kross has completed goal drafting and requested review authorization.",
            "category": "system",
            "read": False,
            "ts": "2026-05-04T12:15:00Z",
            "link": "/manager"
        },
        {
            "userId": "e-03",
            "title": "Goal Sheet Rejected: Action Needed",
            "body": "Your Goal Sheet was returned for Rework by Aria Chen. Adjust weights to sum 100%.",
            "category": "rework",
            "read": False,
            "ts": "2026-05-05T15:20:00Z",
            "link": "/employee"
        }
    ]

    for idx, n_data in enumerate(notifications):
        db.collection("notifications").document(f"notif-0{idx+1}").set(n_data)
        print(f"  + Seeded notification alert for: {n_data['userId']}")

    print("\n[SUCCESS] Seeding complete! All executive telemetrics, user grids, and check-ins are live!")
    print("[RUN] Launch your backend & frontend servers to experience the data live.")

if __name__ == "__main__":
    seed_database()
