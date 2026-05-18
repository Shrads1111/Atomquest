import io
import pandas as pd
from firebase.connection import get_db

class ReportService:
    @staticmethod
    def compile_achievements_dataframe(filters=None):
        db = get_db()
        if filters is None:
            filters = {}

        # 1. Fetch all goals
        goals_ref = db.collection("goals")
        goals_docs = goals_ref.get()
        
        data_list = []
        for g_doc in goals_docs:
            g = g_doc.to_dict()
            sheet_id = g.get("sheetId")
            
            # Fetch goal sheet details to map owner and status
            sheet_doc = db.collection("goal_sheets").document(sheet_id).get()
            if not sheet_doc.exists:
                continue
                
            sheet = sheet_doc.to_dict()
            emp_uid = sheet.get("employeeId")
            
            # Fetch employee user profile
            emp_doc = db.collection("users").document(emp_uid).get()
            if not emp_doc.exists:
                continue
                
            emp = emp_doc.to_dict()
            
            # Build unified report row
            row = {
                "Goal ID": g_doc.id,
                "Employee Name": emp.get("name", "Unknown"),
                "Employee Email": emp.get("email", "N/A"),
                "Employee ID": emp.get("employeeId", "N/A"),
                "Department": emp.get("department", "Core R&D Engine"),
                "Reporting Manager": emp.get("managerId", "None"),
                "Goal Objective": g.get("title", ""),
                "Thrust Area": g.get("thrustArea", ""),
                "UoM Type": g.get("uom", "percentage"),
                "Target Value": g.get("target", 0.0),
                "Actual Achieved": g.get("achieved", 0.0),
                "Realization Progress %": g.get("progress", 0.0),
                "Allocation Weight %": float(g.get("weightage", 0.0)) * 100 if float(g.get("weightage", 0.0)) <= 1.0 else float(g.get("weightage", 0.0)),
                "Goal Status": g.get("status", "Not Started"),
                "Cycle ID": sheet.get("cycleId", "q3_2026"),
                "Sheet Lock Status": sheet.get("lockStatus", "unlocked"),
                "Approval Status": sheet.get("status", "Draft"),
            }
            
            # Apply dynamic filters
            match = True
            for k, v in filters.items():
                if not v:
                    continue
                # Normalize keys
                if k == "department" and row["Department"].lower() != v.lower():
                    match = False
                elif k == "manager" and row["Reporting Manager"].lower() != v.lower():
                    match = False
                elif k == "employee" and emp_uid != v:
                    match = False
                elif k == "status" and row["Goal Status"].lower() != v.lower():
                    match = False
                elif k == "approval_state" and row["Approval Status"].lower() != v.lower():
                    match = False
                elif k == "cycle" and row["Cycle ID"].lower() != v.lower():
                    match = False
                    
            if match:
                data_list.append(row)
                
        df = pd.DataFrame(data_list)
        if df.empty:
            # Create blank skeleton df
            df = pd.DataFrame(columns=[
                "Goal ID", "Employee Name", "Employee Email", "Employee ID", 
                "Department", "Reporting Manager", "Goal Objective", 
                "Thrust Area", "UoM Type", "Target Value", "Actual Achieved", 
                "Realization Progress %", "Allocation Weight %", "Goal Status"
            ])
        return df

    @staticmethod
    def export_report(format_type, filters=None):
        """
        Builds the report and serializes it to Bytes for HTTP attachments.
        """
        df = ReportService.compile_achievements_dataframe(filters)
        
        if format_type.lower() == "excel":
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name="Q3 Performance Summary")
            output.seek(0)
            return output.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Performance_Report.xlsx"
        else:
            # Default CSV
            output = io.StringIO()
            df.to_csv(output, index=False)
            return output.getvalue().encode('utf-8'), "text/csv", "Performance_Report.csv"
