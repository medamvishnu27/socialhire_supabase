import { Provider, useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from './redux/store';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes/index';
import { supabase } from './utils/supabaseClient';
import { setUser, clearUser } from './redux/slices/authSlice';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, status: authStatus } = useSelector((state) => state.auth);
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  useEffect(() => {
    const syncSession = async (session) => {
      try {
        if (!session) {
          console.log('No session found, clearing user state.');
          dispatch(clearUser());
          return;
        }

        console.log('Session found:', session);
        if (!session || !session.user || !session.user.id) {
          console.error('Invalid session or user id:', session);
          dispatch(clearUser());
          setInitialSessionChecked(true);
          return;
        }

        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('User data fetch error:', fetchError);
          dispatch(clearUser());
        } else if (!userData) {
          // No user found, create new user
          const newUserData = {
            id: session.user.id,
            email: session.user.email,
            display_name: session.user.email.split('@')[0],
            role: session.user.app_metadata?.role || 'user',
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

          const { data: insertedData, error: insertError } = await supabase
            .from('users')
            .upsert([newUserData], { onConflict: 'id' })
            .select()
            .maybeSingle();

          if (insertError) {
            console.error('Error creating user on init:', insertError);
            dispatch(clearUser());
          } else {
            console.log('New user created:', insertedData);
            dispatch(setUser(insertedData));
          }
        } else {
          console.log('User data fetched:', userData);
          dispatch(setUser(userData));
        }
      } catch (err) {
        console.error('Session sync error:', err);
        dispatch(clearUser());
      } finally {
        setInitialSessionChecked(true);
      }
    };

    const checkInitialSession = async () => {
      try {
        console.log('Checking initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Initial session check error:', error.message);
          dispatch(clearUser());
          setInitialSessionChecked(true);
        } else {
          await syncSession(session);
        }
      } catch (err) {
        console.error('Initial session check error:', err);
        dispatch(clearUser());
        setInitialSessionChecked(true);
      }
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'INITIAL_SESSION') {
        return; // Already handled by checkInitialSession
      }

      if (event === 'SIGNED_IN' && session) {
        await syncSession(session);
      } else if (event === 'SIGNED_OUT') {
        dispatch(clearUser());
        // Force navigation to login page after logout
        window.location.href = '/login';
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  if (!initialSessionChecked || authStatus === 'loading') {
    console.log('Rendering loading spinner...');
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <svg
          className="animate-spin h-10 w-10 text-purple-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  console.log('Rendering main app content...');
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
};

export default App;