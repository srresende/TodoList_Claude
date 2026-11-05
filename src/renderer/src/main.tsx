import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NOME_APP } from '@shared/edicao'
import { App } from './App'
import './styles.css'

document.title = NOME_APP

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
