from firebase.connection import get_db
from services.audit_service import AuditService
from config import Config
import time
from datetime import datetime

class EscalationService:
    @staticmethod
    def run_compliance_checks():
        """
        Run scheduled checks analyzing goal cycle deadlines.
        Creates escalations for outstanding milestones.
        """
        db = get_db()
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
        escalations_triggered = 0
        
        # 1. Check Cycle deadlines
        cycle_ref = db.collection("cycles").document(Config.ACTIVE_CYCLE_ID).get()
        if not cycle_ref.exists:
            return 0
            
        cycle_data = cycle_ref.to_dict()
        if cycle_data.get("status") == "closed":
            return 0
            
        # Get active phase details
        phase = cycle_data.get("phase", "setup") # setup, tracking, evaluation
        
        # 2. Get all users
        users = db.collection("users").get()
        
        for user_doc in users:
            uid = user_doc.id
            u_data = user_doc.to_dict()
            u_data["uid"] = uid
            
            # We check employees only
            if u_data.get("role") != "employee":
                continue
                
            manager_id = u_data.get("managerId", "None")
            
            # Fetch employee's active goal sheet
            sheet_doc = db.collection("goal_sheets")\
                          .where("employeeId", "==", uid)\
                          .where("cycleId", "==", Config.ACTIVE_CYCLE_ID)\
                          .limit(1).get()
                          
            # RULE A: Goal setting phase submission checks (Phase: Setup)
            if phase == "setup":
                # If no sheet created, or lockStatus is unlocked/rework and status is not Pending Review / Approved
                if len(sheet_doc) == 0 or (sheet_doc[0].to_dict().get("status") in ["Draft", "Rework"]):
                    # Trigger Goal Setup Delinquency
                    if not EscalationService.has_active_escalation(uid, "Goal Submission Missed"):
                        EscalationService.create_escalation(
                            employee_id=uid,
                            manager_id=manager_id,
                            escalation_type="Goal Submission Missed",
                            severity="High",
                            delay_days=7,
                            notes="Q3 OKR Setup window closing; employee has not submitted active goal sheet."
                        )
                        escalations_triggered += 1
                        
            # RULE B: Manager approval delay checking (Phase: Setup)
            if phase == "setup" and len(sheet_doc) > 0:
                sheet = sheet_doc[0].to_dict()
                if sheet.get("status") == "Pending Review":
                    # Check manager delay
                    if not EscalationService.has_active_escalation(uid, "Manager Approval Delay"):
                        EscalationService.create_escalation(
                            employee_id=uid,
                            manager_id=manager_id,
                            escalation_type="Manager Approval Delay",
                            severity="Medium",
                            delay_days=5,
                            notes=f"Manager has not reviewed submitted sheet in 5+ days."
                        )
                        escalations_triggered += 1

            # RULE C: Quarterly check-in deadlines checks (Phase: Tracking)
            if phase == "tracking" and len(sheet_doc) > 0:
                sheet_id = sheet_doc[0].id
                goals = db.collection("goals").where("sheetId", "==", sheet_id).get()
                
                # Check if any goal is still Not Started or behind target checks
                has_pending_checkins = False
                for g in goals:
                    g_data = g.to_dict()
                    if g_data.get("status") == "Not Started":
                        has_pending_checkins = True
                        break
                        
                if has_pending_checkins:
                    if not EscalationService.has_active_escalation(uid, "Quarterly Check-In Missed"):
                        EscalationService.create_escalation(
                            employee_id=uid,
                            manager_id=manager_id,
                            escalation_type="Quarterly Check-In Missed",
                            severity="High",
                            delay_days=3,
                            notes="Active check-in period underway; employee has uncompleted metric milestones."
                        )
                        escalations_triggered += 1
                        
        return escalations_triggered

    @staticmethod
    def has_active_escalation(employee_id, escalation_type):
        db = get_db()
        ex = db.collection("escalations")\
               .where("employeeId", "==", employee_id)\
               .where("type", "==", escalation_type)\
               .where("status", "==", "Active")\
               .limit(1).get()
        return len(ex) > 0

    @staticmethod
    def create_escalation(employee_id, manager_id, escalation_type, severity, delay_days, notes=""):
        db = get_db()
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
        esc_data = {
            "employeeId": employee_id,
            "managerId": manager_id,
            "type": escalation_type,
            "severity": severity,
            "delayDays": delay_days,
            "status": "Active",
            "triggerDate": timestamp,
            "resolvedAt": None,
            "notes": notes
        }
        
        db.collection("escalations").document().set(esc_data)
        
        # Log Audit
        AuditService.log_event(
            actor_id="Cron_SLA_Daemon",
            actor_name="Compliance Audit Bot",
            role="System Administrator",
            action="Auto-Escalated SLA Breach",
            rationale=f"Compliance trigger activated for {escalation_type}. Notes: {notes}"
        )
        return True

    @staticmethod
    def resolve_escalation(admin_profile, escalation_id, resolution_notes):
        db = get_db()
        esc_ref = db.collection("escalations").document(escalation_id)
        esc = esc_ref.get()
        if not esc.exists:
            raise ValueError("Target escalation event not found.")
            
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
        esc_ref.update({
            "status": "Resolved",
            "resolvedAt": timestamp,
            "resolvedBy": admin_profile["uid"],
            "resolutionNotes": resolution_notes
        })
        
        AuditService.log_event(
            actor_id=admin_profile["uid"],
            actor_name=admin_profile["name"],
            role=admin_profile["role"],
            action="Resolved SLA Escalation",
            rationale=f"Escalation manually closed by HR Admin. Resolution notes: {resolution_notes}"
        )
        return True
