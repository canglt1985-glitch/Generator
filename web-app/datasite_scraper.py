"""
DataSite Background Auto-Sync
This module handles the extraction from DataSite API and importing to VHKT Database.
"""
import requests
import json
import time
import os
import logging
from datetime import datetime
from datasite_utils import import_all_datasite_samples
from models import db

DATASITE_URL_BASE = "http://10.0.35.3:8080/data_site"

def get_session_id(username, password):
    """
    Login to DataSite and get a valid sessionid.
    Note: Replace with actual DataSite login API or auth flow if different.
    """
    login_url = f"{DATASITE_URL_BASE}/login/check_login" # Example endpoint, adjust as needed
    # Make a mock logic or a real request if you have the exact login pattern
    # For now, we simulate returning a session ID or None
    
    # In reality you might need a requests.Session to maintain cookies, 
    # but the API definition says you pass "sessionid" in the JSON payload natively.
    return "MOCK_SESSION_ID_12345"

def request_export_job(session_id, obj_def_id, area_id="R.6.5.2"):
    """
    Send the command to export an Excel file for a specific asset type.
    """
    export_url = f"{DATASITE_URL_BASE}/area/get_file_object_instance"
    payload = {
        "sessionid": session_id,
        "obj_def_id": obj_def_id,
        "area_id": area_id
    }
    try:
        res = requests.post(export_url, json=payload, timeout=10)
        # Expected response might contain an export Job ID (session_id for polling)
        data = res.json()
        return data.get('session_id') # e.g. "export_12345"
    except Exception as e:
        logging.error(f"Error requesting export for {obj_def_id}: {e}")
        return None

def poll_and_download(export_job_id, download_dir):
    """
    Poll the status of the export and download the file when ready.
    """
    poll_url = f"{DATASITE_URL_BASE}/bigdata/getsessionstatus"
    payload = {
        "session_id": export_job_id,
        "user_name": "bot_sync", 
        "id": 46 # Standard ID found in discovery
    }
    
    max_retries = 30
    retry = 0
    poll_interval_sec = 2
    
    while retry < max_retries:
        try:
            res = requests.post(poll_url, json=payload, timeout=5)
            data = res.json()
            
            # Assuming 'status' == 1 means complete and it gives 'file_url'
            if data.get('status') == 1 and 'file_url' in data:
                file_url = f"{DATASITE_URL_BASE}{data['file_url']}"
                
                # Setup local save path
                os.makedirs(download_dir, exist_ok=True)
                local_file = os.path.join(download_dir, f"export_{export_job_id}.xlsx")
                
                # Download actual file
                f_res = requests.get(file_url, stream=True)
                with open(local_file, 'wb') as f:
                    for chunk in f_res.iter_content(chunk_size=8192):
                        f.write(chunk)
                        
                return local_file
                
            elif data.get('status') == -1:
                logging.error(f"Export Job {export_job_id} failed on server.")
                return None
                
        except Exception as e:
            logging.error(f"Error polling status: {e}")
            
        retry += 1
        time.sleep(poll_interval_sec)
        
    logging.warning(f"Timeout waiting for export {export_job_id}")
    return None

def perform_datasite_sync():
    """
    Master function to coordinate the sync sequence.
    Can be called by APScheduler or triggered manually via button.
    """
    logging.info("Starting Auto-Sync from DataSite...")
    session_id = get_session_id('admin', 'password')
    if not session_id:
        logging.error("Failed to authenticate to DataSite.")
        return False
        
    # Map of Asset Type Code -> obj_def_id in DataSite
    # Note: Placed placeholder OBJ_DEF_IDs here, they need to match DataSite exactly
    asset_types = {
         'COT_ANTEN': 1001,
         'MAY_LANH': 1002,
         'MAY_PHAT': 1003,
         'PHONG_MAY': 1004,
         'PHONG_MPD': 1005,
         'ACCU': 1006,
         'TU_NGUON': 1007
    }
    
    download_dir = os.path.join(os.getcwd(), 'tmp_datasite_sync')
    total_imported = 0
    
    from app import app
    with app.app_context():
        # Using context so we can interact with DB safely
        for asset_code, obj_id in asset_types.items():
             logging.info(f"Requesting export for {asset_code}...")
             job_id = request_export_job(session_id, obj_id)
             if job_id:
                 file_path = poll_and_download(job_id, download_dir)
                 if file_path:
                     imported = parse_datasite_excel(file_path, asset_code)
                     if imported > 0:
                         total_imported += imported
                         logging.info(f"Imported {imported} items for {asset_code}")
                     
                     # clean up temp file
                     try:
                         os.remove(file_path)
                     except:
                         pass
                         
        logging.info(f"DataSite Auto-Sync complete. Total assets updated: {total_imported}")
        return total_imported > 0
