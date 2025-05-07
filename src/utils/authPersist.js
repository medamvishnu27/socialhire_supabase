import { supabase } from '../utils/supabaseClient';
import { setUser, clearUser } from '../redux/slices/authSlice';

export const initAuth = async (dispatch) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!session) {
      dispatch(clearUser());
      return;
    }

    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (fetchError) throw fetchError;
    dispatch(setUser(userData));
  } catch (error) {
    console.error('Error initializing session:', error.message);
    dispatch(clearUser());
  }
};