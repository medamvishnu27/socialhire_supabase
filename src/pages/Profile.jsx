import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/config'; // Adjusted path to match your current setup
import { updateUser } from '../redux/slices/authSlice';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiBook, FiAward, FiBriefcase, FiLink } from 'react-icons/fi';
import bgh3 from '/bg-3.png'; // Ensure this image exists in your public folder or adjust the path

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, status } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    education: user?.education || '',
    skills: user?.skills || '',
    experience: user?.experience || '',
    portfolio: user?.portfolio || '',
    bio: user?.bio || '',
    profile_image: user?.profile_image || '',
  });
  const [profilePic, setProfilePic] = useState(null);
  const [previewImage, setPreviewImage] = useState(formData.profile_image || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitTriggered, setSubmitTriggered] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        education: user.education || '',
        skills: user.skills || '',
        experience: user.experience || '',
        portfolio: user.portfolio || '',
        bio: user.bio || '',
        profile_image: user.profile_image || '',
      });
      setPreviewImage(user.profile_image || null);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit.');
        setProfilePic(null);
        setPreviewImage(null);
        return;
      }
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || submitTriggered) return;
    setLoading(true);
    setError(null);
    setSubmitTriggered(true);

    console.log("Starting profile update...");

    try {
      let profileImageUrl = formData.profile_image;

      if (profilePic) {
        const fileExt = profilePic.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

        console.log("Attempting to upload to 'profiles' bucket");

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('profiles')
          .upload(`${user.id}/${fileName}`, profilePic, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError.message);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log("Upload successful, getting URL");

        const { data: urlData, error: urlError } = await supabase.storage
          .from('profiles')
          .createSignedUrl(`${user.id}/${fileName}`, 31536000);

        if (urlError) {
          console.error("Error getting signed URL:", urlError.message);
          throw new Error(`Signed URL generation failed: ${urlError.message}`);
        }

        if (urlData && urlData.signedUrl) {
          profileImageUrl = urlData.signedUrl;
          console.log("Signed URL created successfully:", profileImageUrl);
        } else {
          throw new Error("Failed to generate signed URL for uploaded image");
        }
      }

      const updatedUserData = {
        ...formData,
        profile_image: profileImageUrl,
        updated_at: new Date().toISOString(),
      };

      console.log("Updating user data:", updatedUserData);

      const { data, error: updateError } = await supabase
        .from('users')
        .update(updatedUserData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError.message);
        throw new Error(`Update failed: ${updateError.message}`);
      }

      dispatch(updateUser(data));
      setLoading(false);
      setSubmitTriggered(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err.message);
      setError(`Failed to update profile: ${err.message}`);
      setLoading(false);
      setSubmitTriggered(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <svg
          className="animate-spin h-10 w-10 text-gray-600"
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

  return (
    <div
      className="min-h-screen bg-black py-12 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgh3})` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <div
            className="bg-black bg-cover bg-center px-6 py-8 text-white"
            style={{ backgroundImage: `url(${bgh3})` }}
          >
            <h1 className="text-3xl font-bold">Digital Profile</h1>
            <p className="mt-2">Manage your professional information</p>
          </div>

          <div className="p-6 bg-transparent">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && <div className="text-red-600 mb-4">{error}</div>}
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 flex flex-col items-center">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gray-200 mb-4">
                    {previewImage ? (
                      <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiUser size={64} />
                      </div>
                    )}
                  </div>
                  <label className="btn-secondary cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    Change Photo
                  </label>
                </div>

                <div className="w-full md:w-2/3 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiUser className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="display_name"
                          type="text"
                          name="display_name"
                          value={formData.display_name}
                          onChange={handleChange}
                          className="input-field pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="input-field pl-10"
                          disabled
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiPhone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="input-field pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="location"
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          className="input-field pl-10"
                          placeholder="City, Country"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      value={formData.bio}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Tell us about yourself"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-semibold mb-6">Professional Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                      Education
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiBook className="h-5 w-5 text-gray-400" />
                      </div>
                      <textarea
                        id="education"
                        name="education"
                        rows={3}
                        value={formData.education}
                        onChange={handleChange}
                        className="input-field pl-10"
                        placeholder="Your educational background"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                      Skills
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiAward className="h-5 w-5 text-gray-400" />
                      </div>
                      <textarea
                        id="skills"
                        name="skills"
                        rows={3}
                        value={formData.skills}
                        onChange={handleChange}
                        className="input-field pl-10"
                        placeholder="Your skills (e.g., JavaScript, React, Node.js)"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                      Experience
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiBriefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <textarea
                        id="experience"
                        name="experience"
                        rows={3}
                        value={formData.experience}
                        onChange={handleChange}
                        className="input-field pl-10"
                        placeholder="Your work experience"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="portfolio" className="block text-sm font-medium text-gray-700 mb-1">
                      Portfolio/Website
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLink className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="portfolio"
                        type="url"
                        name="portfolio"
                        value={formData.portfolio}
                        onChange={handleChange}
                        className="input-field pl-10"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || submitTriggered}
                  className="btn-primary py-3 px-8 flex items-center"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      Saving...
                    </>
                  ) : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;