import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/config';
import { FiEdit, FiTrash2, FiSearch, FiX, FiBarChart2, FiBook, FiVideo, FiBriefcase } from 'react-icons/fi';
import { BiSolidUpArrow, BiSolidDownArrow } from 'react-icons/bi';
import { useForm } from 'react-hook-form';
import { setupStudentCollections } from '../../utils/setupCollections';

const AllUsersCRUD = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userStats, setUserStats] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

const fetchUsers = async () => {
  try {
    setLoading(true);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw authError || new Error("User not found");

    // Fetch the role directly from your users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const userRole = profile?.role?.trim(); // trim in case there's newline or space

    if (userRole === 'admin') {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;
      setUsers(data || []);
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id);

      if (error) throw error;
      setUsers(data || []);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    setLoading(false);
  }
};


  const fetchUserStats = async (userId) => {
    try {
      setLoading(true);
      const setupSuccess = await setupStudentCollections(userId);
      if (!setupSuccess) {
        throw new Error('Failed to set up student collections');
      }

      const [jobAppsRes, webinarRes, sessionsRes] = await Promise.all([
        supabase.from('job_applications').select('*, jobs(*)').eq('student_id', userId),
        supabase.from('webinar_attendance').select('*, webinars(*)').eq('student_id', userId),
        supabase.from('sessions').select('*, mentors(*)').eq('student_id', userId),
      ]);

      const jobApplications = jobAppsRes.data || [];
      const webinarAttendance = webinarRes.data || [];
      const sessions = sessionsRes.data || [];

      const stats = {
        totalJobApplications: jobApplications.length,
        jobApplicationsByStatus: jobApplications.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {}),
        totalWebinarsAttended: webinarAttendance.length,
        totalSessionsAttended: sessions.length,
        averageSessionRating: sessions.reduce((acc, session) => acc + (session.rating || 0), 0) / (sessions.filter(s => s.rating).length || 1),
        recentActivity: [...jobApplications, ...webinarAttendance, ...sessions]
          .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
          .slice(0, 5),
        jobApplications,
        webinarAttendance,
        sessions,
      };

      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user = null) => {
    setCurrentUser(user);
    if (user) {
      setValue('display_name', user.display_name || '');
      setValue('email', user.email || '');
      setValue('phone', user.phone || '');
      setValue('location', user.location || '');
      setValue('education', user.education || '');
      setValue('skills', user.skills || '');
      setValue('role', user.role || '');
    } else {
      reset();
    }
    setIsModalOpen(true);
  };

  const openStatsModal = async (user) => {
    setCurrentUser(user);
    setIsStatsModalOpen(true);
    await fetchUserStats(user.id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
    reset();
  };

  const closeStatsModal = () => {
    setIsStatsModalOpen(false);
    setCurrentUser(null);
    setUserStats(null);
  };

  const onSubmit = async (data) => {
    try {
      if (currentUser) {
        const { error } = await supabase
          .from('users')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', currentUser.id);
        if (error) throw error;
        setUsers(users.map(user =>
          user.id === currentUser.id
            ? { ...user, ...data, updated_at: new Date().toISOString() }
            : user
        ));
      }
      closeModal();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setUsers(users.filter(user => user.id !== id));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleResetSort = () => {
    setSortConfig({ key: null, direction: null });
  };

  const filteredUsers = users
    .filter(user =>
      (user.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      if (sortConfig.key === 'display_name') {
        const nameA = (a.display_name || '').toLowerCase();
        const nameB = (b.display_name || '').toLowerCase();
        if (sortConfig.direction === 'ascending') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      }

      if (sortConfig.key === 'created_at') {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      }

      return 0;
    });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
        </div>
        
        {loading && !isStatsModalOpen ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      User
                      <div className="ml-2 flex flex-col">
                        <button onClick={() => handleSort('display_name')} onDoubleClick={handleResetSort}>
                          <BiSolidUpArrow className={`h-2 w-2 ${sortConfig.key === 'display_name' && sortConfig.direction === 'ascending' ? 'text-gray-900' : 'text-gray-400'}`} />
                        </button>
                        <button onClick={() => handleSort('display_name')} onDoubleClick={handleResetSort}>
                          <BiSolidDownArrow className={`h-2 w-2 ${sortConfig.key === 'display_name' && sortConfig.direction === 'descending' ? 'text-gray-900' : 'text-gray-400'}`} />
                        </button>
                      </div>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Education
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skills
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Joined
                      <div className="ml-2 flex flex-col">
                        <button onClick={() => handleSort('created_at')} onDoubleClick={handleResetSort}>
                          <BiSolidUpArrow className={`h-2 w-2 ${sortConfig.key === 'created_at' && sortConfig.direction === 'ascending' ? 'text-gray-900' : 'text-gray-400'}`} />
                        </button>
                        <button onClick={() => handleSort('created_at')} onDoubleClick={handleResetSort}>
                          <BiSolidDownArrow className={`h-2 w-2 ${sortConfig.key === 'created_at' && sortConfig.direction === 'descending' ? 'text-gray-900' : 'text-gray-400'}`} />
                        </button>
                      </div>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {user.profile_image ? (
                            <img 
                              src={user.profile_image} 
                              alt={user.display_name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-primary-100 text-primary-600">
                              {user.display_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.display_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.location || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">{user.education || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">{user.skills || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.created_at ? formatDate(user.created_at) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.role === 'student' && (
                        <button
                          onClick={() => openStatsModal(user)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          title="View Statistics"
                        >
                          <FiBarChart2 className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => openModal(user)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <FiEdit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-purple-gradient px-6 py-4 text-white flex justify-between items-center">
              <h3 className="text-xl font-semibold">{currentUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={closeModal} className="text-white hover:text-gray-200">
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="display_name"
                    type="text"
                    {...register('display_name', { required: 'Name is required' })}
                    className="input-field"
                  />
                  {errors.display_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.display_name.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="input-field"
                    disabled={!!currentUser}
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    {...register('location')}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    {...register('role')}
                    className="input-field"
                  >
                    <option value="">Select a role</option>
                    <option value="admin">Admin</option>
                    <option value="student">Student</option>
                    <option value="mentor">Mentor</option>
                    <option value="employer">Employer</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                    Education
                  </label>
                  <textarea
                    id="education"
                    rows={3}
                    {...register('education')}
                    className="input-field"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                    Skills
                  </label>
                  <textarea
                    id="skills"
                    rows={3}
                    {...register('skills')}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {currentUser ? 'Update User' : 'Add User'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Statistics Modal */}
      {isStatsModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-purple-gradient px-6 py-4 text-white flex justify-between items-center">
              <h3 className="text-xl font-semibold">User Statistics - {currentUser.display_name}</h3>
              <button onClick={closeStatsModal} className="text-white hover:text-gray-200">
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : userStats ? (
                <div className="space-y-8">
                  {/* User Profile Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start">
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {currentUser.profile_image ? (
                          <img 
                            src={currentUser.profile_image} 
                            alt={currentUser.display_name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary-100 text-primary-600 text-2xl font-bold">
                            {currentUser.display_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="ml-6">
                        <h2 className="text-2xl font-bold text-gray-900">{currentUser.display_name}</h2>
                        <p className="text-gray-600">{currentUser.email}</p>
                        {currentUser.phone && (
                          <p className="text-gray-600 mt-1">{currentUser.phone}</p>
                        )}
                        {currentUser.location && (
                          <p className="text-gray-600 mt-1">{currentUser.location}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-primary-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                          <FiBriefcase className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500">Job Applications</p>
                          <p className="text-2xl font-semibold text-gray-900">{userStats.totalJobApplications}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                          <FiVideo className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500">Webinars Attended</p>
                          <p className="text-2xl font-semibold text-gray-900">{userStats.totalWebinarsAttended}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                          <FiBook className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500">Mentoring Sessions</p>
                          <p className="text-2xl font-semibold text-gray-900">{userStats.totalSessionsAttended}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h4>
                    {userStats.recentActivity.length === 0 ? (
                      <p className="text-gray-500">No recent activity</p>
                    ) : (
                      <ul className="space-y-3">
                        {userStats.recentActivity.map((activity, index) => (
                          <li key={index} className="flex items-start">
                            {activity.jobs && (
                              <FiBriefcase className="h-5 w-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                            )}
                            {activity.webinars && (
                              <FiVideo className="h-5 w-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                            )}
                            {activity.mentors && (
                              <FiBook className="h-5 w-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {activity.jobs && `Applied for ${activity.jobs.title}`}
                                {activity.webinars && `Attended ${activity.webinars.title}`}
                                {activity.mentors && `Session with ${activity.mentors.name}`}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatDate(activity.created_at || activity.date)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Job Applications */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Job Applications</h4>
                    {userStats.jobApplications.length === 0 ? (
                      <p className="text-gray-500">No job applications</p>
                    ) : (
                      <div className="space-y-4">
                        {userStats.jobApplications.map((app) => (
                          <div key={app.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                            <h5 className="font-medium text-gray-900">{app.jobs?.title}</h5>
                            <p className="text-sm text-gray-600">{app.jobs?.company}</p>
                            <div className="flex items-center mt-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                app.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                                app.status === 'interviewed' ? 'bg-yellow-100 text-yellow-800' :
                                app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </span>
                              <p className="text-xs text-gray-500 ml-2">
                                {formatDate(app.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mentoring Sessions */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Mentoring Sessions</h4>
                    {userStats.sessions.length === 0 ? (
                      <p className="text-gray-500">No mentoring sessions</p>
                    ) : (
                      <div className="space-y-4">
                        {userStats.sessions.map((session) => (
                          <div key={session.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                            <h5 className="font-medium text-gray-900">
                              Session with {session.mentors?.name}
                            </h5>
                            <p className="text-sm text-gray-600">{session.mentors?.expertise}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                {formatDate(session.date)}
                              </p>
                              {session.rating && (
                                <p className="flex items-center text-yellow-500">
                                  <span className="text-xs font-medium mr-1">Rating:</span>
                                  {session.rating.toFixed(1)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No statistics available for this user.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AllUsersCRUD;