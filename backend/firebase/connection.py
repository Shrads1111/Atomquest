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
        if os.path.exists(cred_path):
            logger.info(f"Loading Firebase credentials from file: {cred_path}")
            cred = credentials.Certificate(cred_path)
            firebase_app = firebase_admin.initialize_app(cred)
        else:
            logger.warning(f"Firebase key not found at {cred_path}. Falling back to application default credentials.")
            # Fallback to default credentials or let Firebase Admin SDK look in environment variable GOOGLE_APPLICATION_CREDENTIALS
            firebase_app = firebase_admin.initialize_app()
            
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
