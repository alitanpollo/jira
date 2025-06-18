import React, { useState, useRef } from 'react';
import axios from 'axios';

interface JiraTableEnhancedProps {
  viewType: 'creadas' | 'sinId';
}

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

export const JiraTableEnhanced: React.FC<JiraTableEnhancedProps> = ({ viewType }) => {
  const [items, setItems] = useState<JiraItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(item => 
    viewType === 'creadas'
      ? item.ID_Jira && !item.ID_Jira.startsWith('NEW-')
      : !item.ID_Jira || item.ID_Jira.startsWith('NEW-')
  );

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
      
      // Separate new tasks (without ID) and existing tasks
      const newTasks = items.filter(item => !item.ID_Jira || item.ID_Jira.startsWith('NEW-'));
      const existingTasks = items.filter(item => item.ID_Jira && !item.ID_Jira.startsWith('NEW-') && item.Responsable?.toLowerCase() === 'deploy');
      
      // Create new tasks in Jira
      if (newTasks.length > 0) {
        const response = await axios.post('/api/create-tasks', 
          { tasks: newTasks },
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('Create Tasks Response:', response.data);
        
        // Update the items with the new IDs from Jira
        if (response.data.created_tasks) {
          setItems(prev => prev.map(item => {
            const createdTask = response.data.created_tasks.find((ct: any) => ct.temp_id === item.ID_Jira);
            if (createdTask) {
              return { ...item, ID_Jira: createdTask.jira_id };
            }
            return item;
          }));
        }
      }
      
      // Update existing tasks
      if (existingTasks.length > 0) {
        const response = await axios.post('/api/update', 
          { data: existingTasks },
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('Update Tasks Response:', response.data);
      }
      
      alert(`Información guardada exitosamente. ${newTasks.length} tareas creadas, ${existingTasks.length} tareas actualizadas.`);
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

  const handleAddNewTask = () => {
    const newTask: JiraItem = {
      ID_Jira: `NEW-${Date.now()}`,
      Actividades: '',
      Estado_Jira: 'TO DO',
      CHG: '',
      Status: '',
      Accionable: '',
      Responsable: 'deploy',
      Fecha_inicio: '',
      Fecha_termino: '',
      Servicio: '',
      Estado_despliegues: '',
      Semanas: '',
      Archivos_a_modificar: '',
      Impacto_Tecnologico: '',
      Complejidad: '',
      Prioridad: '',
      Liberacion: ''
    };
    
    setItems(prev => [...prev, newTask]);
  };

  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post('/api/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Import Excel Response:', response.data);
      
      if (response.data.tasks && Array.isArray(response.data.tasks)) {
        const importedTasks = response.data.tasks.map((task: any, index: number) => ({
          ...task,
          ID_Jira: task.ID_Jira || `NEW-${Date.now()}-${index}`,
          Responsable: task.Responsable || 'deploy'
        }));
        
        setItems(prev => [...prev, ...importedTasks]);
        alert(`${importedTasks.length} tareas importadas exitosamente desde Excel.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al importar archivo Excel: ${errorMessage}`);
      console.error('Error importing Excel:', err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      setItems(prev => prev.filter(item => item.ID_Jira !== taskId));
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

  const inputClassName = "w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
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

      <div className="mb-4 space-x-4 flex items-center flex-wrap gap-2">
        {viewType === 'creadas' && (
          <button
            onClick={handleActualizarInfo}
            disabled={loading}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Actualizando...' : 'Actualizar_informacion'}
          </button>
        )}
        
        <button
          onClick={handleGuardarInfo}
          disabled={loading}
          className={`bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {loading ? 'Guardando...' : 'Guardar_informacion'}
        </button>

        {viewType === 'sinId' && (
          <>
            <button
              onClick={handleAddNewTask}
              disabled={loading}
              className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Tarea
            </button>

            <button
              onClick={handleImportExcel}
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Importar Excel
            </button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {loading && (
          <span className="text-gray-600 ml-4">
            Procesando solicitud...
          </span>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Acciones</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">ID_Jira</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Actividades</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Estado_Jira</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">CHG</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Accionable</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Responsable</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Fecha_inicio</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Fecha_termino</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Servicio</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Estado despliegues</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Semanas</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Archivos a modificar</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Impacto Tecnologico</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Complejidad</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Prioridad</th>
              <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">Liberacion</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <tr key={item.ID_Jira} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <button
                    onClick={() => handleDeleteTask(item.ID_Jira)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                    title="Eliminar tarea"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <span className={`${item.ID_Jira.startsWith('NEW-') ? 'text-green-600 font-semibold' : ''}`}>
                    {item.ID_Jira.startsWith('NEW-') ? 'NUEVA' : item.ID_Jira}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Actividades}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Actividades', e.target.value)}
                    className={inputClassName}
                    placeholder="Descripción de la actividad"
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <select
                    value={item.Estado_Jira}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Estado_Jira', e.target.value)}
                    className={inputClassName}
                  >
                    <option value="TO DO">TO DO</option>
                    <option value="IN PROGRESS">IN PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.CHG || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'CHG', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Status || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Status', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Accionable || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Accionable', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Responsable || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Responsable', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="date"
                    value={item.Fecha_inicio || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Fecha_inicio', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="date"
                    value={item.Fecha_termino || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Fecha_termino', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Servicio || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Servicio', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Estado_despliegues || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Estado_despliegues', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Semanas || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Semanas', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Archivos_a_modificar || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Archivos_a_modificar', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Impacto_Tecnologico || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Impacto_Tecnologico', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Complejidad || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Complejidad', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Prioridad || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Prioridad', e.target.value)}
                    className={inputClassName}
                  />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-gray-200">
                  <input
                    type="text"
                    value={item.Liberacion || ''}
                    onChange={(e) => handleInputChange(item.ID_Jira, 'Liberacion', e.target.value)}
                    className={inputClassName}
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

export default JiraTableEnhanced;
