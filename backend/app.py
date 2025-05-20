from flask import Flask, request, jsonify
from supabase import create_client, Client
from flask_cors import CORS
import time
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Frontend URL for password reset
FRONTEND_URL = 'http://localhost:3000'

# Middleware to check admin role
def check_admin_role(user_id):
    try:
        user_data = supabase.table('users').select('role').eq('id', user_id).single().execute()
        if not user_data.data or user_data.data['role'] != 'admin':
            return False
        return True
    except Exception as e:
        print(f"Error checking admin role: {str(e)}")
        return False

# Authentication Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    try:
        response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        user = response.user

        user_data = supabase.table('users').select('id, username, role').eq('id', user.id).single().execute()
        return jsonify({
            'id': user_data.data['id'],
            'username': user_data.data['username'],
            'role': user_data.data['role']
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        supabase.auth.sign_out()
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# Password reset routes
@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    try:
        # Make sure the reset URL is correctly formatted for Supabase redirect
        reset_url = f"{FRONTEND_URL}/reset-password"
        
        # Debug log
        print(f"Sending password reset email to {email} with redirect URL: {reset_url}")
        
        # Use Supabase's password reset function
        response = supabase.auth.reset_password_email(
            email,
            options={
                'redirect_to': reset_url
            }
        )
        
        # Additional logging
        print(f"Password reset response: {response}")
        
        return jsonify({
            'message': 'Password reset email sent successfully',
            'email': email
        })
    except Exception as e:
        error_msg = str(e)
        print(f"Error sending password reset email: {error_msg}")
        return jsonify({'message': error_msg}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')
    
    if not token or not new_password:
        return jsonify({'message': 'Token and new password are required'}), 400
    
    try:
        # Log token (masked for security)
        token_preview = token[:5] + '...' if token and len(token) > 5 else 'invalid token'
        print(f"Attempting to reset password with token: {token_preview}")
        
        # Use direct API call to Supabase (most reliable approach)
        import requests
        
        # Endpoint for updating user with password
        api_url = f"{SUPABASE_URL}/auth/v1/user"
        
        # Headers must include the token as Bearer token
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Payload with new password
        payload = {
            "password": new_password
        }
        
        print(f"Making direct API call to Supabase auth API")
        response = requests.put(api_url, json=payload, headers=headers)
        
        # Log response status
        print(f"Supabase API response status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"Password reset successful")
            return jsonify({'message': 'Password reset successfully'})
        else:
            try:
                error_response = response.json()
                error_message_detail = error_response.get('msg', error_response.get('message', 'Unknown error'))
                error_code_detail = error_response.get('error_code', error_response.get('code', None))

                if error_code_detail == 'same_password' or "same password" in str(error_message_detail).lower():
                    # Log this specific, handled scenario as info
                    print(f"Info: Password reset attempt for token {token_preview} failed due to 'same_password' rule. Supabase details: {error_response}. Returning 400 to client.")
                    specific_user_message = "Your new password must be different from your old password. Please choose a different password."
                    return jsonify({'message': specific_user_message, 'error_code': 'same_password'}), 400
                else:
                    # For other non-200 Supabase responses, this is more unexpected
                    print(f"Warning: Supabase API returned unexpected status {response.status_code} during password reset for token {token_preview}. Details: {error_response}")
                    raise Exception(f"API error from Supabase: {error_message_detail} (Status: {response.status_code})")
            except ValueError: # Handles cases where response.json() fails
                print(f"Error: Supabase API returned non-JSON response with status {response.status_code} during password reset for token {token_preview}. Response text: {response.text}")
                raise Exception(f"API error from Supabase: Status code {response.status_code}, Response: {response.text}")
        
    except Exception as e:
        error_msg_str = str(e)
        print(f"Error resetting password: {error_msg_str}")
        
        # Default user message
        user_facing_message = "Password reset failed. The reset link may be invalid or expired, or the password did not meet requirements. Please request a new password reset or try a different password."
        
        # If the exception was specifically our refined 'same_password' case that bubbled up for some reason,
        # or if the generic exception string contains the same_password hint.
        if "same_password" in error_msg_str or "must be different from your old password" in error_msg_str :
             user_facing_message = "Your new password must be different from your old password. Please choose a different password."
        
        return jsonify({'message': user_facing_message, 'error': error_msg_str}), 400

# Logs Route
@app.route('/api/logs', methods=['GET'])
def get_logs():
    max_retries = 3
    retry_delay = 1  # seconds

    for attempt in range(max_retries):
        try:
            logs_response = supabase.table('anomaly_logs').select(
                'id, timestamp, event_id, level, source, message, hostname, cpu_usage, memory_usage, is_anomaly, anomaly_score, anomaly_causes!anomaly_causes_anomaly_id_fkey(id, anomaly_type, cause, recommendation, device_type)'
            ).eq('is_anomaly', True).order('timestamp', desc=True).execute()

            logs = logs_response.data

            cause_ids = set()
            for log in logs:
                causes = log.get('anomaly_causes', [])
                for cause in causes:
                    cause_id = cause.get('id')
                    if cause_id:
                        cause_ids.add(cause_id)

            scripts_response = supabase.table('anomaly_scripts').select('cause_id, script_content').in_('cause_id', list(cause_ids)).execute()
            script_map = {s['cause_id']: s['script_content'] for s in scripts_response.data}

            for log in logs:
                causes = log.get('anomaly_causes', [])
                for cause in causes:
                    cid = cause.get('id')
                    cause['anomaly_scripts'] = {
                        'script_content': script_map.get(cid, 'No script available')
                    }

            return jsonify(logs)
        except Exception as e:
            print(f"Error fetching logs (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                return jsonify({'message': str(e)}), 500

# Metrics Route (Updated with all disk fields)
@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    try:
        metrics_response = supabase.table('system_metrics').select(
            'id, created_at, hostname, cpu_usage_percent, '
            'memory_usage_gb, memory_total_gb, memory_usage_percent, '
            'primary_disk_usage_gb, primary_disk_capacity_gb, primary_disk_usage_percent, '
            'secondary_disk_usage_gb, secondary_disk_capacity_gb, secondary_disk_usage_percent'
        ).order('created_at', desc=True).execute()
        metrics = metrics_response.data
        return jsonify(metrics)
    except Exception as e:
        print(f"Error fetching metrics: {str(e)}")
        return jsonify({'message': str(e)}), 500

# User Management Routes
@app.route('/api/users', methods=['GET'])
def get_users():
    user_id = request.headers.get('X-User-ID')
    if not user_id or not check_admin_role(user_id):
        return jsonify({'message': 'User not allowed'}), 403

    try:
        response = supabase.table('users').select('id, username, email, role, created_at').order('created_at', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    user_id = request.headers.get('X-User-ID')
    if not user_id or not check_admin_role(user_id):
        return jsonify({'message': 'User not allowed'}), 403

    data = request.get_json()
    
    # Validate password length
    password = data.get('password', '')
    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters long'}), 400
    
    try:
        auth_response = supabase.auth.admin.create_user({
            'email': data['email'],
            'password': data['password'],
            'email_confirm': True,
            'user_metadata': {'username': data['username']}
        })

        user_data = supabase.table('users').insert({
            'id': auth_response.user.id,
            'email': data['email'],
            'username': data['username'],
            'role': data['role']
        }).execute()

        return jsonify(user_data.data[0])
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return jsonify({'message': str(e)}), 400

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    requester_id = request.headers.get('X-User-ID')
    if not requester_id or not check_admin_role(requester_id):
        return jsonify({'message': 'User not allowed'}), 403

    if requester_id == user_id:
        return jsonify({'message': 'Cannot delete yourself'}), 403

    try:
        supabase.table('users').delete().eq('id', user_id).execute()
        supabase.auth.admin.delete_user(user_id)
        return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        print(f"Error deleting user: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/users/<user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    requester_id = request.headers.get('X-User-ID')
    if not requester_id or not check_admin_role(requester_id):
        return jsonify({'message': 'User not allowed'}), 403

    if requester_id == user_id:
        return jsonify({'message': 'Cannot change your own role'}), 403

    data = request.get_json()
    try:
        response = supabase.table('users').update({'role': data['role']}).eq('id', user_id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        print(f"Error updating user role: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Anomaly Scripts Routes
@app.route('/api/anomaly_scripts/<cause_id>/status', methods=['PUT'])
def update_script_status(cause_id):
    requester_id = request.headers.get('X-User-ID')
    if not requester_id:
        return jsonify({'message': 'Authentication required'}), 401

    data = request.get_json()
    status = data.get('status')

    try:
        response = supabase.table('anomaly_scripts').update({
            'status': status,
            'updated_at': 'now()'
        }).eq('cause_id', cause_id).execute()

        if not response.data:
            return jsonify({'message': 'No script found for this cause'}), 404

        return jsonify(response.data[0])
    except Exception as e:
        print(f"Error updating script status: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/anomaly_scripts/<cause_id>', methods=['GET'])
def get_script_status(cause_id):
    requester_id = request.headers.get('X-User-ID')
    if not requester_id:
        return jsonify({'message': 'Authentication required'}), 401

    max_retries = 2 # Keep retries low for status checks
    retry_delay = 0.5  # seconds

    for attempt in range(max_retries):
        try:
            response = supabase.table('anomaly_scripts').select('status').eq('cause_id', cause_id).execute()
            if not response.data:
                # If no script record found, it implies no active script, so 'pending' or a specific 'not_found' status
                # For consistency with current frontend, let's assume 'pending' if no script entry.
                return jsonify({'status': 'pending'})  
            return jsonify({'status': response.data[0]['status']})
        except Exception as e:
            error_str = str(e)
            print(f"Error fetching script status for cause_id {cause_id} (attempt {attempt + 1}/{max_retries}): {error_str}")
            if "WinError 10035" in error_str and attempt < max_retries - 1:
                print(f"Retrying due to WinError 10035...")
                time.sleep(retry_delay)
                continue # Retry the loop
            elif attempt < max_retries - 1:
                time.sleep(retry_delay) # General retry for other errors
            else:
                # After max retries, or for non-WinError 10035 on last attempt
                return jsonify({'message': f'Error fetching script status: {error_str}', 'status': 'unknown'}), 500
    # Fallback if loop finishes without returning (should not happen with current logic)
    return jsonify({'message': 'Failed to fetch script status after retries', 'status': 'unknown'}), 500

@app.route('/api/scripts/<cause_id>', methods=['GET'])
def get_script(cause_id):
    requester_id = request.headers.get('X-User-ID')
    if not requester_id:
        return jsonify({'message': 'Authentication required'}), 401

    try:
        response = supabase.table('anomaly_scripts').select('script_content').eq('cause_id', cause_id).execute()
        return jsonify(response.data[0] if response.data else {'script_content': 'No script available'})
    except Exception as e:
        print(f"Error fetching script: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/scripts/<cause_id>', methods=['POST'])
def create_or_update_script(cause_id):
    requester_id = request.headers.get('X-User-ID')
    if not requester_id:
        return jsonify({'message': 'Authentication required'}), 401

    data = request.get_json()
    script_content = data.get('script_content')
    device_type = data.get('device_type', 'unknown')
    recommendation = data.get('recommendation')  # Get recommendation
    agent_uuid = data.get('agent_uuid')  # Get agent_uuid

    if not script_content:
        return jsonify({'message': 'Script content is required'}), 400

    try:
        # If recommendation is not provided, try to get it from anomaly_causes
        if not recommendation:
            # The cause_id is the ID from the anomaly_causes table
            causes_response = supabase.table('anomaly_causes').select('recommendation').eq('id', cause_id).execute()
            if causes_response.data and causes_response.data[0]['recommendation']:
                recommendation = causes_response.data[0]['recommendation']
            else:
                recommendation = None  # Default to null if not found

        # Check if a script already exists for this cause
        existing_script = supabase.table('anomaly_scripts').select('id').eq('cause_id', cause_id).execute()
        
        if existing_script.data:
            # Update existing script
            response = supabase.table('anomaly_scripts').update({
                'script_content': script_content,
                'status': 'pending',
                'updated_at': 'now()',
                'recommendation': recommendation,
                'agent_uuid': agent_uuid
            }).eq('cause_id', cause_id).execute()
        else:
            # Create new script
            response = supabase.table('anomaly_scripts').insert({
                'cause_id': cause_id,
                'script_content': script_content,
                'device_type': device_type,
                'status': 'pending',
                'recommendation': recommendation,
                'agent_uuid': agent_uuid
            }).execute()

        return jsonify(response.data[0])
    except Exception as e:
        print(f"Error saving script: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/agents/hostname/<hostname>', methods=['GET'])
def get_agent_by_hostname(hostname):
    requester_id = request.headers.get('X-User-ID')
    if not requester_id:
        return jsonify({'message': 'Authentication required'}), 401

    try:
        response = supabase.table('agents').select('id, hostname, ip, port, last_seen').eq('hostname', hostname).single().execute()
        if not response.data:
            return jsonify({})  # Return empty object with 200 status code if not found
        return jsonify(response.data)
    except Exception as e:
        print(f"Error fetching agent: {str(e)}")
        return jsonify({}), 200  # Return empty object even on error

@app.route('/api/debug/set_script_status/<cause_id>/<status>', methods=['GET'])
def debug_set_script_status(cause_id, status):
    try:
        # Validate status
        if status not in ['pending', 'queued', 'executing', 'executed', 'failed']:
            return jsonify({'message': 'Invalid status. Must be one of: pending, queued, executing, executed, failed'}), 400
            
        # Update the script status
        response = supabase.table('anomaly_scripts').update({
            'status': status,
            'updated_at': 'now()'
        }).eq('cause_id', cause_id).execute()

        if not response.data:
            return jsonify({'message': 'No script found for this cause'}), 404

        return jsonify({
            'message': f'Script status for cause_id {cause_id} set to {status}',
            'data': response.data[0]
        })
    except Exception as e:
        print(f"Error setting script status: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Dashboard stats endpoint
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    max_retries = 3
    retry_delay = 1  # seconds

    for attempt in range(max_retries):
        try:
            # Get count of agents (PCs)
            agents_count_response = supabase.table('agents').select('count', count='exact').execute()
            agents_count = agents_count_response.count if hasattr(agents_count_response, 'count') else 0
            
            # Get count of routers
            routers_count_response = supabase.table('routers').select('count', count='exact').execute()
            routers_count = routers_count_response.count if hasattr(routers_count_response, 'count') else 0
            
            # Get count of anomalies (including both PC and router alerts)
            anomalies_count_response = supabase.table('anomaly_logs').select('count', count='exact').eq('is_anomaly', True).execute()
            anomalies_count = anomalies_count_response.count if hasattr(anomalies_count_response, 'count') else 0
            
            # Get count of router alerts
            router_alerts_count_response = supabase.table('alerts').select('count', count='exact').execute()
            router_alerts_count = router_alerts_count_response.count if hasattr(router_alerts_count_response, 'count') else 0
            
            # Total anomalies including both PC anomalies and router alerts
            total_anomalies = anomalies_count + router_alerts_count
            
            return jsonify({
                'pc_count': agents_count,
                'router_count': routers_count,
                'total_devices': agents_count + routers_count,
                'anomalies_count': total_anomalies
            })
        except Exception as e:
            print(f"Error fetching dashboard stats (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                return jsonify({'message': str(e)}), 500

@app.route('/api/routers', methods=['GET'])
def get_routers():
    try:
        # Get all routers
        routers_response = supabase.table('routers').select('*').execute()
        routers = routers_response.data if routers_response.data else []
        
        # Get all alerts in a single query
        alerts_response = supabase.table('alerts').select('*').execute()
        alerts = alerts_response.data if alerts_response.data else []
        
        # Group alerts by router_id
        alerts_by_router = {}
        for alert in alerts:
            router_id = alert.get('router_id')
            if router_id:
                if router_id not in alerts_by_router:
                    alerts_by_router[router_id] = []
                alerts_by_router[router_id].append(alert)
        
        # Add alerts to each router
        for router in routers:
            router['alerts'] = alerts_by_router.get(router['id'], [])
        
        return jsonify(routers)
    except Exception as e:
        print(f"Error fetching routers: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    router_id = request.args.get('router_id')
    try:
        query = supabase.table('alerts').select('*')
        if router_id:
            query = query.eq('router_id', router_id)
        response = query.order('timestamp', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Error fetching alerts: {str(e)}")
        return jsonify({'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0' , port=5000)
