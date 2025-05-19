import { Link, useLocation } from "react-router-dom";

export default function NavBar() {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `px-4 py-2 rounded-md text-sm font-semibold tracking-wide uppercase transition-colors duration-200 ${
      pathname === path
        ? "bg-[#00baff] text-black shadow-[0_0_10px_#00baff]"
        : "text-[#00baffaa] hover:bg-[#00baff33] hover:text-[#00baff] shadow-none"
    }`;

  return (
    <nav className="w-full bg-[#0b0f1a] border-b border-[#00baff33] shadow-[0_2px_10px_#00baff33]">
      <div className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-extrabold tracking-widest text-[#00baff] uppercase">
          Valorant Fantasy
        </h1>
        <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
          <Link to="/dashboard" className={linkClass("/dashboard")}>
            Dashboard
          </Link>
          <Link to="/leaderboard" className={linkClass("/leaderboard")}>
            Leaderboard
          </Link>
          <Link to="/team-builder" className={linkClass("/team-builder")}>
            Team Builder
          </Link>
        </div>
      </div>
    </nav>
  );
}
