import React, { useState } from 'react';
import axios from 'axios';

interface JiraItem {
  ID_Jira: string;
  Actividades: string;
  Estado_Jira: string;
  CHG?: string;
  Status?: string;
  Accionable?: string;
  Responsable?: string;
  Fecha_inicio?: string;
  Fecha_termino?: string;
  Servicio?: string;
  Estado_despliegues?: string;
  Semanas?: string;
  Archivos_a_modificar?: string;
  Impacto_Tecnologico?: string;
  Complejidad?: string;
  Prioridad?: string;
  Liberacion?: string;
}

export const JiraTable: React.FC = () => {
  const [items, setItems] = useState<JiraItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActualizarInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching data from API...');
      const response = await axios.get('/api/jira', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('API Response:', response.data);
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid data format received from server');
      }
      const newData = response.data;
      
      // Filter out duplicates based on ID_Jira
      const existingIds = new Set(items.map(item => item.ID_Jira));
      const uniqueNewItems = newData.filter((item: JiraItem) => !existingIds.has(item.ID_Jira));
      
      setItems(prev => [...prev, ...uniqueNewItems]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al actualizar la información de Jira: ${errorMessage}`);
      console.error('Error fetching Jira data:', err);
      if (axios.isAxiosError(err)) {
        console.error('API Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Filter items where Responsable is 'deploy'
      const deployItems = items.filter(item => item.Responsable?.toLowerCase() === 'deploy');
      
      if (deployItems.length === 0) {
        alert('No hay elementos para guardar con Responsable "deploy"');
        return;
      }

      const response = await axios.post('/api/update', 
        { data: deployItems },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Save Response:', response.data);
      alert('Información guardada exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al guardar la información: ${errorMessage}`);
      console.error('Error saving data:', err);
      if (axios.isAxiosError(err)) {
        console.error('API Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, field: keyof JiraItem, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.ID_Jira === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-primary animate-fade-in">
        Gestión de Tareas Jira
      </h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="mb-4 space-x-4 flex items-center">
        <button
          onClick={handleActualizarInfo}
          disabled={loading}
          className={`btn btn-primary flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {loading ? 'Actualizando...' : 'Actualizar_informacion'}
        </button>
        <button
          onClick={handleGuardarInfo}
          disabled={loading}
          className={`btn btn-secondary flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {loading ? 'Guardando...' : 'Guardar_informacion'}
        </button>
        {loading && (
          <span className="text-gray-600 ml-4">
            Procesando solicitud...
          </span>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-header">ID_Jira</th>
              <th className="table-header">Actividades</th>
              <th className="table-header">Estado_Jira</th>
              <th className="table-header">CHG</th>
              <th className="table-header">Status</th>
              <th className="table-header">Accionable</th>
              <th className="table-header">Responsable</th>
              <th className="table-header">Fecha_inicio</th>
              <th className="table-header">Fecha_termino</th>
              <th className="table-header">Servicio</th>
              <th className="table-header">Estado despliegues</th>
              <th className="table-header">Semanas</th>
              <th className="table-header">Archivos a modificar</th>
              <th className="table-header">Impacto Tecnologico</th>
              <th className="table-header">Complejidad</th>
              <th className="table-header">Prioridad</th>
              <th className="table-header">Liberacion</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.ID_Jira} className="hover:bg-gray-50">
                <td className="table-cell">{item.ID_Jira}</td>
                <td className="table-cell">{item.Actividades}</td>
                <td className="table-cell">{item.Estado_Jira}</td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.CHG || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'CHG', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Status || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Status', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Accionable || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Accionable', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Responsable || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Responsable', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="date"
                    value={item.Fecha_inicio || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Fecha_inicio', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="date"
                    value={item.Fecha_termino || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Fecha_termino', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Servicio || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Servicio', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Estado_despliegues || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Estado_despliegues', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Semanas || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Semanas', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Archivos_a_modificar || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Archivos_a_modificar', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Impacto_Tecnologico || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Impacto_Tecnologico', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Complejidad || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Complejidad', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Prioridad || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Prioridad', e.target.value)}
                    className="input w-full"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={item.Liberacion || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Liberacion', e.target.value)}
                    className="input w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JiraTable;
