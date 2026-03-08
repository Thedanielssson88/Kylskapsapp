import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { seedDatabase } from './services/db';
import { processQueue } from './services/queueService';
import { initLocalEngine } from './services/geminiService';

// -- Importerade vyer --
import { NanoView } from './views/NanoView';
import { SettingsView } from './views/SettingsView';

const HardwareBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener: any = null;
    const initBackListener = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        listener = await CapApp.addListener('backButton', () => {
          if (location.pathname === '/') {
            CapApp.exitApp();
          } else {
            navigate(-1);
          }
        });
      } catch (e) {
        console.error("Backbutton handler error:", e);
      }
    };
    initBackListener();
    return () => {
      if (listener) listener.remove();
    };
  }, [location.pathname, navigate]);
  return null;
};

function App() {
  useEffect(() => {
    try {
      seedDatabase();
      processQueue();
      const summaryMode = localStorage.getItem('SUMMARY_MODE');
      if (summaryMode === 'local') {
        initLocalEngine((percent, text) => {
          if (percent % 20 === 0) console.log(`Laddar AI: ${percent}% - ${text}`);
        });
      }
    } catch (err) {
      console.error("App startup error:", err);
    }
  }, []);

  return (
    <BrowserRouter>
    <HardwareBackButtonHandler />
    <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
    <div className="flex-1 overflow-y-auto no-scrollbar">
    <Routes>
    <Route path="/" element={<NanoView />} />
    <Route path="/settings" element={<SettingsView />} />
    </Routes>
    </div>
    </div>
    </BrowserRouter>
  );
}

export default App;
