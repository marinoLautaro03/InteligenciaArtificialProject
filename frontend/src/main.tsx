import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/shell.css'
import './styles/components.css'
import App from './App.tsx'
import {esUY} from "@clerk/localizations";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} localization={esUY} >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
