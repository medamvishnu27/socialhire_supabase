import { supabase } from '../supabase/config';

export const setupStudentCollections = async (studentId) => {
  try {
    // Check if user exists in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, display_name, email, phone, location, education, skills, profile_image, role')
      .eq('id', studentId)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError || `No user with id ${studentId}`);
      return false;
    }

    // Ensure related tables are ready (e.g., sessions)
    // Perform minimal queries to verify table accessibility
    const { error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('student_id', studentId)
      .limit(1);

    if (sessionsError && sessionsError.code !== 'PGRST116') {
      console.error('Error checking sessions:', sessionsError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting up student collections:', error);
    return false;
  }
};