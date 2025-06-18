import React from 'react';
import { JiraTableEnhanced } from '../components/JiraTableEnhanced';

const CambiosSinIdPage = () => {
  return (
    <div className="container mx-auto px-4">
      <div className="py-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Cambios sin ID de Jira</h2>
        <p className="mb-6 text-gray-600">
          En esta vista podrás agregar cambios sin una tarea de Jira y también importar datos desde un archivo Excel para un mejor orden.
        </p>
        <JiraTableEnhanced viewType="sinId" />
      </div>
    </div>
  );
};

export default CambiosSinIdPage;
