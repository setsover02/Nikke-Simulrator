import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './pages/Home'
import Header from './components/Header'
import './assets/style/theme.scss'
import './assets/style/typography.scss'
import './assets/app.css'

function App() {
  return (
    <div style={{ paddingTop: '92px' }}>
      <Header />
      <Home />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
