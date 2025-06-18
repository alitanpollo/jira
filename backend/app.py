from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import json
from datetime import datetime
from jira import JIRA
import logging
import pandas as pd
import os
from werkzeug.utils import secure_filename
from config import JIRA_CONFIG

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8004", "http://localhost:8002", "http://localhost:8003"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept", "Authorization"],
        "expose_headers": ["Content-Type", "X-Total-Count"],
        "supports_credentials": True
    }
})

# Jira client setup and helper functions
def get_jira_client():
    try:
        logger.info(f"Attempting to connect to Jira server: {JIRA_CONFIG['url']}")
        client = JIRA(
            server=JIRA_CONFIG['url'],
            basic_auth=(JIRA_CONFIG['email'], JIRA_CONFIG['api_token'])
        )
        logger.info("Successfully connected to Jira")
        return client
    except Exception as e:
        logger.error(f"Error initializing Jira client: {str(e)}")
        logger.error(f"Jira Config: url={JIRA_CONFIG['url']}, email={JIRA_CONFIG['email']}")
        raise

# Test data for development
TEST_ISSUES = [
    {
        'ID_Jira': 'TEST-1',
        'Actividades': 'Test task 1',
        'Estado_Jira': 'TO DO',
        'CHG': '',
        'Status': '',
        'Accionable': '',
        'Responsable': '',
        'Fecha_inicio': '',
        'Fecha_termino': '',
        'Servicio': '',
        'Estado_despliegues': '',
        'Semanas': '',
        'Archivos_a_modificar': '',
        'Impacto_Tecnologico': '',
        'Complejidad': '',
        'Prioridad': 'Medium',
        'Liberacion': ''
    },
    {
        'ID_Jira': 'TEST-2',
        'Actividades': 'Test task 2',
        'Estado_Jira': 'IN PROGRESS',
        'CHG': '',
        'Status': '',
        'Accionable': '',
        'Responsable': '',
        'Fecha_inicio': '',
        'Fecha_termino': '',
        'Servicio': '',
        'Estado_despliegues': '',
        'Semanas': '',
        'Archivos_a_modificar': '',
        'Impacto_Tecnologico': '',
        'Complejidad': '',
        'Prioridad': 'High',
        'Liberacion': ''
    }
]

def get_jira_issues():
    try:
        jira = get_jira_client()
        project_key = JIRA_CONFIG['project_key']
        jql_str = f'project = {project_key} ORDER BY created DESC'
        
        logger.info(f"Executing JQL query: {jql_str}")
        issues = jira.search_issues(jql_str, maxResults=50)
        logger.info(f"Found {len(issues)} issues")
        
        formatted_issues = []
        for issue in issues:
            formatted_issue = {
                'ID_Jira': issue.key,
                'Actividades': issue.fields.summary,
                'Estado_Jira': issue.fields.status.name,
                'CHG': getattr(issue.fields, 'customfield_CHG', ''),
                'Status': getattr(issue.fields, 'customfield_Status', ''),
                'Accionable': getattr(issue.fields, 'customfield_Accionable', ''),
                'Responsable': getattr(issue.fields, 'assignee.displayName' if issue.fields.assignee else '', ''),
                'Fecha_inicio': getattr(issue.fields, 'customfield_FechaInicio', ''),
                'Fecha_termino': getattr(issue.fields, 'customfield_FechaTermino', ''),
                'Servicio': getattr(issue.fields, 'customfield_Servicio', ''),
                'Estado_despliegues': getattr(issue.fields, 'customfield_EstadoDespliegues', ''),
                'Semanas': getattr(issue.fields, 'customfield_Semanas', ''),
                'Archivos_a_modificar': getattr(issue.fields, 'customfield_ArchivosModificar', ''),
                'Impacto_Tecnologico': getattr(issue.fields, 'customfield_ImpactoTecnologico', ''),
                'Complejidad': getattr(issue.fields, 'customfield_Complejidad', ''),
                'Prioridad': str(issue.fields.priority) if issue.fields.priority else '',
                'Liberacion': getattr(issue.fields, 'customfield_Liberacion', '')
            }
            formatted_issues.append(formatted_issue)
            
        return formatted_issues
    except Exception as e:
        logger.error(f"Error fetching Jira issues, falling back to test data: {str(e)}")
        return TEST_ISSUES

def update_jira_issue(issue_key, field_updates):
    try:
        # For test data, just log the updates
        if issue_key.startswith('TEST-'):
            logger.info(f"Test mode: Would update issue {issue_key} with fields: {field_updates}")
            return True

        # Real Jira update
        try:
            jira = get_jira_client()
            issue = jira.issue(issue_key)
            
            # Handle status transition if Estado_Jira is being updated
            if 'Estado_Jira' in field_updates:
                new_status = field_updates['Estado_Jira']
                transitions = jira.transitions(issue)
                logger.info(f"Available transitions for {issue_key}: {[t['name'] for t in transitions]}")
                
                # Find the transition that matches our desired status
                for transition in transitions:
                    if transition['name'].upper() == new_status.upper():
                        jira.transition_issue(issue, transition['id'])
                        logger.info(f"Updated status for {issue_key} to {new_status}")
                        break
                else:
                    logger.warning(f"No matching transition found for status: {new_status}")
            
            # Handle other field updates
            update_fields = {}
            field_mapping = {
                'CHG': 'customfield_CHG',
                'Status': 'customfield_Status',
                'Accionable': 'customfield_Accionable',
                'Fecha_inicio': 'customfield_FechaInicio',
                'Fecha_termino': 'customfield_FechaTermino',
                'Servicio': 'customfield_Servicio',
                'Estado_despliegues': 'customfield_EstadoDespliegues',
                'Semanas': 'customfield_Semanas',
                'Archivos_a_modificar': 'customfield_ArchivosModificar',
                'Impacto_Tecnologico': 'customfield_ImpactoTecnologico',
                'Complejidad': 'customfield_Complejidad',
                'Liberacion': 'customfield_Liberacion'
            }
            
            for field, value in field_updates.items():
                if field in field_mapping and field != 'Estado_Jira':
                    update_fields[field_mapping[field]] = value
                    logger.info(f"Setting {field} to {value}")
            
            if update_fields:
                issue.update(fields=update_fields)
                logger.info(f"Updated fields for {issue_key}: {update_fields}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating Jira issue {issue_key}: {str(e)}")
            logger.error(f"Update payload was: {field_updates}")
            raise
            
    except Exception as e:
        logger.error(f"Error in update_jira_issue: {str(e)}")
        return False

@app.route('/api/jira', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_jira_items():
    if request.method == 'OPTIONS':
        return jsonify({"message": "OK"}), 200

    try:
        logger.info("Attempting to fetch Jira issues")
        issues = get_jira_issues()  # This will return TEST_ISSUES if there's an error
        logger.info(f"Successfully fetched {len(issues)} issues")
        return jsonify(issues)
    except Exception as e:
        error_msg = f"Error in get_jira_items endpoint: {str(e)}"
        logger.error(error_msg)
        logger.info("Falling back to test data")
        return jsonify(TEST_ISSUES)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_jira_task(task_data):
    try:
        jira = get_jira_client()
        
        # Prepare issue fields
        issue_dict = {
            'project': {'key': JIRA_CONFIG['project_key']},
            'summary': task_data['Actividades'],
            'description': 'Created via Jira Task Manager',
            'issuetype': {'name': 'Task'},
            'assignee': {'name': 'deploy'}
        }
        
        # Add custom fields if they exist
        custom_fields = {
            'CHG': 'customfield_CHG',
            'Status': 'customfield_Status',
            'Accionable': 'customfield_Accionable',
            'Fecha_inicio': 'customfield_FechaInicio',
            'Fecha_termino': 'customfield_FechaTermino',
            'Servicio': 'customfield_Servicio',
            'Estado_despliegues': 'customfield_EstadoDespliegues',
            'Semanas': 'customfield_Semanas',
            'Archivos_a_modificar': 'customfield_ArchivosModificar',
            'Impacto_Tecnologico': 'customfield_ImpactoTecnologico',
            'Complejidad': 'customfield_Complejidad',
            'Liberacion': 'customfield_Liberacion'
        }
        
        for field, jira_field in custom_fields.items():
            if field in task_data and task_data[field]:
                issue_dict[jira_field] = task_data[field]
        
        # Create the issue
        new_issue = jira.create_issue(fields=issue_dict)
        
        # Set initial status if specified
        if task_data.get('Estado_Jira'):
            transitions = jira.transitions(new_issue)
            for t in transitions:
                if t['name'].upper() == task_data['Estado_Jira'].upper():
                    jira.transition_issue(new_issue, t['id'])
                    break
        
        return new_issue.key
        
    except Exception as e:
        logger.error(f"Error creating Jira task: {str(e)}")
        raise

@app.route('/api/create-tasks', methods=['POST', 'OPTIONS'])
@cross_origin()
def create_tasks():
    if request.method == 'OPTIONS':
        return jsonify({"message": "OK"}), 200
        
    try:
        data = request.json
        tasks = data.get('tasks', [])
        
        created_tasks = []
        for task in tasks:
            try:
                jira_id = create_jira_task(task)
                created_tasks.append({
                    'temp_id': task['ID_Jira'],
                    'jira_id': jira_id
                })
                logger.info(f"Created Jira task {jira_id} for temp_id {task['ID_Jira']}")
            except Exception as e:
                logger.error(f"Error creating task {task['ID_Jira']}: {str(e)}")
        
        return jsonify({
            "message": f"Successfully created {len(created_tasks)} tasks",
            "created_tasks": created_tasks
        })
        
    except Exception as e:
        error_msg = f"Error creating tasks: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/import-excel', methods=['POST', 'OPTIONS'])
@cross_origin()
def import_excel():
    if request.method == 'OPTIONS':
        return jsonify({"message": "OK"}), 200
        
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400
            
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            # Read Excel file
            df = pd.read_excel(filepath)
            
            # Convert DataFrame to list of dictionaries
            tasks = df.to_dict('records')
            
            # Clean up the uploaded file
            os.remove(filepath)
            
            return jsonify({
                "message": f"Successfully imported {len(tasks)} tasks",
                "tasks": tasks
            })
            
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            raise
            
    except Exception as e:
        error_msg = f"Error importing Excel file: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/update', methods=['POST', 'OPTIONS'])
@cross_origin()
def update_items():
    try:
        if request.method == 'OPTIONS':
            return jsonify({"message": "OK"}), 200
            
        data = request.json.get('data', [])
        logger.info(f"Received update request for {len(data)} items")
        
        updated_items = []
        for item in data:
            if item.get('Responsable', '').lower() == 'deploy':
                issue_key = item['ID_Jira']
                # Remove fields that shouldn't be updated
                update_data = {k: v for k, v in item.items() 
                             if k not in ['ID_Jira', 'Actividades', 'Estado_Jira']}
                
                if update_jira_issue(issue_key, update_data):
                    updated_items.append(issue_key)
                    logger.info(f"Successfully updated Jira issue {issue_key}")
        
        return jsonify({
            "message": "Updates processed successfully",
            "updated_items": updated_items
        })
    except Exception as e:
        error_msg = f"Error updating Jira issues: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8091, debug=True)
