from flask import Blueprint, jsonify, request
from middleware.auth import role_required
from services.checkin_service import CheckinService
from firebase.connection import get_db

checkin_bp = Blueprint("checkin_bp", __name__)

@checkin_bp.route("/api/checkins", methods=["POST"])
@role_required(allowed_roles=["employee", "manager", "admin"])
def submit_checkin():

    data = request.get_json() or {}
    goal_id = data.get("goal_id")
    override_window = data.get("override_window", False)
    
    if not goal_id:
        return jsonify({"error": "Goal ID parameter is required."}), 400
        
    try:
        checkin_id = CheckinService.register_checkin(request.user, goal_id, data, override_window)
        return jsonify({"success": True, "checkin_id": checkin_id})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal check-in registration error: {str(e)}"}), 500

@checkin_bp.route("/api/checkins/my", methods=["GET"])
@role_required()
def get_my_checkins():
    db = get_db()
    emp_uid = request.user["uid"]
    
    # Query checkin logs
    checkins = db.collection("checkins").where("employeeId", "==", emp_uid).get()
    
    checkins_list = []
    for c in checkins:
        c_data = c.to_dict()
        c_data["id"] = c.id
        checkins_list.append(c_data)
        
    # Sort chronologically
    checkins_list.sort(key=lambda x: x.get("ts", ""), reverse=True)
    return jsonify(checkins_list)

@checkin_bp.route("/api/checkins/team", methods=["GET"])
@role_required(allowed_roles=["manager", "admin"])
def get_team_checkins():
    db = get_db()
    role = request.user["role"]
    uid = request.user["uid"]
    
    if role == "manager":
        team = db.collection("users").where("managerId", "==", uid).get()
    else:
        team = db.collection("users").get()
        
    team_uids = [u.id for u in team]
    if not team_uids:
        return jsonify([])
        
    checkins_list = []
    for emp_uid in team_uids:
        checkins = db.collection("checkins").where("employeeId", "==", emp_uid).get()
        for c in checkins:
            # Map name
            emp_name = next((u.to_dict().get("name") for u in team if u.id == emp_uid), "Staff")
            c_data = c.to_dict()
            c_data["id"] = c.id
            c_data["employeeName"] = emp_name
            checkins_list.append(c_data)
            
    checkins_list.sort(key=lambda x: x.get("ts", ""), reverse=True)
    return jsonify(checkins_list)

@checkin_bp.route("/api/checkins/<checkin_id>/review", methods=["POST"])
@role_required(allowed_roles=["manager", "admin"])
def review_checkin_submission(checkin_id):
    data = request.get_json() or {}
    remarks = data.get("remarks", "")
    status = data.get("status", "Met Expectations")
    
    if not remarks:
        return jsonify({"error": "Manager remarks are required."}), 400
        
    try:
        CheckinService.manager_review_checkin(request.user, checkin_id, remarks, status)
        return jsonify({"success": True})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Evaluation error: {str(e)}"}), 500
