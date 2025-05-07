import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../supabase/config';

export const subscribeToSessions = createAsyncThunk(
  'webinars/subscribeToSessions',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          mentor:mentors (
            id,
            name,
            expertise
          ),
          student:users!student_id (
            id
          )
        `)
        .order('session_datetime', { ascending: true });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError.message);
        throw sessionsError;
      }

      const sessions = sessionsData.map(item => ({
        id: item.id,
        ...item,
        type: 'session',
        mentor: item.mentor || { id: item.mentor_id, name: 'Unknown', expertise: '' },
        sessionLink: item.session_link,
        student: item.student || (item.student_id ? { id: item.student_id } : null),
        forAllStudents: item.for_all_students,
      }));

      dispatch(setItems(sessions));
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to subscribe to sessions');
    }
  }
);

export const addSession = createAsyncThunk(
  'webinars/addSession',
  async (sessionData, { rejectWithValue, getState }) => {
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

      const dataToInsert = {
        topic: sessionData.topic,
        mentor_id: sessionData.mentorId,
        session_datetime: sessionData.sessionDatetime,
        duration: sessionData.duration || 60,
        session_link: sessionData.sessionLink,
        status: sessionData.status || 'scheduled',
        student_id: sessionData.studentId || null,
        for_all_students: sessionData.forAllStudents || false,
        notes: sessionData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('sessions')
        .insert([dataToInsert])
        .select(`
          *,
          mentor:mentors (
            id,
            name,
            expertise
          )
        `)
        .single();

      if (error) {
        console.error('Error adding session:', error);
        console.log('Full error object:', error);
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to add a session.');
        }
        throw error;
      }

      return {
        id: data.id,
        ...data,
        type: 'session',
        mentor: data.mentor || { id: data.mentor_id, name: 'Unknown', expertise: '' },
        sessionLink: data.session_link,
        student: data.student_id ? { id: data.student_id } : null,
        forAllStudents: data.for_all_students,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add session');
    }
  }
);

export const updateSession = createAsyncThunk(
  'webinars/updateSession',
  async ({ id, ...sessionData }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session. Please log in again.');
      }

      const dataToUpdate = {
        topic: sessionData.topic,
        mentor_id: sessionData.mentorId,
        session_datetime: sessionData.sessionDatetime,
        duration: sessionData.duration || 60,
        session_link: sessionData.sessionLink,
        status: sessionData.status || 'scheduled',
        student_id: sessionData.studentId || null,
        for_all_students: sessionData.forAllStudents || false,
        notes: sessionData.notes || '',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('sessions')
        .update(dataToUpdate)
        .eq('id', id)
        .select(`
          *,
          mentor:mentors (
            id,
            name,
            expertise
          )
        `)
        .single();

      if (error) {
        console.error('Error updating session:', error);
        console.log('Full error object:', error);
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to update a session.');
        }
        throw error;
      }

      return {
        id: data.id,
        ...data,
        type: 'session',
        mentor: data.mentor || { id: data.mentor_id, name: 'Unknown', expertise: '' },
        sessionLink: data.session_link,
        student: data.student_id ? { id: data.student_id } : null,
        forAllStudents: data.for_all_students,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update session');
    }
  }
);

export const deleteSession = createAsyncThunk(
  'webinars/deleteSession',
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
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting session:', error);
        console.log('Full error object:', error);
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to delete a session.');
        }
        throw error;
      }
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete session');
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const webinarsSlice = createSlice({
  name: 'webinars',
  initialState,
  reducers: {
    setItems: (state, action) => {
      state.items = action.payload;
      state.loading = false;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearWebinarsError: (state) => {
      state.error = null;
    },
    clearWebinars: (state) => {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
    updateItemsFromSubscription: (state, action) => {
      const { eventType, table, item, oldId } = action.payload;
      if (eventType === 'INSERT' && item) {
        state.items.push(item);
      } else if (eventType === 'UPDATE' && item) {
        const index = state.items.findIndex(i => i.id === item.id && i.type === 'session');
        if (index !== -1) state.items[index] = item;
      } else if (eventType === 'DELETE' && oldId) {
        state.items = state.items.filter(i => i.id !== oldId || i.type !== 'session');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(subscribeToSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(subscribeToSessions.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(subscribeToSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('Subscription rejected:', action.payload);
      })
      .addCase(addSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSession.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSession.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSession.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setItems, setError, clearWebinarsError, clearWebinars, updateItemsFromSubscription } = webinarsSlice.actions;
export default webinarsSlice.reducer;
