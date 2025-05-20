// login.jsx
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID
const REDIRECT_URI = encodeURIComponent('https://vdc-fantasy.vercel.app/discord/callback');
const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=https%3A%2F%2Fvdc-fantasy.vercel.app%2Fcallback&response_type=code&scope=identify`;

export default function Login() {
  const handleLogin = () => {
    // Redirect user to Discord's custom OAuth URL
    window.location.href = oauthUrl;
  };

  return (
    <main className="w-full min-h-screen bg-[#0b0f1a] px-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#12172d] rounded-2xl border border-[#00baff66] shadow-lg p-10">
        <h1 className="text-3xl font-extrabold text-center text-[#00baff] mb-6 tracking-widest uppercase">
          Welcome Back
        </h1>
        <p className="text-center text-[#88cfffcc] mb-8 font-medium tracking-wide">
          Sign in with Discord to access your Fantasy Valorant dashboard
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-[#00baff] hover:bg-[#00d4ff] focus:ring-4 focus:ring-[#00baffcc] focus:outline-none transition rounded-lg py-3 text-[#0b0f1a] font-semibold tracking-wide shadow-md hover:shadow-lg shadow-[#00baff88]"
          aria-label="Sign in with Discord"
        >
          Sign in with Discord
        </button>
      </div>
    </main>
  );
}
