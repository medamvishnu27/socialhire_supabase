import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../utils/supabaseClient';

// Register user
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ email, password, display_name }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: display_name },
        },
      });

      if (error) return rejectWithValue(error.message);

      const { user } = data;
      if (!user) return rejectWithValue('User registration failed.');

      const userData = {
        id: user.id,
        email: user.email,
        display_name: display_name || user.email.split('@')[0],
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phone: '',
        location: '',
        education: '',
        skills: '',
        experience: '',
        portfolio: '',
        bio: '',
        profile_image: '',
      };

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .upsert([userData], { onConflict: 'id' })
        .select()
        .single();

      if (insertError) return rejectWithValue(insertError.message);

      return insertedUser;
    } catch (err) {
      return rejectWithValue(err.message || 'Registration failed.');
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password, isAdmin = false }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) return rejectWithValue(error.message);

      const { user } = data;
      if (!user) return rejectWithValue('Login failed.');

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) return rejectWithValue(fetchError.message);

      if (isAdmin && userData.role !== 'admin') {
        await supabase.auth.signOut();
        return rejectWithValue('Unauthorized as admin.');
      }

      return userData;
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed.');
    }
  }
);

// Google login
export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) return rejectWithValue(error.message);

      return null; // login happens on redirect
    } catch (err) {
      return rejectWithValue(err.message || 'Google login failed.');
    }
  }
);

// Logout
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return rejectWithValue(error.message);
      return null;
    } catch (err) {
      return rejectWithValue(err.message || 'Logout failed.');
    }
  }
);

// Request password reset
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) return rejectWithValue(error.message);
      return { success: true };
    } catch (err) {
      return rejectWithValue(err.message || 'Password reset request failed.');
    }
  }
);

// Update password
export const updatePassword = createAsyncThunk(
  'auth/updatePassword',
  async (newPassword, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return rejectWithValue(error.message);
      return { success: true };
    } catch (err) {
      return rejectWithValue(err.message || 'Password update failed.');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.status = 'succeeded';
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(googleLogin.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = 'idle';
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updatePassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updatePassword.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setUser, clearUser, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
