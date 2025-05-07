import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../supabase/config';

export const fetchResources = createAsyncThunk(
  'placement/fetchResources',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addResource = createAsyncThunk(
  'placement/addResource',
  async ({ file, title, description, type }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Log auth state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session);
      if (sessionError || !session) {
        throw new Error('No active session found');
      }
      console.log('User role:', user.role);

      // Validate file
      if (!file) {
        throw new Error('No file provided for upload');
      }

      // Log file details
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Validate file type (only allow PDFs)
      const allowedTypes = ['application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only PDFs are allowed.');
      }

      // Validate file size (e.g., max 10MB)
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeInBytes) {
        throw new Error('File size exceeds 10MB limit.');
      }

      // Generate file name without folder structure
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`; // Removed pdfs/ folder
      console.log('Uploading file:', fileName);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload file to storage');
      }

      console.log('File uploaded successfully:', uploadData);

      // Generate public URL
      const { data: urlData } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to generate public URL for the uploaded file');
      }

      console.log('Public URL generated:', urlData.publicUrl);

      // Create resource entry in the database
      const resource = {
        title,
        description,
        type,
        link: urlData.publicUrl,
        created_at: new Date().toISOString(),
        // Removed updated_at since the column doesn't exist in the resources table
      };

      const { data, error } = await supabase
        .from('resources')
        .insert([resource])
        .select()
        .single();

      if (error) throw error;

      console.log('Resource added to database:', data);
      return data;
    } catch (error) {
      console.error('Add resource error:', error);
      return rejectWithValue(error.message || 'An unexpected error occurred while adding resource');
    }
  }
);

export const deleteResource = createAsyncThunk(
  'placement/deleteResource',
  async ({ id, link }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Extract file name from the link
      const fileName = link.split('/').pop(); // Removed folder structure handling
      console.log('Deleting file from storage:', fileName);

      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([fileName]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        throw storageError;
      }

      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('Resource deleted successfully, ID:', id);
      return id;
    } catch (error) {
      console.error('Delete resource error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Rest of the file remains unchanged
export const fetchTips = createAsyncThunk(
  'placement/fetchTips',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('tips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addTip = createAsyncThunk(
  'placement/addTip',
  async ({ title, description }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const tip = {
        title,
        description,
        created_at: new Date().toISOString(),
        // Removed updated_at since the column might not exist in the tips table
      };

      const { data, error } = await supabase
        .from('tips')
        .insert([tip])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTip = createAsyncThunk(
  'placement/updateTip',
  async ({ id, title, description }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const updatedTip = {
        title,
        description,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tips')
        .update(updatedTip)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTip = createAsyncThunk(
  'placement/deleteTip',
  async (id, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { error } = await supabase
        .from('tips')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchFaqs = createAsyncThunk(
  'placement/fetchFaqs',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addFaq = createAsyncThunk(
  'placement/addFaq',
  async ({ question, answer }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const faq = {
        question,
        answer,
        created_at: new Date().toISOString(),
        // Removed updated_at since the column might not exist in the faqs table
      };

      const { data, error } = await supabase
        .from('faqs')
        .insert([faq])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateFaq = createAsyncThunk(
  'placement/updateFaq',
  async ({ id, question, answer }, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const updatedFaq = {
        question,
        answer,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('faqs')
        .update(updatedFaq)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteFaq = createAsyncThunk(
  'placement/deleteFaq',
  async (id, { rejectWithValue, getState }) => {
    try {
      const { user } = getState().auth;
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const placementSlice = createSlice({
  name: 'placement',
  initialState: {
    resources: [],
    tips: [],
    faqs: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResources.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchResources.fulfilled, (state, action) => { state.status = 'succeeded'; state.resources = action.payload; })
      .addCase(fetchResources.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(addResource.pending, (state) => { state.status = 'loading'; })
      .addCase(addResource.fulfilled, (state, action) => { state.status = 'succeeded'; state.resources.push(action.payload); })
      .addCase(addResource.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(deleteResource.fulfilled, (state, action) => { state.resources = state.resources.filter(r => r.id !== action.payload); })
      .addCase(fetchTips.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchTips.fulfilled, (state, action) => { state.status = 'succeeded'; state.tips = action.payload; })
      .addCase(fetchTips.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(addTip.fulfilled, (state, action) => { state.tips.push(action.payload); })
      .addCase(updateTip.fulfilled, (state, action) => {
        const index = state.tips.findIndex(t => t.id === action.payload.id);
        if (index !== -1) state.tips[index] = action.payload;
      })
      .addCase(deleteTip.fulfilled, (state, action) => { state.tips = state.tips.filter(t => t.id !== action.payload); })
      .addCase(fetchFaqs.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchFaqs.fulfilled, (state, action) => { state.status = 'succeeded'; state.faqs = action.payload; })
      .addCase(fetchFaqs.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(addFaq.fulfilled, (state, action) => { state.faqs.push(action.payload); })
      .addCase(updateFaq.fulfilled, (state, action) => {
        const index = state.faqs.findIndex(f => f.id === action.payload.id);
        if (index !== -1) state.faqs[index] = action.payload;
      })
      .addCase(deleteFaq.fulfilled, (state, action) => { state.faqs = state.faqs.filter(f => f.id !== action.payload); });
  },
});

export const { clearError } = placementSlice.actions;
export default placementSlice.reducer;