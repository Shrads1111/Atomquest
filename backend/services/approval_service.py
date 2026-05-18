from firebase.connection import get_db
from services.audit_service import AuditService
from services.goal_service import GoalService
import time

class ApprovalService:
    @staticmethod
    def manager_approve_sheet(manager_profile, sheet_id, remarks=""):
        """
        Locks the sheet and marks it as Approved.
        """
        db = get_db()
        sheet_ref = db.collection("goal_sheets").document(sheet_id)
        sheet_doc = sheet_ref.get()
        
        if not sheet_doc.exists:
            raise ValueError("Target goal sheet not found.")
            
        sheet_data = sheet_doc.to_dict()
        
        # Verify manager authorization hierarchy if needed
        # (Assuming the route wrapper already checks manager role)
        
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
        
        # Update sheet status to Approved and lock it
        sheet_ref.update({
            "status": "Approved",
            "lockStatus": "locked",
            "approvedBy": manager_profile["uid"],
            "approvedAt": timestamp,
            "remarks": remarks
        })
        
        AuditService.log_event(
            actor_id=manager_profile["uid"],
            actor_name=manager_profile["name"],
            role=manager_profile["role"],
            action="Approved Goal Sheet",
            rationale=f"Sheet approved and locked per cycle guidelines. Manager Remarks: {remarks}",
            sheet_id=sheet_id
        )
        return True

    @staticmethod
    def manager_return_rework(manager_profile, sheet_id, rework_reason):
        """
        Unlocks the sheet and returns it to Rework status.
        """
        db = get_db()
        if not rework_reason:
            raise ValueError("Rework instructions and reason are required to return a sheet.")
            
        sheet_ref = db.collection("goal_sheets").document(sheet_id)
        sheet_doc = sheet_ref.get()
        
        if not sheet_doc.exists:
            raise ValueError("Target goal sheet not found.")
            
        sheet_ref.update({
            "status": "Rework",
            "lockStatus": "rework",
            "reworkReason": rework_reason
        })
        
        AuditService.log_event(
            actor_id=manager_profile["uid"],
            actor_name=manager_profile["name"],
            role=manager_profile["role"],
            action="Returned Rework Queue",
            rationale=f"Sheet returned to employee. Instructions: {rework_reason}",
            sheet_id=sheet_id
        )
        return True

    @staticmethod
    def manager_inline_edit_goal(manager_profile, goal_id, new_target, new_weight):
        """
        Managers can modify targets or weights inline before approving to accelerate setup cycles.
        """
        db = get_db()
        goal_ref = db.collection("goals").document(goal_id)
        goal_doc = goal_ref.get()
        
        if not goal_doc.exists:
            raise ValueError("Goal object not found.")
            
        goal_data = goal_doc.to_dict()
        sheet_id = goal_data["sheetId"]
        
        sheet_doc = db.collection("goal_sheets").document(sheet_id).get()
        if sheet_doc.to_dict().get("lockStatus") == "locked":
            raise ValueError("Cannot edit a locked goal sheet. Unlock via admin overrides first.")
            
        old_target = goal_data.get("target")
        old_weight = goal_data.get("weightage")
        
        # Modify values
        goal_ref.update({
            "target": float(new_target),
            "weightage": float(new_weight)
        })
        
        # Recalculate total weights
        GoalService.recalculate_sheet_weight(sheet_id)
        
        AuditService.log_event(
            actor_id=manager_profile["uid"],
            actor_name=manager_profile["name"],
            role=manager_profile["role"],
            action="Manager Inline Modification",
            rationale=f"Manager override of targets/weightage prior to locking: Target {old_target}→{new_target}, Weight {old_weight}→{new_weight}%",
            old_value=f"Target: {old_target}, Weight: {old_weight}",
            new_value=f"Target: {new_target}, Weight: {new_weight}",
            sheet_id=sheet_id,
            goal_id=goal_id
        )
        return True
