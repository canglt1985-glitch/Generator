import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook lấy thông tin user đang đăng nhập và tự động lắng nghe sự thay đổi.
 * Trả về { user, displayName, email, isLoading }
 */
export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra session hiện tại khi mount
    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = session.user;
          setUser(u);
          const meta = u.user_metadata || {};
          const name = meta.full_name || meta.name || u.email?.split('@')[0] || '';
          setDisplayName(name);
          setEmail(u.email || '');
        } else {
          setUser(null);
          setDisplayName('');
          setEmail('');
        }
      } catch (err) {
        console.error('Lỗi khi lấy session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    getSession();

    // 2. Lắng nghe thay đổi trạng thái đăng nhập/đăng xuất
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser(u);
        const meta = u.user_metadata || {};
        const name = meta.full_name || meta.name || u.email?.split('@')[0] || '';
        setDisplayName(name);
        setEmail(u.email || '');
      } else {
        setUser(null);
        setDisplayName('');
        setEmail('');
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, displayName, email, isLoading };
}
