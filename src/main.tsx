import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import Nikke from './pages/Nikke'
import { AppHeader } from './components/AppHeader'
import './assets/style/main.scss'
import './assets/app.css'

function App() {
  return (
    <div style={{ paddingTop: '92px' }}>
      <AppHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/nikke" element={<Nikke />} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
