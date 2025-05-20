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

      // Call your backend to exchange code for user info
      const { data } = await axios.post('/api/discord/oauth', { code });

      // Upsert user in Supabase
      await supabase.from('users').upsert({
        discord_id: data.discord_id,
        username: data.username,
        avatar: data.avatar,
      });

      // You can set a local session or Supabase cookie, or redirect
      navigate('/dashboard');
    };

    handleDiscordCallback();
  }, [navigate]);

  return <div className="text-white">Connecting your Discord...</div>;
}
