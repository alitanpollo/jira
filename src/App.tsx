import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavigationMenu from './components/NavigationMenu';
import TareasCreadasPage from './pages/TareasCreadasPage';
import CambiosSinIdPage from './pages/CambiosSinIdPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <NavigationMenu />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <Routes>
              <Route path="/tareas-creadas" element={<TareasCreadasPage />} />
              <Route path="/sin-id" element={<CambiosSinIdPage />} />
              <Route path="/" element={<Navigate to="/tareas-creadas" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
