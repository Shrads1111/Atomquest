from flask import Blueprint, jsonify, request
from middleware.auth import role_required
from services.escalation_service import EscalationService
from firebase.connection import get_db

escalation_bp = Blueprint("escalation_bp", __name__)

@escalation_bp.route("/api/escalations", methods=["GET"])
@role_required(allowed_roles=["admin"])
def get_active_escalations():
    """
    Admins inspect all SLA breaches.
    """
    db = get_db()
    
    escs = db.collection("escalations").get()
    
    escs_list = []
    for e in escs:
        e_data = e.to_dict()
        e_data["id"] = e.id
        
        # Map Employee Name
        emp_doc = db.collection("users").document(e_data.get("employeeId")).get()
        emp_name = emp_doc.to_dict().get("name", "Staff") if emp_doc.exists else "Staff"
        e_data["employeeName"] = emp_name
        
        escs_list.append(e_data)
        
    return jsonify(escs_list)

@escalation_bp.route("/api/escalations/run", methods=["POST"])
@role_required(allowed_roles=["admin"])
def run_compliance_scheduler():
    """
    Manually triggers the background cron checker rules index.
    """
    try:
        count = EscalationService.run_compliance_checks()
        return jsonify({"success": True, "escalationsTriggered": count})
    except Exception as e:
        return jsonify({"error": f"Compliance run failed: {str(e)}"}), 500

@escalation_bp.route("/api/escalations/<escalation_id>/resolve", methods=["POST"])
@role_required(allowed_roles=["admin"])
def resolve_violation(escalation_id):
    data = request.get_json() or {}
    notes = data.get("notes", "Compliance Resolved manually by HR Admin.")
    
    try:
        EscalationService.resolve_escalation(request.user, escalation_id, notes)
        return jsonify({"success": True})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Resolution failed: {str(e)}"}), 500
