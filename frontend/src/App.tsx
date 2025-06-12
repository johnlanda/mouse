import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { Navbar } from './components/Navbar';
import { Compare } from './components/Compare';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/compare" element={<Compare theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/providers" element={<div className="container mx-auto py-8 px-4"><h1 className="text-3xl font-bold">Providers</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>} />
          <Route path="/news" element={<div className="container mx-auto py-8 px-4"><h1 className="text-3xl font-bold">News</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>} />
          <Route path="/docs" element={<div className="container mx-auto py-8 px-4"><h1 className="text-3xl font-bold">Documentation</h1><p className="text-muted-foreground mt-2">Coming soon...</p></div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;