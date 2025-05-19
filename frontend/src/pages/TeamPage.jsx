import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabase from '../supabase';

export default function TeamPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeamAndUser = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', userId)
          .single();
        if (userError) throw userError;
        setUsername(userData?.username || null);

        const { data: fantasyTeam, error: fantasyTeamError } = await supabase
          .from('fantasy_teams')
          .select('player_ids')
          .eq('user_id', userId)
          .single();
        if (fantasyTeamError) throw fantasyTeamError;
        if (!fantasyTeam) throw new Error('Team not found');

        const playerIds = fantasyTeam.player_ids || [];
        if (!playerIds.length) {
          setTeamPlayers([]);
          return;
        }

        const { data: playersData, error: playersError } = await supabase
          .from('players_combine')
          .select('id, name, mmr, kills, deaths, assists, acs')
          .in('id', playerIds);
        if (playersError) throw playersError;

        const { data: matchStats, error: matchStatsError } = await supabase
          .from('player_match_stats')
          .select('player_id, fantasy_points')
          .in('player_id', playerIds);
        if (matchStatsError) throw matchStatsError;

        const fantasyPointsMap = {};
        matchStats.forEach(({ player_id, fantasy_points }) => {
          fantasyPointsMap[player_id] = (fantasyPointsMap[player_id] || 0) + fantasy_points;
        });

        const playersWithPoints = playersData.map(player => ({
          ...player,
          fantasy_points: fantasyPointsMap[player.id] || 0,
        }));

        setTeamPlayers(playersWithPoints);
      } catch (err) {
        setError(err.message || 'Error loading team');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAndUser();
  }, [userId]);

  if (loading)
    return (
      <div
        className="flex justify-center items-center min-h-screen text-gray-400 text-lg font-medium"
        aria-live="polite"
      >
        Loading team...
      </div>
    );
  if (error)
    return (
      <div
        className="flex justify-center items-center min-h-screen text-red-500 font-semibold text-lg"
        aria-live="polite"
      >
        {error}
      </div>
    );

  const totalFantasyPoints = teamPlayers.reduce((sum, p) => sum + p.fantasy_points, 0);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-300 p-6 sm:p-10 flex flex-col items-center">
      <section
        className="w-full max-w-5xl bg-[rgba(20,20,30,0.75)] backdrop-blur-lg rounded-3xl border border-gray-700 shadow-xl p-6 sm:p-10"
        role="region"
        aria-label="Team details"
      >
        <button
          onClick={() => navigate(-1)}
          className="text-[#00baff] hover:underline font-semibold mb-6 focus:outline-none focus:ring-2 focus:ring-[#00baff] rounded transition"
          aria-label="Back to Leaderboard"
        >
          &larr; Back to Leaderboard
        </button>

        <h1 className="text-4xl sm:text-5xl font-extrabold mb-10 tracking-tight text-white text-center">
          {username ? `${username}'s Team` : 'Team'}
        </h1>

        {teamPlayers.length === 0 ? (
          <p className="text-center text-gray-500 text-lg py-10">No players found in this team.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamPlayers.map((player) => (
                <motion.article
                  key={player.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#101622] border border-[#00baff44] rounded-2xl p-6 shadow-[0_0_10px_3px_rgba(0,186,255,0.3)] transition-shadow hover:shadow-[0_0_15px_5px_rgba(0,186,255,0.6)]"
                >
                  <h2 className="text-2xl font-bold text-[#00baff] mb-4">{player.name}</h2>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="font-semibold text-gray-400">MMR</dt>
                      <dd className="text-white">{player.mmr}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-semibold text-gray-400">Kills</dt>
                      <dd className="text-white">{player.kills}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-semibold text-gray-400">Deaths</dt>
                      <dd className="text-white">{player.deaths}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-semibold text-gray-400">Assists</dt>
                      <dd className="text-white">{player.assists}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-semibold text-gray-400">ACS</dt>
                      <dd className="text-white">{player.acs.toFixed(1)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-semibold text-[#00baff]">Fantasy Points</dt>
                      <dd className="font-semibold text-[#00baff]">{player.fantasy_points.toFixed(2)}</dd>
                    </div>
                  </dl>
                </motion.article>
              ))}
            </div>

            <p className="mt-12 text-right text-[#00baff] font-semibold text-2xl tracking-wide">
              Total Fantasy Points: {totalFantasyPoints.toFixed(2)}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
