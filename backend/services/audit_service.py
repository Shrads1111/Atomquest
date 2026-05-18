import time
import hashlib
from firebase.connection import get_db

class AuditService:
    @staticmethod
    def log_event(actor_id, actor_name, role, action, rationale, old_value="", new_value="", sheet_id=None, goal_id=None):
        """
        Record a cryptographically signed event into Firestore audit_logs collection.
        """
        db = get_db()
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
        
        # Build raw string context for signing
        signature_base = f"{timestamp}|{actor_id}|{action}|{old_value}->{new_value}|{rationale}"
        hash_signature = hashlib.sha256(signature_base.encode()).hexdigest()[:12].upper()
        
        log_data = {
            "ts": timestamp,
            "actorId": actor_id,
            "actorName": actor_name,
            "role": role,
            "action": action,
            "rationale": rationale,
            "oldValue": str(old_value),
            "newValue": str(new_value),
            "sheetId": sheet_id,
            "goalId": goal_id,
            "hash": f"SEC-{hash_signature}"
        }
        
        try:
            db.collection("audit_logs").document().set(log_data)
            return log_data
        except Exception as e:
            # Fallback console log if firestore fails
            print(f"FAILED TO WRITE COMPLIANCE AUDIT LOG: {str(e)}")
            return None
