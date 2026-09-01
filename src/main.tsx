import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import Nikke from './pages/Nikke'
import Rules from './pages/Rules'
import { AppHeader } from './components/AppHeader'
import { Container } from './components/Layout/Container'
import './assets/style/main.scss'

function App() {
  return (
    <Container maxWidth="lg">
      <AppHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/nikke" element={<Nikke />} />
        <Route path="/rules" element={<Rules />} />
      </Routes>
    </Container>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
