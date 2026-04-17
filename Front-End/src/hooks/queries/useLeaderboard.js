import { useQuery } from '@tanstack/react-query';
import { leaderboardAPI } from '../../api/leaderboard';

export function useLeaderboard(params = {}, options = {}) {
  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: () => leaderboardAPI.getLeaderboard(params),
    staleTime: 1000 * 30,
    ...options,
  });
}
