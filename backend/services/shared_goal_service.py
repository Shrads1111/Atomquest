from firebase.connection import get_db
from services.goal_service import GoalService
from services.audit_service import AuditService
import time

class SharedGoalService:
    @staticmethod
    def create_and_push_shared_goal(creator_profile, data, employee_ids):
        """
        Pushes a departmental shared KPI/goal to multiple employees.
        """
        db = get_db()
        title = data.get("goal_title", "").strip()
        thrust_area = data.get("thrust_area", "").strip()
        uom = data.get("uom_type", "percentage").strip().lower()
        target = float(data.get("target", 100.0))
        weight = float(data.get("weightage", 10.0))
        description = data.get("goal_description", "").strip()
        cycle_id = data.get("cycle_id", "q3_2026")
        
        if not title:
            raise ValueError("Shared goal title is required.")
            
        # 1. Store global shared goal master doc
        shared_master = {
            "title": title,
            "thrustArea": thrust_area,
            "uom": uom,
            "target": target,
            "weightage": weight,
            "description": description,
            "cycleId": cycle_id,
            "creatorId": creator_profile["uid"],
            "recipientCount": len(employee_ids),
            "achieved": 0.0,
            "progress": 0.0
        }
        
        master_ref = db.collection("shared_goals").document()
        master_id = master_ref.id
        master_ref.set(shared_master)
        
        # 2. Iterate through and push to each target employee
        pushed_count = 0
        for emp_uid in employee_ids:
            try:
                # Find profile to retrieve details
                emp_doc = db.collection("users").document(emp_uid).get()
                if not emp_doc.exists:
                    continue
                    
                emp_profile = emp_doc.to_dict()
                emp_profile["uid"] = emp_uid
                
                sheet_id, sheet = GoalService.get_or_create_sheet(emp_uid, cycle_id)
                
                # If sheet is locked, admin can force unlock or we warning-log
                if sheet.get("lockStatus") == "locked":
                    # For shared goals push, we skip locked sheets or log a warning
                    continue
                    
                # Append goal document linked with master
                recipient_goal = {
                    "sheetId": sheet_id,
                    "title": title,
                    "thrustArea": thrust_area,
                    "uom": uom,
                    "target": target,
                    "weightage": weight, # Default initial weight
                    "description": description,
                    "isShared": True,
                    "sharedGoalId": master_id,
                    "achieved": 0.0,
                    "progress": 0.0,
                    "status": "Not Started"
                }
                
                db.collection("goals").document().set(recipient_goal)
                GoalService.recalculate_sheet_weight(sheet_id)
                pushed_count += 1
                
                AuditService.log_event(
                    actor_id=creator_profile["uid"],
                    actor_name=creator_profile["name"],
                    role=creator_profile["role"],
                    action="Pushed Shared Goal",
                    rationale=f"Pushed departmental Shared KPI '{title[:25]}...' to {emp_profile['name']}",
                    sheet_id=sheet_id
                )
            except Exception as e:
                print(f"Error pushing shared goal to {emp_uid}: {str(e)}")
                
        # Update successful push counts
        master_ref.update({"recipientCount": pushed_count})
        return master_id
