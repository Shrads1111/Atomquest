import os
import sys
sys.modules['google._upb._message'] = None
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

import logging

from flask import Flask, jsonify, request

from flask_cors import CORS
from config import Config
from firebase.connection import initialize_firebase
from routes.auth_routes import auth_bp
from routes.goal_routes import goal_bp
from routes.checkin_routes import checkin_bp
from routes.report_routes import report_bp
from routes.analytics_routes import analytics_bp
from routes.escalation_routes import escalation_bp
from routes.admin_routes import admin_bp

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)

app.config.from_object(Config)

# Enable CORS policies for seamless React TanStack client connections
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize Cloud Firestore connections
try:
    initialize_firebase()
except Exception as e:
    logger.error(f"Firestore connections failed to launch. Operating in dry-run mode for local mocks. Reason: {str(e)}")

# Register Routing blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(goal_bp)
app.register_blueprint(checkin_bp)
app.register_blueprint(report_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(escalation_bp)
app.register_blueprint(admin_bp)

@app.route("/health", methods=["GET"])
def health_check():
    """
    Direct system connection validator.
    """
    return jsonify({
        "status": "healthy",
        "service": "GoalSync Compliance Core",
        "cycle_active": Config.ACTIVE_CYCLE_ID
    })

# Option 15: Setup APScheduler SLA reminder daemon
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from services.escalation_service import EscalationService
    
    scheduler = BackgroundScheduler()
    # Run Q3 SLA check checks every 24 hours
    scheduler.add_job(func=EscalationService.run_compliance_checks, trigger="interval", hours=24)
    scheduler.start()
    logger.info("Compliance SLA Daemon successfully started on interval: 24h.")
except Exception as e:
    logger.warning(f"SLA scheduler failed to start (or APScheduler not installed): {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
