import { useEffect, useState } from "react";
import supabase from "../supabase";

const MAX_TEAM_SIZE = 5;
const MAX_MMR_TOTAL = 1500;
const PLAYERS_PER_PAGE = 50;
const LOCK_DEADLINE = new Date("2025-05-27T23:59:59Z"); // UTC deadline

export default function TeamBuilder() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [search, setSearch] = useState("");
  const [mmrFilter, setMmrFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLocked(new Date() > LOCK_DEADLINE);
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from your backend or supabase as needed
        const res = await fetch("http://localhost:8000/players");
        if (!res.ok) throw new Error("Failed to fetch players");
        const data = await res.json();
        setPlayers(data);
      } catch (err) {
        setError("Failed to load players. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const handleSelect = (player) => {
    if (isLocked) return;
    const alreadySelected = selected.find((p) => p.id === player.id);
    if (alreadySelected) {
      setSelected(selected.filter((p) => p.id !== player.id));
    } else if (
      selected.length < MAX_TEAM_SIZE &&
      getMMRTotal() + player.mmr <= MAX_MMR_TOTAL
    ) {
      setSelected([...selected, player]);
    }
  };

  const getMMRTotal = () => selected.reduce((sum, p) => sum + p.mmr, 0);

  const submitTeam = async () => {
    if (isLocked) {
      setSubmissionStatus("Team submission is locked. Deadline has passed.");
      return;
    }

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        console.error("User fetch error:", error);
        setSubmissionStatus("Please log in to submit your team.");
        return;
      }

      const res = await fetch("http://localhost:8000/fantasy-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_ids: selected.map((p) => p.id),
          mmr_total: getMMRTotal(),
          user_id: user.id,
        }),
      });

      if (res.ok) {
        setSubmissionStatus("Team submitted successfully!");
        setSelected([]);
      } else {
        setSubmissionStatus("Error submitting team. Please try again.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setSubmissionStatus("Error submitting team. Please try again.");
    }
  };

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!mmrFilter || p.mmr <= parseInt(mmrFilter))
  );
  const paginated = filtered.slice(
    (page - 1) * PLAYERS_PER_PAGE,
    page * PLAYERS_PER_PAGE
  );
  const totalPages = Math.ceil(filtered.length / PLAYERS_PER_PAGE);

  if (loading)
    return (
      <div className="text-center mt-12 text-[#00baffaa] font-semibold tracking-wide uppercase">
        Loading players...
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
        <h1 className="text-5xl font-extrabold tracking-widest uppercase mb-10 text-[#00baff] border-b border-[#00baff66] pb-3 text-center">
          Build Your Fantasy Team
        </h1>

        {isLocked && (
          <div className="mb-8 p-5 bg-red-800 rounded-xl text-center font-semibold shadow-lg border border-red-700">
            Team selection is locked. The deadline for submissions has passed.
          </div>
        )}

        {/* Filters */}
        <section className="flex flex-col sm:flex-row gap-5 mb-10 max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            disabled={isLocked}
            className="flex-grow rounded-xl bg-[#12172d] placeholder-gray-500 px-4 py-3 text-gray-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00baff] transition"
            aria-label="Search players"
          />
          <select
            value={mmrFilter}
            onChange={(e) => {
              setMmrFilter(e.target.value);
              setPage(1);
            }}
            disabled={isLocked}
            className="rounded-xl bg-[#12172d] px-4 py-3 text-gray-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00baff] transition"
            aria-label="Filter by MMR"
          >
            <option value="">All MMR</option>
            <option value="1000">≤ 1000 MMR</option>
            <option value="1250">≤ 1250 MMR</option>
            <option value="1500">≤ 1500 MMR</option>
          </select>
        </section>

        {/* Players Grid */}
        <section
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-7xl mx-auto"
          aria-label="Players list"
        >
          {paginated.length ? (
            paginated.map((player) => {
              const isSelected = selected.some((p) => p.id === player.id);
              const disabledSelection =
                !isSelected &&
                (selected.length >= MAX_TEAM_SIZE ||
                  getMMRTotal() + player.mmr > MAX_MMR_TOTAL ||
                  isLocked);

              return (
                <div
                  key={player.id}
                  onClick={() => !disabledSelection && handleSelect(player)}
                  className={`
                    cursor-pointer rounded-2xl border-2
                    ${
                      isSelected
                        ? "border-[#00baff] bg-[#00192e] shadow-[0_0_10px_4px_rgba(0,186,255,0.7)]"
                        : "border-gray-700 bg-[#12172d] hover:bg-[#192e4a]"
                    }
                    ${
                      disabledSelection
                        ? "opacity-50 cursor-not-allowed"
                        : "transition-shadow hover:shadow-[#00baff]/50"
                    }
                    p-5 flex flex-col justify-between
                  `}
                  tabIndex={disabledSelection ? -1 : 0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-disabled={disabledSelection}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !disabledSelection)
                      handleSelect(player);
                  }}
                >
                  <h3 className="font-semibold text-lg mb-2 text-[#00baff] truncate">
                    {player.name}
                  </h3>
                  <div className="text-sm space-y-1 text-gray-300">
                    <p>
                      MMR:{" "}
                      <span className="font-medium text-[#00baff]">{player.mmr}</span>
                    </p>
                    <p>
                      K/D/A:{" "}
                      <span className="font-medium">
                        {player.kills}/{player.deaths}/{player.assists}
                      </span>
                    </p>
                    <p>
                      ACS: <span className="font-medium">{player.acs}</span>
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-full text-center text-[#00baff88] uppercase tracking-wide font-semibold mt-12">
              No players found.
            </p>
          )}
        </section>

        {/* Pagination */}
        <nav
          className="flex justify-center items-center gap-8 mt-12 text-gray-400 select-none"
          aria-label="Pagination navigation"
        >
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-5 py-3 rounded-xl bg-[#12172d] hover:bg-[#192e4a] disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Previous page"
          >
            Prev
          </button>
          <span className="text-gray-300">
            Page <strong className="text-[#00baff]">{page}</strong> of{" "}
            <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() =>
              setPage((p) =>
                p * PLAYERS_PER_PAGE < filtered.length ? p + 1 : p
              )
            }
            disabled={page * PLAYERS_PER_PAGE >= filtered.length}
            className="px-5 py-3 rounded-xl bg-[#12172d] hover:bg-[#192e4a] disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Next page"
          >
            Next
          </button>
        </nav>

        {/* Selected Summary */}
        <section
          className="max-w-4xl mx-auto mt-14 bg-[#12172d] p-8 rounded-3xl shadow-2xl border border-[#00baff]"
          aria-label="Selected players summary"
        >
          <h2 className="text-3xl font-semibold mb-6 text-[#00baff] tracking-wide uppercase">
            Selected Players
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300 max-h-60 overflow-y-auto">
            {selected.map((p) => (
              <li key={p.id} className="truncate">
                {p.name} (MMR:{" "}
                <span className="text-[#00baff] font-semibold">{p.mmr}</span>)
              </li>
            ))}
          </ul>
          <p className="mt-6 text-lg font-semibold text-[#00baff]">
            Total MMR: <span>{getMMRTotal()}</span> / {MAX_MMR_TOTAL}
          </p>
          <button
            onClick={submitTeam}
            disabled={selected.length !== MAX_TEAM_SIZE || isLocked}
            className={`
              mt-8 w-full py-4 rounded-2xl font-bold text-lg
              ${
                selected.length === MAX_TEAM_SIZE && !isLocked
                  ? "bg-[#00baff] text-[#0b0f1a] hover:bg-[#00a0cc]"
                  : "bg-[#0087bd66] text-gray-400 cursor-not-allowed"
              }
              transition
            `}
            aria-disabled={selected.length !== MAX_TEAM_SIZE || isLocked}
          >
            Submit Team
          </button>
        </section>

        {/* Submission Status */}
        {submissionStatus && (
          <div
            className={`mt-8 p-5 rounded-xl shadow-lg text-center font-semibold ${
              submissionStatus.toLowerCase().includes("success")
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
            role="alert"
            aria-live="polite"
          >
            {submissionStatus}
          </div>
        )}
      </div>
    </main>
  );
}
