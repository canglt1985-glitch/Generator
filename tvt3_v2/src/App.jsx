import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Datasites from './pages/Datasites';
import ContractDashboard from './pages/ContractDashboard';
import DailyWork from './pages/DailyWork';
import Generator from './pages/Generator';
import Expenses from './pages/Expenses';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="datasites" element={<Datasites />} />
          <Route path="contracts" element={<ContractDashboard />} />
          <Route path="daily-work" element={<DailyWork />} />
          <Route path="generator" element={<Generator />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gray-50 rounded-full p-6 mb-6 border border-gray-100 shadow-sm">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tính năng đang phát triển</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Giao diện trang này đang trong quá trình thiết kế. Anh vui lòng quay lại sau nhé.
              </p>
            </div>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
