import { supabase } from './supabase/config';

export const checkFeatureAccess = async (userId, feature) => {
  try {
    const { data, error } = await supabase
      .from('user_features')
      .select('features')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking feature access:', error);
      return false;
    }

    return data?.features?.includes(feature) || false;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
};

export const checkUserRole = async (userId, role) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return data?.role === role;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};