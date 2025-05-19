import { supabase } from '../../supabase';

export async function getTeamPoints(playerIds, matchId = null) {
  let query = supabase
    .from('player_match_stats')
    .select('player_id, fantasy_points');

  if (matchId) query = query.eq('match_id', matchId);
  query = query.in('player_id', playerIds);

  const { data, error } = await query;

  if (error) throw error;

  const total = data.reduce((sum, stat) => sum + stat.fantasy_points, 0);
  return total;
}
