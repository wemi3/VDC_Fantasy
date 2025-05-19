import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabase'; // or '../../supabase' depending on your structure

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finishLogin = async () => {
      console.log('Window location hash:', window.location.hash);
      console.log('Fetching session from Supabase...');

      // Wait briefly to ensure session is persisted
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.error('Session fetch error or session missing:', error);
        navigate('/login');
        return;
      }

      if (session) {
        const { user } = session;
        const { full_name, avatar_url } = user.user_metadata;

        await supabase.from('users').upsert({
          id: user.id,
          username: full_name,
          avatar_url,
        });

      }
      console.log('Session retrieved:', session);
      navigate('/dashboard');
    };

    finishLogin();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg">Redirecting...</p>
    </div>
  );
}
