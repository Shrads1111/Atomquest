from flask import Blueprint, jsonify, request
from middleware.auth import role_required
from services.audit_service import AuditService
from firebase.connection import get_db
import time

admin_bp = Blueprint("admin_bp", __name__)

@admin_bp.route("/api/goals/<sheet_id>/unlock", methods=["POST"])
@role_required(allowed_roles=["admin"])
def force_unlock_sheet(sheet_id):
    """
    Administrative override: Force unlocks a previously locked/approved sheet.
    """
    db = get_db()
    data = request.get_json() or {}
    rationale = data.get("rationale", "Administrative override adjustment.")
    
    if not rationale:
        return jsonify({"error": "Administrative rationale is required to override locked sheets."}), 400
        
    sheet_ref = db.collection("goal_sheets").document(sheet_id)
    sheet = sheet_ref.get()
    
    if not sheet.exists:
        return jsonify({"error": "Target sheet not found."}), 404
        
    # Revert to Unlocked Draft state
    sheet_ref.update({
        "lockStatus": "unlocked",
        "status": "Rework"
    })
    
    # Audit log
    AuditService.log_event(
        actor_id=request.user["uid"],
        actor_name=request.user["name"],
        role=request.user["role"],
        action="Admin Force Unlock",
        rationale=rationale,
        old_value="locked",
        new_value="unlocked",
        sheet_id=sheet_id
    )
    
    return jsonify({"success": True})

@admin_bp.route("/api/cycles/current", methods=["GET"])
@role_required()
def get_active_cycle_settings():
    db = get_db()
    cycle = db.collection("cycles").document("q3_2026").get()
    if not cycle.exists:
        # Create a Q3 active cycle skeleton if Firestore is initialized blank
        default_cycle = {
            "name": "Q3 2026 Cycle",
            "startDate": "2026-05-01",
            "endDate": "2026-08-31",
            "status": "open",
            "phase": "tracking" # setup, tracking, evaluation
        }
        db.collection("cycles").document("q3_2026").set(default_cycle)
        return jsonify(default_cycle)
        
    return jsonify(cycle.to_dict())

@admin_bp.route("/api/cycles", methods=["POST"])
@role_required(allowed_roles=["admin"])
def modify_active_cycle_settings():
    db = get_db()
    data = request.get_json() or {}
    
    phase = data.get("phase", "tracking") # setup, tracking, evaluation
    status = data.get("status", "open") # open, closed
    
    cycle_ref = db.collection("cycles").document("q3_2026")
    cycle_doc = cycle_ref.get()
    
    old_phase = cycle_doc.to_dict().get("phase", "setup") if cycle_doc.exists else "setup"
    old_status = cycle_doc.to_dict().get("status", "open") if cycle_doc.exists else "open"
    
    cycle_ref.update({
        "phase": phase,
        "status": status
    })
    
    # Audit
    AuditService.log_event(
        actor_id=request.user["uid"],
        actor_name=request.user["name"],
        role=request.user["role"],
        action="Modify Cycle Configuration",
        rationale=f"Cycle updated to phase: {phase}, status: {status}",
        old_value=f"Phase: {old_phase}, Status: {old_status}",
        new_value=f"Phase: {phase}, Status: {status}"
    )
    
    return jsonify({"success": True})

@admin_bp.route("/api/audit-logs", methods=["GET"])
@role_required(allowed_roles=["admin"])
def get_modification_audit_logs():
    db = get_db()
    logs = db.collection("audit_logs").get()
    
    logs_list = []
    for l in logs:
        l_data = l.to_dict()
        l_data["id"] = l.id
        logs_list.append(l_data)
        
    # Sort chronologically
    logs_list.sort(key=lambda x: x.get("ts", ""), reverse=True)
    return jsonify(logs_list)
