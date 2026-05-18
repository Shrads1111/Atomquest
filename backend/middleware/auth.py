from functools import wraps
import logging
from flask import request, jsonify
from firebase_admin import auth
from firebase.connection import get_db

logger = logging.getLogger(__name__)

def role_required(allowed_roles=None):
    if allowed_roles is None:
        allowed_roles = []
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]
        
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Development fallback checking: allow testing backend APIs with mock headers
            mock_uid = request.headers.get("X-Mock-UID")
            mock_role = request.headers.get("X-Mock-Role")
            
            if mock_uid and mock_role:
                logger.info(f"Using Mock Identity: UID={mock_uid}, Role={mock_role}")
                request.user = {
                    "uid": mock_uid,
                    "name": request.headers.get("X-Mock-Name", "Mock User"),
                    "email": request.headers.get("X-Mock-Email", "mock@company.com"),
                    "role": mock_role,
                    "employeeId": request.headers.get("X-Mock-EmpID", "EMP-9999"),
                    "department": request.headers.get("X-Mock-Dept", "Core R&D Engine"),
                    "managerId": request.headers.get("X-Mock-ManagerID", "None")
                }
                
                # Role check
                if allowed_roles and mock_role not in allowed_roles:
                    return jsonify({"error": f"Role '{mock_role}' does not have access to this resource."}), 403
                    
                return f(*args, **kwargs)
                
            # Production authentication logic via Firebase ID Token
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid authorization credentials"}), 401
                
            token = auth_header.split("Bearer ")[1]
            try:
                # 1. Decode token
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token["uid"]
                
                # 2. Get profile details from Firestore
                db = get_db()
                user_doc = db.collection("users").document(uid).get()
                if not user_doc.exists:
                    return jsonify({"error": "User profile not found in directory database."}), 403
                    
                user_profile = user_doc.to_dict()
                user_profile["uid"] = uid
                
                # 3. Role authorization checks
                user_role = user_profile.get("role", "employee")
                if allowed_roles and user_role not in allowed_roles:
                    return jsonify({
                        "error": f"Access forbidden. Required roles: {allowed_roles}. Current role: {user_role}"
                    }), 403
                    
                # Store user profile in request context
                request.user = user_profile
                
            except Exception as e:
                logger.error(f"Authentication token verification failure: {str(e)}")
                return jsonify({"error": f"Token verification failed: {str(e)}"}), 401
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
