import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../supabase/config';

export const fetchMentors = createAsyncThunk(
  'mentors/fetchMentors',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addMentor = createAsyncThunk(
  'mentors/addMentor',
  async (mentorData, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Verify Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session. Please log in again.');
      }

      const newMentor = {
        id: crypto.randomUUID(),
        name: mentorData.name,
        email: mentorData.email,
        expertise: mentorData.expertise,
        experience: Number(mentorData.experience),
        bio: mentorData.bio,
        availability: mentorData.availability,
        session_fee: Number(mentorData.sessionFee),
        rating: Number(mentorData.rating || 5.0),
        topmate: mentorData.topmate || null,
        profile_image: mentorData.profileImage || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('mentors')
        .insert([newMentor])
        .select()
        .single();

      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to add a mentor.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateMentor = createAsyncThunk(
  'mentors/updateMentor',
  async ({ id, ...mentorData }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session. Please log in again.');
      }

      const updatedMentor = {
        name: mentorData.name,
        email: mentorData.email,
        expertise: mentorData.expertise,
        experience: Number(mentorData.experience),
        bio: mentorData.bio,
        availability: mentorData.availability,
        session_fee: Number(mentorData.sessionFee),
        rating: Number(mentorData.rating || 5.0),
        topmate: mentorData.topmate || null,
        profile_image: mentorData.profileImage || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('mentors')
        .update(updatedMentor)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to update a mentor.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteMentor = createAsyncThunk(
  'mentors/deleteMentor',
  async (id, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session. Please log in again.');
      }

      const { error } = await supabase
        .from('mentors')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to delete a mentor.');
        }
        throw error;
      }

      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  mentors: [],
  loading: false,
  error: null,
};

const mentorsSlice = createSlice({
  name: 'mentors',
  initialState,
  reducers: {
    clearMentorsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMentors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMentors.fulfilled, (state, action) => {
        state.loading = false;
        state.mentors = action.payload;
      })
      .addCase(fetchMentors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addMentor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMentor.fulfilled, (state, action) => {
        state.loading = false;
        state.mentors.push(action.payload);
      })
      .addCase(addMentor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateMentor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMentor.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.mentors.findIndex(mentor => mentor.id === action.payload.id);
        if (index !== -1) {
          state.mentors[index] = action.payload;
        }
      })
      .addCase(updateMentor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteMentor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMentor.fulfilled, (state, action) => {
        state.loading = false;
        state.mentors = state.mentors.filter(mentor => mentor.id !== action.payload);
      })
      .addCase(deleteMentor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMentorsError } = mentorsSlice.actions;
export default mentorsSlice.reducer;
