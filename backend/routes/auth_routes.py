from flask import Blueprint, jsonify, request
from middleware.auth import role_required
from firebase.connection import get_db

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/api/me", methods=["GET"])
@role_required()
def get_current_user_profile():
    """
    Returns user details loaded in current request context.
    """
    return jsonify(request.user)

@auth_bp.route("/api/users/team", methods=["GET"])
@role_required(allowed_roles=["manager", "admin"])
def get_team_directory():
    """
    Managers fetch their team members. Admins fetch all active users.
    """
    db = get_db()
    role = request.user.get("role")
    uid = request.user.get("uid")
    
    users_ref = db.collection("users")
    
    if role == "manager":
        # Direct reports query
        team = users_ref.where("managerId", "==", uid).get()
    else:
        # Admin gets everyone
        team = users_ref.get()
        
    team_list = []
    for u in team:
        u_data = u.to_dict()
        u_data["uid"] = u.id
        team_list.append(u_data)
        
    return jsonify(team_list)
