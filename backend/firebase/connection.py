import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore
from config import Config

logger = logging.getLogger(__name__)

db = None
firebase_app = None

def initialize_firebase():
    global db, firebase_app
    
    # Avoid initializing multiple times
    if firebase_app is not None:
        return db
        
    cred_path = Config.FIREBASE_CREDENTIALS_PATH
    
    try:
        service_account_env = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        if os.path.exists(cred_path):
            logger.info(f"Loading Firebase credentials from file: {cred_path}")
            cred = credentials.Certificate(cred_path)
            firebase_app = firebase_admin.initialize_app(cred)
        elif service_account_env:
            import json
            logger.info("Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT environment variable.")
            try:
                cred_dict = json.loads(service_account_env)
                cred = credentials.Certificate(cred_dict)
                firebase_app = firebase_admin.initialize_app(cred)
            except Exception as e:
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT: {e}")
                # Fallback to default credentials
                options = {}
                project_id = os.environ.get("FIREBASE_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT") or "atomberg-c782a"
                if project_id:
                    options["projectId"] = project_id
                firebase_app = firebase_admin.initialize_app(options=options)
        else:
            logger.warning(f"Firebase key not found at {cred_path}. Falling back to application default credentials.")
            # Fallback to default credentials or let Firebase Admin SDK look in environment variable GOOGLE_CLOUD_PROJECT
            options = {}
            project_id = os.environ.get("FIREBASE_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT") or "atomberg-c782a"
            if project_id:
                options["projectId"] = project_id
            firebase_app = firebase_admin.initialize_app(options=options)
            
        db = firestore.client()
        logger.info("Firebase Firestore client successfully initialized.")
        return db
    except Exception as e:
        logger.critical(f"Failed to initialize Firebase Admin SDK: {str(e)}")
        # In mock / fallback mode for local testing if Firestore is totally offline, we can let it gracefully warn
        raise e

def get_db():
    global db
    if db is None:
        return initialize_firebase()
    return db
