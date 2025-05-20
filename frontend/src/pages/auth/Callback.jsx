import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import supabase from "../../supabase";

export default function DiscordCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleDiscordCallback = async () => {
      const code = new URLSearchParams(window.location.search).get("code");

      if (!code) {
        navigate("/login");
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

      // Step 1: Get user info from your backend via OAuth code
      const { data } = await axios.post(`${backendUrl}/api/discord/oauth`, { code });

      // Step 2: Upsert user in Supabase locally (optional redundancy, you can keep or remove)
      await supabase.from("users").upsert({
        supabase_user_id: data.supabase_user_id,
        discord_id: data.discord_id,
        username: data.username,
        avatar_url: data.avatar,
      });

      // Step 3: Navigate to dashboard directly after successful OAuth + upsert
      navigate("/dashboard");
    };

    handleDiscordCallback();
  }, [navigate]);

  return <div className="text-white">Connecting your Discord...</div>;
}
