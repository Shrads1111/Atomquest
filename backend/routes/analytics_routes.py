from flask import Blueprint, jsonify
from middleware.auth import role_required
from services.analytics_service import AnalyticsService

analytics_bp = Blueprint("analytics_bp", __name__)

@analytics_bp.route("/api/analytics", methods=["GET"])
@role_required(allowed_roles=["manager", "admin"])
def get_global_analytics_summary():
    """
    Returns chart-ready metrics mapping status breakdowns, thrust areas, UoM counts, and depts.
    """
    try:
        data = AnalyticsService.get_dashboard_analytics()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Failed to compile analytics: {str(e)}"}), 500

@analytics_bp.route("/api/analytics/qoq", methods=["GET"])
@role_required(allowed_roles=["manager", "admin"])
def get_qoq_trends():
    """
    Quarter-on-Quarter achievement analytics data vector.
    """
    try:
        data = AnalyticsService.get_dashboard_analytics()
        return jsonify(data.get("qoqTrends", []))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route("/api/analytics/manager-effectiveness", methods=["GET"])
@role_required(allowed_roles=["admin"])
def get_manager_effectiveness():
    """
    Admin overview tracking manager review velocities.
    """
    try:
        data = AnalyticsService.get_dashboard_analytics()
        return jsonify(data.get("managerEffectiveness", []))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
