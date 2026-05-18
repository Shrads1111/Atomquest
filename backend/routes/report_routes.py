from flask import Blueprint, request, Response, jsonify
from middleware.auth import role_required
from services.report_service import ReportService
import io

report_bp = Blueprint("report_bp", __name__)

@report_bp.route("/api/reports/achievement", methods=["GET"])
@role_required(allowed_roles=["manager", "admin"])
def download_achievement_report():
    """
    Exports a detailed achievement summary filtered by args.
    """
    format_type = request.args.get("format", "csv").lower()
    
    # Extract query filters
    filters = {
        "department": request.args.get("department"),
        "manager": request.args.get("manager"),
        "employee": request.args.get("employee"),
        "status": request.args.get("status"),
        "approval_state": request.args.get("approval_state"),
        "cycle": request.args.get("cycle", "q3_2026"),
    }
    
    try:
        data, mime_type, filename = ReportService.export_report(format_type, filters)
        return Response(
            data,
            mimetype=mime_type,
            headers={"Content-disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return jsonify({"error": f"Report compile error: {str(e)}"}), 500

@report_bp.route("/api/reports/completion", methods=["GET"])
@role_required(allowed_roles=["manager", "admin"])
def get_completion_summary_json():
    """
    Helper endpoint mapping a quick completion status JSON summary.
    """
    filters = {
        "department": request.args.get("department"),
        "manager": request.args.get("manager"),
        "cycle": request.args.get("cycle", "q3_2026"),
    }
    
    try:
        df = ReportService.compile_achievements_dataframe(filters)
        if df.empty:
            return jsonify({
                "totalGoals": 0,
                "completionPercentage": 0.0,
                "states": {}
            })
            
        total_goals = len(df)
        completed_goals = len(df[df["Goal Status"] == "Completed"])
        
        # Calculate completion rate
        completion_pct = (completed_goals / total_goals) * 100.0 if total_goals > 0 else 0.0
        
        # Breakdown
        status_counts = df["Goal Status"].value_counts().to_dict()
        
        return jsonify({
            "totalGoals": total_goals,
            "completionPercentage": round(completion_pct, 1),
            "states": status_counts
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get summary: {str(e)}"}), 500
