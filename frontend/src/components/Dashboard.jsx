import { useEffect, useState } from "react";
import supabase from '../supabase';
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const LOCK_DEADLINE = new Date('2025-05-27T23:59:59Z');

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [fantasyTeam, setFantasyTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsLocked(new Date() > LOCK_DEADLINE);
  }, []);

  useEffect(() => {
    const fetchUserAndTeam = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) return setError("Failed to fetch user");

      setUser(user);

      const { data: team, error: teamError } = await supabase
        .from("fantasy_teams")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (teamError) return setError("Failed to fetch fantasy team");

      setFantasyTeam(team);

      const { data: playerData, error: playerError } = await supabase
        .from("players_combine")
        .select("*")
        .in("id", team.player_ids);

      if (playerError) return setError("Failed to fetch player data");

      const { data: matchStats, error: statError } = await supabase
        .from("player_match_stats")
        .select("player_id, fantasy_points")
        .in("player_id", team.player_ids);

      if (statError) return setError("Failed to fetch match stats");

      const playerPointsMap = {};
      matchStats.forEach(({ player_id, fantasy_points }) => {
        playerPointsMap[player_id] = (playerPointsMap[player_id] || 0) + fantasy_points;
      });

      const enriched = playerData.map(p => ({
        ...p,
        fantasy_points: playerPointsMap[p.id] || 0
      }));

      setPlayers(enriched);
      setTotalPoints(enriched.reduce((sum, p) => sum + p.fantasy_points, 0));
    };

    fetchUserAndTeam();

    return () => {
      setUser(null);
      setFantasyTeam(null);
      setPlayers([]);
      setError(null);
    };
  }, [location.pathname]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[#0b0f1a] text-red-500 text-lg font-medium px-6">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[#0b0f1a] text-gray-400 text-lg px-6">
        Loading user...
      </div>
    );
  }

  if (!fantasyTeam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#0b0f1a] text-gray-400 px-6">
        <p className="text-lg font-semibold mb-6 uppercase tracking-wide text-[#00baff]">No fantasy team found.</p>
        <Link to="/team-builder">
          <button
            className="px-6 py-2 bg-[#00baff] rounded-lg text-black font-semibold tracking-wide hover:bg-[#008ecc] focus:outline-none focus:ring-2 focus:ring-[#00baff] focus:ring-offset-2 transition-shadow shadow-lg"
          >
            Create Your Team
          </button>
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#0b0f1a] text-white px-6 py-12 flex justify-center font-sans">
      <section
        className="w-full max-w-6xl bg-[#12172bcc] backdrop-blur-sm rounded-lg border border-[#00baff55] shadow-lg p-10"
        aria-label="User fantasy team dashboard"
      >
        <header className="mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-4xl font-extrabold tracking-tight uppercase text-[#00baff]">
            {user.user_metadata?.user_name || 'Your'} Fantasy Team
          </h1>
          {isLocked && (
            <div className="mt-4 sm:mt-0 px-4 py-2 rounded-md bg-red-900 text-sm font-semibold tracking-wide uppercase shadow-sm">
              Team editing is locked after May 27th.
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {players.map(player => (
              <motion.article
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                layout
                className="relative bg-[rgba(0,186,255,0.05)] border border-[#00baff33] rounded-lg p-6 shadow-[0_0_15px_#00baff66] cursor-default transition duration-300 hover:shadow-[0_0_25px_#00baffcc]"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-wide text-white">{player.name}</h2>
                </div>
                <dl className="grid grid-cols-3 gap-y-4 text-[#a1a1bf] text-sm font-medium tracking-widest uppercase">
                  <div className="flex flex-col items-center border-r border-[#00baff55] pr-4">
                    <dt>MMR</dt>
                    <dd className="mt-1 text-lg text-white">{player.mmr}</dd>
                  </div>
                  <div className="flex flex-col items-center border-r border-[#00baff55] px-4">
                    <dt>Kills</dt>
                    <dd className="mt-1 text-lg text-white">{player.kills}</dd>
                  </div>
                  <div className="flex flex-col items-center pl-4">
                    <dt>Deaths</dt>
                    <dd className="mt-1 text-lg text-white">{player.deaths}</dd>
                  </div>
                  <div className="flex flex-col items-center border-r border-[#00baff55] pr-4">
                    <dt>Assists</dt>
                    <dd className="mt-1 text-lg text-white">{player.assists}</dd>
                  </div>
                  <div className="flex flex-col items-center border-r border-[#00baff55] px-4">
                    <dt>ACS</dt>
                    <dd className="mt-1 text-lg text-white">{player.acs.toFixed(1)}</dd>
                  </div>
                  <div className="flex flex-col items-center pl-4">
                    <dt>Fantasy Points</dt>
                    <dd className="mt-1 text-lg text-white">{player.fantasy_points.toFixed(2)}</dd>
                  </div>
                </dl>
              </motion.article>
            ))}
          </AnimatePresence>
        </section>

        <section className="mt-14 border-t border-[#00baff33] pt-10 text-center">
          <h2 className="text-lg font-semibold uppercase tracking-wide mb-3 text-white">
            Total MMR: <span className="font-mono">{fantasyTeam.mmr_total}</span>
          </h2>
          <h2 className="text-4xl font-extrabold text-[#00baff] mb-10 uppercase tracking-wide">
            Total Score: <span className="font-mono">{totalPoints.toFixed(2)} pts</span>
          </h2>

          {!isLocked ? (
            <Link to="/team-builder">
              <button
                className="px-12 py-3 bg-[#00baff] rounded-lg text-black font-semibold tracking-wide hover:bg-[#008ecc] focus:outline-none focus:ring-2 focus:ring-[#00baff] focus:ring-offset-2 transition-shadow shadow-lg"
              >
                Edit Team
              </button>
            </Link>
          ) : (
            <button
              disabled
              className="px-12 py-3 bg-[#222c3b] rounded-lg text-gray-500 cursor-not-allowed tracking-wide"
            >
              Editing Locked
            </button>
          )}
        </section>
      </section>
    </main>
  );
}
