import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import jobsReducer from './slices/jobsSlice';
import mentorsReducer from './slices/mentorsSlice';
import webinarsReducer from './slices/webinarsSlice';
import placementReducer from './slices/placementSlice';
import sessionReducer from './slices/webinarsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobs: jobsReducer,
    mentors: mentorsReducer,
    webinars: webinarsReducer,
    placement: placementReducer,
    session: sessionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser', 'placement/uploadResource', 'session/subscribeToSessions'],
        ignoredActionPaths: ['payload.file', 'meta.arg.file', 'payload.createdAt', 'payload.updatedAt', 'payload.created_at', 'payload.updated_at'],
        ignoredPaths: [
          'auth.user.createdAt',
          'auth.user.updatedAt',
          'auth.user.created_at',
          'auth.user.updated_at',
          'placement.resources',
          'session.sessions',
        ],
      },
    }),
});