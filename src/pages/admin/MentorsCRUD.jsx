import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchMentors, addMentor, updateMentor, deleteMentor } from '../../redux/slices/mentorsSlice';
import { useForm } from 'react-hook-form';
import { FiEdit, FiTrash2, FiPlus, FiX, FiSearch, FiLink } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { supabase } from '../../supabase/config';

const MentorsCRUD = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mentors, loading } = useSelector(state => state.mentors || { mentors: [], loading: false });
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMentor, setCurrentMentor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'admin') {
      navigate('/login', { state: { from: '/admin/mentors' } });
    } else {
      dispatch(fetchMentors());
    }
  }, [dispatch, isAuthenticated, user, navigate]);

  const openModal = (mentor = null) => {
    setCurrentMentor(mentor);
    if (mentor) {
      setValue('name', mentor.name);
      setValue('email', mentor.email);
      setValue('expertise', mentor.expertise);
      setValue('experience', mentor.experience);
      setValue('bio', mentor.bio);
      setValue('availability', mentor.availability);
      setValue('sessionFee', mentor.session_fee);
      setValue('rating', mentor.rating);
      setValue('topmate', mentor.topmate || '');
      setPreviewImage(mentor.profile_image);
    } else {
      reset({
        name: '',
        email: '',
        expertise: '',
        experience: '',
        bio: '',
        availability: '',
        sessionFee: '',
        rating: 5.0,
        topmate: '',
      });
      setPreviewImage(null);
    }
    setProfileImage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentMentor(null);
    setProfileImage(null);
    setPreviewImage(null);
    reset();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('mentorsprofiles')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('mentorsprofiles')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error('Failed to retrieve public URL for the uploaded image');
    }

    return urlData.publicUrl;
  };

  const onSubmit = async (data) => {
    try {
      // Check for active Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session. Please log in again.');
      }

      let profileImageUrl = currentMentor?.profile_image || null;
      if (profileImage) {
        profileImageUrl = await uploadImage(profileImage);
      }

      const mentorData = {
        name: data.name,
        email: data.email,
        expertise: data.expertise,
        experience: Number(data.experience),
        bio: data.bio,
        availability: data.availability,
        sessionFee: Number(data.sessionFee),
        rating: Number(data.rating),
        topmate: data.topmate || null,
        profileImage: profileImageUrl,
      };

      if (currentMentor) {
        await dispatch(updateMentor({ id: currentMentor.id, ...mentorData })).unwrap();
        toast.success('Mentor updated successfully');
      } else {
        await dispatch(addMentor(mentorData)).unwrap();
        toast.success('Mentor added successfully');
      }
      closeModal();
    } catch (error) {
      console.error('Error saving mentor:', error);
      if (error.message.includes('row-level security')) {
        toast.error('Permission denied: You lack the necessary permissions to add or update mentors.');
      } else if (error.message.includes('No active session')) {
        toast.error('Session expired. Please log in again.');
        navigate('/login', { state: { from: '/admin/mentors' } });
      } else if (error.message.includes('Image upload failed')) {
        toast.error('Failed to upload profile image. Please try again.');
      } else {
        toast.error(error.message || 'Failed to save mentor');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this mentor?')) {
      try {
        await dispatch(deleteMentor(id)).unwrap();
        toast.success('Mentor deleted successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to delete mentor');
      }
    }
  };

  const filteredMentors = Array.isArray(mentors) ? mentors.filter(mentor => 
    (mentor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mentor.expertise || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mentor.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Mentors</h1>
        <button
          onClick={() => openModal()}
          className="btn-primary flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          <FiPlus className="mr-2 h-5 w-5" /> Add Mentor
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search mentors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-10 w-10 text-purple-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No mentors found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mentor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expertise
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Fee
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topmate
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMentors.map((mentor) => (
                  <tr key={mentor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {mentor.profile_image ? (
                            <img 
                              src={mentor.profile_image} 
                              alt={mentor.name} 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.src = '/placeholder-image.png'; // Fallback image
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-purple-100 text-purple-600">
                              {mentor.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{mentor.name}</div>
                          <div className="text-sm text-gray-500">{mentor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mentor.expertise}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mentor.experience} years</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mentor.availability}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${mentor.session_fee}/hour</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mentor.rating.toFixed(1)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mentor.topmate ? (
                        <a
                          href={mentor.topmate}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 flex items-center"
                        >
                          <FiLink className="h-4 w-4 mr-1" />
                          Book Now
                        </a>
                      ) : (
                        <span className="text-gray-400">Not Available</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openModal(mentor)}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                      >
                        <FiEdit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(mentor.id)}
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
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-purple-600 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {currentMentor ? 'Edit Mentor' : 'Add New Mentor'}
              </h3>
              <button onClick={closeModal} className="text-white hover:text-gray-200">
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2 flex flex-col items-center">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-4">
                    {previewImage ? (
                      <img 
                        src={previewImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {currentMentor?.name?.charAt(0).toUpperCase() || 'M'}
                      </div>
                    )}
                  </div>
                  <label className="btn-secondary cursor-pointer text-sm px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                    Change Photo
                  </label>
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="expertise" className="block text-sm font-medium text-gray-700 mb-1">
                    Expertise *
                  </label>
                  <input
                    id="expertise"
                    type="text"
                    {...register('expertise', { required: 'Expertise is required' })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Web Development, Data Science"
                  />
                  {errors.expertise && (
                    <p className="mt-1 text-sm text-red-600">{errors.expertise.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (years) *
                  </label>
                  <input
                    id="experience"
                    type="number"
                    min="0"
                    step="1"
                    {...register('experience', { 
                      required: 'Experience is required',
                      min: {
                        value: 0,
                        message: 'Experience cannot be negative'
                      }
                    })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.experience && (
                    <p className="mt-1 text-sm text-red-600">{errors.experience.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
                    Availability *
                  </label>
                  <input
                    id="availability"
                    type="text"
                    {...register('availability', { required: 'Availability is required' })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Weekdays, Evenings"
                  />
                  {errors.availability && (
                    <p className="mt-1 text-sm text-red-600">{errors.availability.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="sessionFee" className="block text-sm font-medium text-gray-700 mb-1">
                    Session Fee ($/hour) *
                  </label>
                  <input
                    id="sessionFee"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('sessionFee', { 
                      required: 'Session fee is required',
                      min: {
                        value: 0,
                        message: 'Session fee cannot be negative'
                      }
                    })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.sessionFee && (
                    <p className="mt-1 text-sm text-red-600">{errors.sessionFee.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
                    Rating (0-5)
                  </label>
                  <input
                    id="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    {...register('rating', { 
                      min: {
                        value: 0,
                        message: 'Rating must be between 0 and 5'
                      },
                      max: {
                        value: 5,
                        message: 'Rating must be between 0 and 5'
                      }
                    })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.rating && (
                    <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio *
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    {...register('bio', { required: 'Bio is required' })}
                    className="input-field w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Brief description of the mentor's background and expertise"
                  />
                  {errors.bio && (
                    <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="topmate" className="block text-sm font-medium text-gray-700 mb-1">
                    Topmate Profile URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLink className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="topmate"
                      type="url"
                      {...register('topmate')}
                      className="input-field pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://topmate.io/your_profile"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Add your Topmate profile URL to enable direct booking
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  {currentMentor ? 'Update Mentor' : 'Add Mentor'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MentorsCRUD;
