import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '@np-manager/shared'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  /**
   * true po zakończeniu rehydracji z sessionStorage.
   * Router czeka na ten sygnał — dzięki temu nie robi błędnych
   * redirectów na /login zanim Zustand wczyta zapisaną sesję.
   *
   * NIE jest persystowany (nie trafia do sessionStorage).
   * Każde odświeżenie strony zaczyna od false i wraca do true
   * po ~1 tick gdy persist middleware zakończy odczyt.
   */
  isHydrated: boolean

  // Akcje
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  setHydrated: (value: boolean) => void
}

/**
 * Store autoryzacji — persystowany w sessionStorage.
 *
 * SessionStorage zamiast localStorage — dane znikają po zamknięciu przeglądarki.
 * Odpowiada to wymogowi wygasania sesji (użytkownik musi logować się ponownie
 * przy każdej nowej sesji przeglądarki).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (token: string, user: AuthUser) =>
        set({ token, user, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      setHydrated: (value: boolean) =>
        set({ isHydrated: value }),
    }),
    {
      name: 'np-manager-auth',
      storage: createJSONStorage(() => sessionStorage),
      // isHydrated celowo pominięty — nie powinien być persystowany
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // onRehydrateStorage: zwraca callback wywoływany po zakończeniu rehydracji
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)
