from firebase.connection import get_db
from services.audit_service import AuditService
from services.score_service import ScoreService
import time

class GoalService:
    @staticmethod
    def get_user_sheet(employee_id, cycle_id):
        db = get_db()
        sheets = db.collection("goal_sheets")\
                   .where("employeeId", "==", employee_id)\
                   .where("cycleId", "==", cycle_id)\
                   .limit(1).get()
        if len(sheets) == 0:
            return None
        return sheets[0]

    @staticmethod
    def get_or_create_sheet(employee_id, cycle_id):
        db = get_db()
        sheet_doc = GoalService.get_user_sheet(employee_id, cycle_id)
        if sheet_doc:
            return sheet_doc.id, sheet_doc.to_dict()
            
        # Create a new blank sheet if it doesn't exist
        new_sheet = {
            "employeeId": employee_id,
            "cycleId": cycle_id,
            "lockStatus": "unlocked", # unlocked, locked, rework
            "totalWeightage": 0.0,
            "status": "Draft", # Draft, Pending Review, Approved, Rework
            "approvedBy": None,
            "approvedAt": None
        }
        
        sheet_ref = db.collection("goal_sheets").document()
        sheet_ref.set(new_sheet)
        return sheet_ref.id, new_sheet

    @staticmethod
    def validate_and_save_goal(employee_profile, cycle_id, goal_id, data):
        """
        Create or update a single goal under the employee's active cycle sheet.
        """
        db = get_db()
        emp_uid = employee_profile["uid"]
        sheet_id, sheet = GoalService.get_or_create_sheet(emp_uid, cycle_id)
        
        # Enforce lock checks
        if sheet.get("lockStatus") == "locked":
            raise ValueError("This goal sheet is locked and cannot be edited. Request admin override.")

        # Check maximum capacity (8 goals max)
        existing_goals = db.collection("goals").where("sheetId", "==", sheet_id).get()
        
        # If it is a new goal (no goal_id), enforce capacity limits
        if not goal_id and len(existing_goals) >= 8:
            raise ValueError("Goal limit exceeded. Maximum 8 goals permitted per active cycle sheet.")

        # Fields extracting
        title = data.get("goal_title", "").strip()
        thrust_area = data.get("thrust_area", "").strip()
        uom = data.get("uom_type", "percentage").strip().lower()
        target = float(data.get("target", 0.0))
        weight = float(data.get("weightage", 10.0))
        description = data.get("goal_description", "").strip()
        is_shared = bool(data.get("is_shared", False))
        shared_goal_id = data.get("shared_goal_id", None)
        
        # Enforce validation bounds
        if not title:
            raise ValueError("Goal title objective is required.")
        if target < 0:
            raise ValueError("Target value must be a positive number.")
            
        # If updating, ensure same owner checks
        if goal_id:
            goal_ref = db.collection("goals").document(goal_id)
            goal_doc = goal_ref.get()
            if not goal_doc.exists or goal_doc.to_dict().get("sheetId") != sheet_id:
                raise ValueError("Unauthorized goal modifications.")
                
            # If goal is shared and recipient is employee, restrict updates
            if goal_doc.to_dict().get("isShared") and employee_profile.get("role") == "employee":
                # Recipient can ONLY adjust weightage! Title/target remain read-only
                title = goal_doc.to_dict().get("title")
                target = goal_doc.to_dict().get("target")
                uom = goal_doc.to_dict().get("uom")

        # Save goal object
        goal_data = {
            "sheetId": sheet_id,
            "title": title,
            "thrustArea": thrust_area,
            "uom": uom,
            "target": target,
            "weightage": weight,
            "description": description,
            "isShared": is_shared,
            "sharedGoalId": shared_goal_id,
            "achieved": 0.0,
            "progress": 0.0,
            "status": "Not Started"
        }
        
        if goal_id:
            db.collection("goals").document(goal_id).update(goal_data)
            action_type = "Goal Edited"
        else:
            goal_ref = db.collection("goals").document()
            goal_id = goal_ref.id
            goal_ref.set(goal_data)
            action_type = "Goal Created"

        # Update sheet total weight calculations
        GoalService.recalculate_sheet_weight(sheet_id)
        
        # Log Audit event
        AuditService.log_event(
            actor_id=emp_uid,
            actor_name=employee_profile["name"],
            role=employee_profile["role"],
            action=action_type,
            rationale=f"Individual goal settings updated for objective '{title[:25]}...'",
            new_value=str(goal_data),
            sheet_id=sheet_id,
            goal_id=goal_id
        )
        
        return goal_id

    @staticmethod
    def recalculate_sheet_weight(sheet_id):
        db = get_db()
        goals = db.collection("goals").where("sheetId", "==", sheet_id).get()
        total_weight = sum([float(g.to_dict().get("weightage", 0.0)) for g in goals])
        db.collection("goal_sheets").document(sheet_id).update({"totalWeightage": total_weight})

    @staticmethod
    def submit_goal_sheet(employee_profile, cycle_id):
        """
        Transition goals draft to pending review status after validation checks.
        """
        db = get_db()
        emp_uid = employee_profile["uid"]
        sheet_doc = GoalService.get_user_sheet(emp_uid, cycle_id)
        
        if not sheet_doc:
            raise ValueError("No draft goal sheet found for this active cycle.")
            
        sheet_id = sheet_doc.id
        sheet_data = sheet_doc.to_dict()
        
        if sheet_data.get("lockStatus") == "locked":
            raise ValueError("Goal sheet is already approved and locked.")
            
        # Get sheet goals
        goals = db.collection("goals").where("sheetId", "==", sheet_id).get()
        if len(goals) == 0:
            raise ValueError("Cannot submit an empty goal sheet. Draft at least one goal objective.")
            
        # 1. Total Weightage Validation (Must sum exactly to 100)
        total_weight = sum([float(g.to_dict().get("weightage", 0.0)) for g in goals])
        if abs(total_weight - 100.0) > 0.01:
            raise ValueError(f"Constraint breach. Total weightage must sum exactly to 100. Current total: {total_weight}%")
            
        # 2. Individual Goal Weight Validation (At least 10 weightage per goal)
        for g in goals:
            g_data = g.to_dict()
            if float(g_data.get("weightage", 0.0)) < 10.0:
                raise ValueError(f"Constraint breach. Goal '{g_data['title'][:25]}...' has weightage under 10%.")

        # Set status to pending review
        db.collection("goal_sheets").document(sheet_id).update({
            "status": "Pending Review",
            "lockStatus": "unlocked"
        })
        
        AuditService.log_event(
            actor_id=emp_uid,
            actor_name=employee_profile["name"],
            role=employee_profile["role"],
            action="Submitted Goal Sheet",
            rationale="All constraints validated. Sent Q3 OKR sheet to supervisor review queue.",
            sheet_id=sheet_id
        )
        return sheet_id
