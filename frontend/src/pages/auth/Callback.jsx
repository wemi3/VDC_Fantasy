import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import supabase from '../../supabase';

export default function DiscordCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleDiscordCallback = async () => {
      const code = new URLSearchParams(window.location.search).get('code');

      if (!code) {
        navigate('/login');
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

      const { data } = await axios.post(`${backendUrl}/api/discord/oauth`, { code });

      // Upsert user in Supabase with supabase_user_id (UUID primary key)
      await supabase.from('users').upsert({
        supabase_user_id: data.supabase_user_id, // <- new UUID PK from backend
        discord_id: data.discord_id,
        username: data.username,
        avatar_url: data.avatar,
      });

      // You can set a local session or Supabase cookie, or redirect
      navigate('/dashboard');
    };

    handleDiscordCallback();
  }, [navigate]);

  return <div className="text-white">Connecting your Discord...</div>;
}
