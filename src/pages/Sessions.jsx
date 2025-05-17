import { useEffect, useCallback, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { subscribeToSessions, updateSession, clearWebinars, updateItemsFromSubscription } from '../redux/slices/webinarsSlice';
import { FiCalendar, FiClock, FiUser, FiVideo, FiBriefcase } from 'react-icons/fi';
import { supabase } from '../utils/supabaseClient';
import bg3 from '/bg-3.png';

const Sessions = () => {
  const dispatch = useDispatch();
  const { items: allItems, loading: webinarsLoading, error } = useSelector((state) => state.webinars || { items: [], loading: false, error: null });
  const { user, isAuthenticated, status: authStatus } = useSelector((state) => state.auth || { user: null, isAuthenticated: false, status: 'idle' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [initialLoading, setInitialLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    if (authStatus === 'loading') {
      return; // Wait for auth state to resolve
    }

    setInitialLoading(false);

    const fetchAndSubscribe = async () => {
      if (!isAuthenticated || !user) {
        console.log('User not authenticated, skipping session fetch.');
        dispatch(clearWebinars());
        return;
      }

      try {
        console.log('Fetching sessions for user:', user.id);
        await dispatch(subscribeToSessions()).unwrap();
        console.log('Sessions fetched successfully');

        // Set up real-time subscription
        channelRef.current = supabase
          .channel('sessions-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sessions' },
            (payload) => {
              console.log('Real-time update received:', payload);
              const updatedItem = {
                id: payload.new?.id || payload.old?.id,
                ...payload.new,
                type: 'session',
                mentor: payload.new?.mentor || { id: payload.new?.mentor_id, name: payload.new?.mentor_name || 'Unknown', expertise: '' },
                sessionLink: payload.new?.session_link,
                student: payload.new?.student || (payload.new?.student_id ? { id: payload.new?.student_id } : null),
                forAllStudents: payload.new?.for_all_students,
              };
              dispatch(updateItemsFromSubscription({
                eventType: payload.eventType,
                table: 'sessions',
                item: updatedItem,
                oldId: payload.old?.id,
              }));
              checkAndUpdateCompletedSessions();
            }
          )
          .subscribe((status) => {
            console.log('Supabase subscription status:', status);
          });

        checkAndUpdateCompletedSessions(); // Initial check
      } catch (err) {
        console.error('Failed to fetch or subscribe to sessions:', err);
      }
    };

    fetchAndSubscribe();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (isAuthenticated && user) {
        checkAndUpdateCompletedSessions(); // Check every minute
      }
    }, 60000);

    return () => {
      clearInterval(timer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      dispatch(clearWebinars());
    };
  }, [dispatch, isAuthenticated, user, authStatus]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const extractTimeFromDatetime = useCallback((datetimeString) => {
    if (!datetimeString) return 'Unknown Time';
    const date = new Date(datetimeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  const getSessionStatus = useCallback((item) => {
    if (!item.session_datetime) return { text: 'Invalid Date', disabled: true };
    const sessionDate = new Date(item.session_datetime);
    const sessionEndTime = new Date(sessionDate);
    sessionEndTime.setMinutes(sessionEndTime.getMinutes() + (item.duration || 60));

    switch (item.status) {
      case 'cancelled':
        return { text: 'Cancelled', disabled: true };
      case 'completed':
        return { text: 'Completed', disabled: true };
      case 'pending':
        return { text: 'Pending', disabled: true };
      case 'scheduled':
      default:
        if (currentTime < sessionDate) return { text: 'Register', disabled: false, link: item.sessionLink };
        if (currentTime >= sessionDate && currentTime <= sessionEndTime) {
          return { text: 'Join Now', disabled: !item.sessionLink, link: item.sessionLink };
        }
        return { text: 'Ended', disabled: true };
    }
  }, [currentTime]);

  const processItems = useCallback(() => {
    if (!user) return [];
    const userSessions = allItems.filter(
      (item) => item.type === 'session' && (item.student?.id === user?.id || item.forAllStudents)
    );
    return userSessions;
  }, [allItems, user]);

  const sessions = processItems();

  const checkAndUpdateCompletedSessions = useCallback(async () => {
    const userSessions = processItems();
    for (const session of userSessions) {
      try {
        if (!session.session_datetime) {
          console.warn('Skipping session update due to missing session_datetime:', session.id);
          continue;
        }
        const sessionDate = new Date(session.session_datetime);
        const sessionEndTime = new Date(sessionDate);
        sessionEndTime.setMinutes(sessionEndTime.getMinutes() + (session.duration || 60));

        if (session.status === 'scheduled' && currentTime > sessionEndTime) {
          console.log('Updating session to completed:', session.id);
          await dispatch(updateSession({
            id: session.id,
            topic: session.topic,
            mentorId: session.mentor?.id,
            sessionDatetime: session.session_datetime,
            duration: session.duration,
            sessionLink: session.sessionLink,
            status: 'completed',
            studentId: session.student?.id,
            forAllStudents: session.forAllStudents,
            notes: session.notes || '',
          })).unwrap();
        }
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }
  }, [dispatch, processItems, currentTime]);

  const upcoming = sessions.filter((item) => {
    const status = getSessionStatus(item);
    return status.text === 'Register' || status.text === 'Join Now';
  });

  const past = sessions.filter((item) => {
    const status = getSessionStatus(item);
    return status.text === 'Ended' || status.text === 'Completed';
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  };

  const handleJoinSession = (link) => {
    if (link) {
      window.open(link, '_self', 'noopener,noreferrer');
    } else {
      alert('No session link available for this event.');
    }
  };

  const renderItem = (item) => (
    <motion.div
      key={item.id}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
      variants={itemVariants}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span className="text-purple-600 font-semibold">{formatDate(item.session_datetime)}</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-green-100 text-green-800">
            Mentoring Session
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Session with {item.mentor?.name || 'Unknown'}
        </h3>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {item.topic || 'No topic provided'}
        </p>

        <div className="space-y-2 text-sm text-gray-500 mb-6">
          <div className="flex items-center">
            <FiUser className="mr-2 h-4 w-4" />
            {item.mentor?.name || 'Unknown'}
          </div>

          {item.mentor?.expertise && (
            <div className="flex items-center">
              <FiBriefcase className="mr-2 h-4 w-4" />
              {item.mentor.expertise}
            </div>
          )}

          <div className="flex items-center">
            <FiClock className="mr-2 h-4 w-4" />
            {extractTimeFromDatetime(item.session_datetime)} ({item.duration || 60} min)
          </div>

          <div className="flex items-center">
            <FiVideo className="mr-2 h-4 w-4" />
            Online Session
          </div>
        </div>

        <button
          onClick={() => handleJoinSession(getSessionStatus(item).link)}
          className={`w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors ${getSessionStatus(item).disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={getSessionStatus(item).disabled}
        >
          {getSessionStatus(item).text}
        </button>
      </div>
    </motion.div>
  );

  const renderFeaturedItem = (item) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-900 to-purple-700 rounded-xl shadow-xl overflow-hidden"
    >
      <div className="md:flex">
        <div className="md:w-2/3 p-8 text-white">
          <span className="inline-block bg-white bg-opacity-20 rounded-full px-3 py-1 text-sm font-semibold mb-4">
            Featured
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Session with {item.mentor?.name || 'Unknown'}
          </h2>
          <p className="mb-6 text-white text-opacity-90">
            {item.topic || 'No topic provided'}
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center">
              <FiCalendar className="mr-2" />
              {formatDate(item.session_datetime)}
            </div>
            <div className="flex items-center">
              <FiClock className="mr-2" />
              {extractTimeFromDatetime(item.session_datetime)}
            </div>
            <div className="flex items-center">
              <FiUser className="mr-2" />
              {item.mentor?.name || 'Unknown'}
            </div>
            <div className="flex items-center">
              <FiVideo className="mr-2" />
              Online Session
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleJoinSession(getSessionStatus(item).link)}
              className={`bg-white text-purple-700 hover:bg-gray-100 font-bold py-3 px-6 rounded-md ${getSessionStatus(item).disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={getSessionStatus(item).disabled}
            >
              {getSessionStatus(item).text}
            </button>
          </div>
        </div>
        <div className="md:w-1/3 bg-purple-800 flex items-center justify-center p-8">
          <div className="text-center text-white">
            <div className="text-5xl font-bold mb-2">{new Date(item.session_datetime).getDate()}</div>
            <div className="text-xl">{new Date(item.session_datetime).toLocaleString('default', { month: 'long' })}</div>
            <div className="mt-6 inline-block bg-purple-600 rounded-full px-4 py-2">Upcoming</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (initialLoading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-black bg-no-repeat bg-cover bg-center py-12" style={{ backgroundImage: `url(${bg3})` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl font-bold text-gray-100">Sessions</h1>
            <p className="mt-2 text-lg text-gray-300">Loading sessions...</p>
          </motion.div>
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-10 w-10 text-purple-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-black bg-no-repeat bg-cover bg-center py-12" style={{ backgroundImage: `url(${bg3})` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl font-bold text-gray-100">Sessions</h1>
            <p className="mt-2 text-lg text-gray-300">Please log in to view your sessions.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black bg-no-repeat bg-cover bg-center py-12" style={{ backgroundImage: `url(${bg3})` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold text-gray-100">Sessions</h1>
          <p className="mt-2 text-lg text-gray-300">Enhance your skills with live mentoring sessions</p>
        </motion.div>

        {webinarsLoading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-10 w-10 text-purple-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">
            <p>Error loading sessions: {error}</p>
            <button
              onClick={() => dispatch(subscribeToSessions())}
              className="mt-4 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No sessions available</h3>
            <p className="mt-1 text-gray-500">Check back later for new sessions.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {upcoming.length > 0 && renderFeaturedItem(upcoming[0])}

            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-6">Upcoming Sessions</h2>
              {upcoming.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No upcoming sessions</h3>
                  <p className="mt-1 text-gray-500">Check back later for new sessions.</p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {upcoming.slice(1).map(renderItem)}
                </motion.div>
              )}
            </div>

            {past.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-100 mb-6">Past Sessions</h2>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {past.map(renderItem)}
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;