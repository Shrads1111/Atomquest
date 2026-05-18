from flask import Blueprint, jsonify, request
from middleware.auth import role_required
from services.goal_service import GoalService
from services.approval_service import ApprovalService
from services.shared_goal_service import SharedGoalService
from firebase.connection import get_db

goal_bp = Blueprint("goal_bp", __name__)

@goal_bp.route("/api/goals/draft", methods=["POST"])
@role_required(allowed_roles=["employee", "manager", "admin"])
def save_goal_draft():
    """
    Creates or updates a single goal in the active cycle sheet.
    """
    data = request.get_json()
    cycle_id = data.get("cycle_id", "q3_2026")
    goal_id = data.get("goal_id", None) # If present, update existing goal
    
    try:
        g_id = GoalService.validate_and_save_goal(request.user, cycle_id, goal_id, data)
        return jsonify({"success": True, "goal_id": g_id})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal error during goal write: {str(e)}"}), 500

@goal_bp.route("/api/goals/my", methods=["GET"])
@role_required(allowed_roles=["employee", "manager", "admin"])
def get_my_goals():
    """
    Fetches the caller's active cycle sheet and individual goal elements.
    """
    db = get_db()
    cycle_id = request.args.get("cycle_id", "q3_2026")
    emp_uid = request.user["uid"]
    
    sheet_doc = GoalService.get_user_sheet(emp_uid, cycle_id)
    if not sheet_doc:
        return jsonify({"sheet": None, "goals": []})
        
    sheet_data = sheet_doc.to_dict()
    sheet_data["id"] = sheet_doc.id
    
    goals = db.collection("goals").where("sheetId", "==", sheet_doc.id).get()
    goals_list = []
    for g in goals:
        g_data = g.to_dict()
        g_data["id"] = g.id
        goals_list.append(g_data)
        
    return jsonify({"sheet": sheet_data, "goals": goals_list})

@goal_bp.route("/api/goals/<sheet_id>", methods=["GET"])
@role_required(allowed_roles=["employee", "manager", "admin"])
def get_goal_sheet_details(sheet_id):
    db = get_db()
    sheet_ref = db.collection("goal_sheets").document(sheet_id).get()
    if not sheet_ref.exists:
        return jsonify({"error": "Goal sheet not found"}), 404
        
    sheet = sheet_ref.to_dict()
    sheet["id"] = sheet_ref.id
    
    goals = db.collection("goals").where("sheetId", "==", sheet_id).get()
    goals_list = []
    for g in goals:
        g_data = g.to_dict()
        g_data["id"] = g.id
        goals_list.append(g_data)
        
    return jsonify({"sheet": sheet, "goals": goals_list})

@goal_bp.route("/api/goals/team", methods=["GET"])
@role_required(allowed_roles=["manager", "admin"])
def get_team_goal_sheets():
    """
    Fetches goal sheets submitted by manager's team members.
    """
    db = get_db()
    role = request.user["role"]
    uid = request.user["uid"]
    cycle_id = request.args.get("cycle_id", "q3_2026")
    
    # 1. Fetch team users list
    if role == "manager":
        team = db.collection("users").where("managerId", "==", uid).get()
    else:
        team = db.collection("users").get()
        
    team_uids = [u.id for u in team]
    if not team_uids:
        return jsonify([])
        
    # Firestore 'in' queries support max 10 elements. Splitting checks or doing simple filters
    # For robust enterprise code, we pull sheets mapping uids
    sheets_list = []
    for emp_uid in team_uids:
        sheets = db.collection("goal_sheets")\
                   .where("employeeId", "==", emp_uid)\
                   .where("cycleId", "==", cycle_id).get()
        for s in sheets:
            # Map employee name
            emp_name = next((u.to_dict().get("name") for u in team if u.id == emp_uid), "Staff")
            s_data = s.to_dict()
            s_data["id"] = s.id
            s_data["employeeName"] = emp_name
            sheets_list.append(s_data)
            
    return jsonify(sheets_list)

@goal_bp.route("/api/goals/<sheet_id>/submit", methods=["POST"])
@role_required(allowed_roles=["employee", "manager", "admin"])
def submit_goal_sheet(sheet_id):
    cycle_id = request.args.get("cycle_id", "q3_2026")
    try:
        # Re-enforce validation rules on the final goal sheet submission
        sheet_id = GoalService.submit_goal_sheet(request.user, cycle_id)
        return jsonify({"success": True, "sheet_id": sheet_id})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal submission error: {str(e)}"}), 500

@goal_bp.route("/api/goals/<sheet_id>/approve", methods=["POST"])
@role_required(allowed_roles=["manager", "admin"])
def approve_sheet(sheet_id):
    data = request.get_json() or {}
    remarks = data.get("remarks", "Approved by Manager")
    try:
        ApprovalService.manager_approve_sheet(request.user, sheet_id, remarks)
        return jsonify({"success": True})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Approval error: {str(e)}"}), 500

@goal_bp.route("/api/goals/<sheet_id>/reject", methods=["POST"])
@role_required(allowed_roles=["manager", "admin"])
def reject_sheet(sheet_id):
    data = request.get_json() or {}
    rework_reason = data.get("rework_reason", "")
    try:
        ApprovalService.manager_return_rework(request.user, sheet_id, rework_reason)
        return jsonify({"success": True})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Rejection error: {str(e)}"}), 500

@goal_bp.route("/api/goals/shared", methods=["POST"])
@role_required(allowed_roles=["manager", "admin"])
def push_shared_goal():
    """
    Broadcasts a shared KPI/goal to selected employees.
    """
    data = request.get_json() or {}
    employee_ids = data.get("employee_ids", [])
    
    if not employee_ids:
        return jsonify({"error": "Select at least one recipient node."}), 400
        
    try:
        master_id = SharedGoalService.create_and_push_shared_goal(request.user, data, employee_ids)
        return jsonify({"success": True, "shared_goal_id": master_id})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Broadcast push error: {str(e)}"}), 500
