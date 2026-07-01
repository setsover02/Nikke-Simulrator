import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import Header from './components/Header'
import './assets/style/main.scss'
import './assets/app.css'

function App() {
  return (
    <div style={{ paddingTop: '92px' }}>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
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
