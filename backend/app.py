from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import json
from datetime import datetime
from jira import JIRA
import logging
from config import JIRA_CONFIG

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8002"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Jira client setup and helper functions
def get_jira_client():
    try:
        return JIRA(
            server=JIRA_CONFIG['url'],
            basic_auth=(JIRA_CONFIG['email'], JIRA_CONFIG['api_token'])
        )
    except Exception as e:
        logger.error(f"Error initializing Jira client: {str(e)}")
        raise

def get_jira_issues():
    try:
        jira = get_jira_client()
        project_key = JIRA_CONFIG['project_key']
        jql_str = f'project = {project_key} ORDER BY created DESC'
        
        issues = jira.search_issues(jql_str, maxResults=50)
        
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
        logger.error(f"Error fetching Jira issues: {str(e)}")
        raise

def update_jira_issue(issue_key, field_updates):
    try:
        jira = get_jira_client()
        issue = jira.issue(issue_key)
        
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
            if field in field_mapping:
                update_fields[field_mapping[field]] = value
        
        issue.update(fields=update_fields)
        return True
    except Exception as e:
        logger.error(f"Error updating Jira issue {issue_key}: {str(e)}")
        raise

@app.route('/api/jira', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_jira_items():
    try:
        issues = get_jira_issues()
        logger.info(f"Successfully fetched {len(issues)} Jira issues")
        return jsonify(issues)
    except Exception as e:
        error_msg = f"Error fetching Jira issues: {str(e)}"
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
    app.run(host='0.0.0.0', port=8088, debug=True)
