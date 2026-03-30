import { RouterProvider } from 'react-router-dom'
import { router } from './router'

/**
 * Główny komponent aplikacji.
 * Dostarcza router do całego drzewa komponentów.
 *
 * Przyszłe dodatki (odpowiednie sprinty):
 *  - QueryClientProvider (TanStack Query) — Sprint 1
 *  - Toaster (powiadomienia toast) — Sprint 5
 */
export default function App() {
  return <RouterProvider router={router} />
}
