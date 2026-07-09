import { useQuery } from '@tanstack/react-query'
import { getTelegramProfile } from '../services/telegram'

export function useTelegramUser() {
  return useQuery({
    queryKey: ['telegram-profile'],
    queryFn: async () => getTelegramProfile(),
    staleTime: Infinity,
  })
}
