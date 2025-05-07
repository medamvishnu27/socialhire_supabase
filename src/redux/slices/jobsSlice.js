import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../supabase/config';

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addJob = createAsyncThunk(
  'jobs/addJob',
  async (jobData, { rejectWithValue, getState }) => {
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

      const newJob = {
        id: crypto.randomUUID(),
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        type: jobData.type,
        salary: jobData.salary,
        description: jobData.description,
        requirements: jobData.requirements,
        application_url: jobData.application_url || null,
        expiry_date: jobData.expiry_date || null,
        experience_level: jobData.experience_level || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert([newJob])
        .select()
        .single();

      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to add a job.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ id, updatedJob }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session. Please log in again.');
      }

      const jobUpdate = {
        title: updatedJob.title,
        company: updatedJob.company,
        location: updatedJob.location,
        type: updatedJob.type,
        salary: updatedJob.salary,
        description: updatedJob.description,
        requirements: updatedJob.requirements,
        application_url: updatedJob.application_url || null,
        expiry_date: updatedJob.expiry_date || null,
        experience_level: updatedJob.experience_level || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('jobs')
        .update(jobUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to update a job.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
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
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error('Permission denied: You lack the necessary permissions to delete a job.');
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
  jobs: [],
  loading: false,
  error: null,
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearJobsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.push(action.payload);
      })
      .addCase(addJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.jobs.findIndex(job => job.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = state.jobs.filter(job => job.id !== action.payload);
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearJobsError } = jobsSlice.actions;
export default jobsSlice.reducer;
