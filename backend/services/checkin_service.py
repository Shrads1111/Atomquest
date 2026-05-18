from firebase.connection import get_db
from services.score_service import ScoreService
from services.audit_service import AuditService
from config import Config
import time

class CheckinService:
    @staticmethod
    def is_window_active(quarter_key):
        """
        Helper validating if current calendar month matches the active quarter window.
        """
        current_month = time.gmtime().tm_mon
        window = Config.CHECKIN_WINDOWS.get(quarter_key.lower())
        if not window:
            return False
            
        start = window["month_start"]
        end = window["month_end"]
        
        # Simple bounds check
        if start <= end:
            return start <= current_month <= end
        else: # Handle wrapping cycles if any
            return current_month >= start or current_month <= end

    @staticmethod
    def register_checkin(employee_profile, goal_id, data, override_window=False):
        db = get_db()
        emp_uid = employee_profile["uid"]
        
        # 1. Verify window active status
        cycle_ref = db.collection("cycles").document(Config.ACTIVE_CYCLE_ID).get()
        cycle_phase = cycle_ref.to_dict().get("phase", "tracking") if cycle_ref.exists else "tracking"
        
        if not override_window and not CheckinService.is_window_active(cycle_phase):
            raise ValueError(f"Goal check-ins are restricted. Current active cycle phase window is closed.")

        goal_ref = db.collection("goals").document(goal_id)
        goal = goal_ref.get()
        if not goal.exists:
            raise ValueError("Target goal object not found.")
            
        goal_data = goal.to_dict()
        sheet_id = goal_data["sheetId"]
        
        # Verify ownership
        sheet_doc = db.collection("goal_sheets").document(sheet_id).get()
        if not sheet_doc.exists or sheet_doc.to_dict().get("employeeId") != emp_uid:
            raise ValueError("Unauthorized. You are not the owner of this goal sheet.")

        achieved = float(data.get("achieved", 0.0))
        remarks = data.get("remarks", "").strip()
        status_input = data.get("status", "On Track").strip()
        evidence_link = data.get("evidence_link", "").strip()

        # 2. Recalculate progress using ScoreService
        deadline = goal_data.get("deadline", "2026-06-30")
        calculated_progress = ScoreService.calculate_progress(
            uom_type=goal_data["uom"],
            target=float(goal_data["target"]),
            achieved=achieved,
            deadline_str=deadline
        )
        
        # Auto map completion statuses
        status = status_input
        if calculated_progress >= 100.0:
            status = "Completed"
            
        # 3. Update goal record
        goal_ref.update({
            "achieved": achieved,
            "progress": calculated_progress,
            "status": status
        })
        
        # 4. Save checkin logs
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
        checkin_ref = db.collection("checkins").document()
        checkin_data = {
            "goalId": goal_id,
            "employeeId": emp_uid,
            "achieved": achieved,
            "progress": calculated_progress,
            "status": status,
            "remarks": remarks,
            "evidenceLink": evidence_link,
            "ts": timestamp
        }
        checkin_ref.set(checkin_data)
        
        # 5. Log audit trail
        AuditService.log_event(
            actor_id=emp_uid,
            actor_name=employee_profile["name"],
            role=employee_profile["role"],
            action="Check-in Update",
            rationale=f"Updated progress achievement value to {achieved}. Remarks: {remarks}",
            old_value=str(goal_data.get("achieved", 0.0)),
            new_value=str(achieved),
            sheet_id=sheet_id,
            goal_id=goal_id
        )
        
        return checkin_ref.id

    @staticmethod
    def manager_review_checkin(manager_profile, checkin_id, manager_remarks, manager_status="Met Expectations"):
        db = get_db()
        checkin_ref = db.collection("checkins").document(checkin_id)
        checkin = checkin_ref.get()
        
        if not checkin.exists:
            raise ValueError("Target check-in record not found.")
            
        checkin_ref.update({
            "managerRemarks": manager_remarks,
            "managerStatus": manager_status,
            "reviewedBy": manager_profile["uid"],
            "reviewedAt": time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
        })
        
        AuditService.log_event(
            actor_id=manager_profile["uid"],
            actor_name=manager_profile["name"],
            role=manager_profile["role"],
            action="Manager Review Log",
            rationale=f"Supervisor reviewed check-in and added comments: {manager_remarks}",
            sheet_id=None,
            goal_id=checkin.to_dict().get("goalId")
        )
        return True
