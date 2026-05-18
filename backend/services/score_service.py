from datetime import datetime

class ScoreService:
    @staticmethod
    def calculate_progress(uom_type, target, achieved, deadline_str=None, completion_date_str=None):
        """
        Calculate progress percentage based on UoM Type rules.
        """
        uom = uom_type.lower().strip()
        target = float(target)
        achieved = float(achieved)
        
        # 1. Zero-Based Failure Vector
        if uom in ["zero", "zero-based"]:
            # If target is 0 and achieved is 0, then 100% progress.
            # If achieved is greater than 0, then 0% progress (failure breached).
            return 100.0 if achieved == 0 else 0.0
            
        # 2. Timeline Milestones
        elif uom in ["timeline", "date"]:
            if completion_date_str:
                try:
                    comp_date = datetime.strptime(completion_date_str, "%Y-%m-%d")
                    dead_date = datetime.strptime(deadline_str, "%Y-%m-%d") if deadline_str else comp_date
                    
                    if comp_date <= dead_date:
                        return 100.0
                    else:
                        # Late submission - depreciate score linearly (e.g., -5% per day, minimum 50%)
                        days_late = (comp_date - dead_date).days
                        return max(50.0, 100.0 - (days_late * 5.0))
                except Exception:
                    return 0.0
            # If no completion date exists, check status or progress percentage
            return 100.0 if achieved >= target else (achieved / target * 100.0 if target > 0 else 0.0)
            
        # 3. Numeric & Percentage
        else:
            if target == 0:
                return 100.0 if achieved == 0 else 0.0
                
            # Direct calculation (Higher is better)
            raw_progress = (achieved / target) * 100.0
            return round(min(100.0, max(0.0, raw_progress)), 1)
