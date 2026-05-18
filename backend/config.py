import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "goalsync-cinematic-obsidian-super-secret-key")
    
    # Path to the firebase service account json key
    FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "firebase-key.json")
    
    # Define active cycle configuration details
    ACTIVE_CYCLE_ID = "q3_2026"
    
    # Define check-in windows (May, July, October, January, March/April)
    CHECKIN_WINDOWS = {
        "setup": {"month_start": 5, "month_end": 6, "label": "Goal Setting / Approval"},
        "q1": {"month_start": 7, "month_end": 8, "label": "Q1 Check-in Window"},
        "q2": {"month_start": 10, "month_end": 11, "label": "Q2 Check-in Window"},
        "q3": {"month_start": 1, "month_end": 2, "label": "Q3 Check-in Window"},
        "q4": {"month_start": 3, "month_end": 4, "label": "Q4 Annual Evaluation Window"},
    }
