import { useEffect, useState } from "react";
import supabase from "../supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);

        const { data: fantasyTeams, error: fantasyTeamsError } = await supabase
          .from("fantasy_teams")
          .select("user_id, player_ids");

        if (fantasyTeamsError) throw fantasyTeamsError;

        const playerIds = fantasyTeams.flatMap((team) => team.player_ids);

        const { data: playersData, error: playersError } = await supabase
          .from("players_combine")
          .select("*")
          .in("id", playerIds);

        if (playersError) throw playersError;

        const { data: matchStats, error: matchStatsError } = await supabase
          .from("player_match_stats")
          .select("player_id, fantasy_points")
          .in("player_id", playerIds);

        if (matchStatsError) throw matchStatsError;

        const userIds = fantasyTeams.map((team) => team.user_id);
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, username, avatar_url")
          .in("id", userIds);

        if (usersError) throw usersError;

        const userMap = Object.fromEntries(
          users.map((u) => [u.id, { username: u.username, avatar_url: u.avatar_url }])
        );

        const playerPointsMap = {};
        matchStats.forEach(({ player_id, fantasy_points }) => {
          if (!playerPointsMap[player_id]) playerPointsMap[player_id] = 0;
          playerPointsMap[player_id] += fantasy_points;
        });

        const playersWithPoints = playersData.map((player) => ({
          ...player,
          fantasy_points: playerPointsMap[player.id] || 0,
        }));

        const leaderboardData = fantasyTeams.map((team) => {
          const totalPoints = team.player_ids.reduce((sum, playerId) => {
            const player = playersWithPoints.find((p) => p.id === playerId);
            return sum + (player ? player.fantasy_points : 0);
          }, 0);

          const userInfo = userMap[team.user_id] || { username: "Unknown", avatar_url: "" };

          return {
            user_id: team.user_id,
            username: userInfo.username,
            avatar_url: userInfo.avatar_url,
            total_fantasy_points: totalPoints,
          };
        });

        leaderboardData.sort((a, b) => b.total_fantasy_points - a.total_fantasy_points);

        setLeaderboard(leaderboardData);
      } catch (error) {
        setError("Error fetching leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading)
    return (
      <div className="text-center mt-12 text-[#00baffaa] font-semibold tracking-wide uppercase">
        Loading leaderboard...
      </div>
    );
  if (error)
    return (
      <div className="text-center mt-12 text-red-600 font-semibold tracking-wide uppercase">
        {error}
      </div>
    );

  return (
    <main className="w-full min-h-screen bg-[#0b0f1a] px-6 py-12 text-[#cbd5e1]">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-widest uppercase mb-8 text-[#00baff] border-b border-[#00baff66] pb-3">
          Leaderboard
        </h1>

        {leaderboard.length === 0 ? (
          <p className="text-center text-[#00baff88] mt-12 uppercase tracking-wide font-semibold">
            No teams submitted yet.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm tracking-wide">
            <thead>
              <tr className="text-[#00baff99] uppercase border-b border-[#00baff44]">
                <th className="py-3 px-5 text-left">Rank</th>
                <th className="py-3 px-5 text-left">Team</th>
                <th className="py-3 px-5 text-right">Fantasy Points</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {leaderboard.map((team, index) => (
                  <motion.tr
                    key={team.user_id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className={`border-b border-[#00baff22] hover:bg-[#003f5c66] cursor-default ${
                      index === 0 ? "bg-[#003f5ccc]" : ""
                    }`}
                  >
                    <td className="py-3 px-5 font-mono text-[#00baffcc]">{index + 1}</td>
                    <td className="py-3 px-5 flex items-center gap-3">
                      {team.avatar_url ? (
                        <img
                          src={team.avatar_url}
                          alt={`${team.username} avatar`}
                          className="w-8 h-8 rounded-full object-cover border border-[#00baff44]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#004a7c99] flex items-center justify-center text-xs text-[#00baff66]">
                          ?
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`/team/${team.user_id}`)}
                        className="text-[#00baff] hover:text-[#00d4ff] font-semibold focus:outline-none focus:ring-2 focus:ring-[#00baff] rounded transition"
                        aria-label={`View team details for ${team.username}`}
                      >
                        {team.username}
                      </button>
                    </td>
                    <td className="py-3 px-5 font-mono text-right text-[#00baff] font-semibold">
                      {team.total_fantasy_points.toFixed(2)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
