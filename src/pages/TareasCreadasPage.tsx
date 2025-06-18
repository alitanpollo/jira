import React from 'react';
import { JiraTableEnhanced } from '../components/JiraTableEnhanced';

const TareasCreadasPage = () => {
  return (
    <div className="container mx-auto px-4">
      <div className="py-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Tareas de Jira Creadas</h2>
        <p className="mb-6 text-gray-600">
          En esta vista se muestran únicamente cambios con un ID de Jira válido. 
          Podrás actualizar los estados de dichas tareas.
        </p>
        <JiraTableEnhanced viewType="creadas" />
      </div>
    </div>
  );
};

export default TareasCreadasPage;
