import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchResources, addResource, deleteResource, fetchTips, addTip, updateTip, deleteTip, fetchFaqs, addFaq, updateFaq, deleteFaq } from '../../redux/slices/placementSlice';
import { toast } from 'react-toastify';
import { supabase } from '../../utils/supabaseClient';

const PlacementCRUD = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { resources, tips, faqs, status } = useSelector((state) => state.placement || { resources: [], tips: [], faqs: [], status: 'idle' });
  const { user, isAuthenticated } = useSelector((state) => state.auth || { user: null, isAuthenticated: false });
  const [resourceForm, setResourceForm] = useState({ file: null, title: '', description: '', type: 'PDF' });
  const [tipForm, setTipForm] = useState({ id: '', title: '', description: '' });
  const [faqForm, setFaqForm] = useState({ id: '', question: '', answer: '' });
  const [errors, setErrors] = useState({ resource: {}, tip: {}, faq: {} });

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'admin') {
      navigate('/login', { state: { from: '/admin/placement' } });
    } else {
      dispatch(fetchResources());
      dispatch(fetchTips());
      dispatch(fetchFaqs());
    }
  }, [dispatch, isAuthenticated, user, navigate]);

  const validateResourceForm = () => {
    const newErrors = {};
    if (!resourceForm.file) newErrors.file = 'File is required';
    if (!resourceForm.title.trim()) newErrors.title = 'Title is required';
    if (!resourceForm.description.trim()) newErrors.description = 'Description is required';
    return newErrors;
  };

  const validateTipForm = () => {
    const newErrors = {};
    if (!tipForm.title.trim()) newErrors.title = 'Title is required';
    if (!tipForm.description.trim()) newErrors.description = 'Description is required';
    return newErrors;
  };

  const validateFaqForm = () => {
    const newErrors = {};
    if (!faqForm.question.trim()) newErrors.question = 'Question is required';
    if (!faqForm.answer.trim()) newErrors.answer = 'Answer is required';
    return newErrors;
  };

  const uploadFile = async (file) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('No active session. Please log in again.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(fileName, file);


    const { data: urlData } = supabase.storage
      .from('placementresources')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error('Failed to retrieve public URL for the uploaded file');
    }

    return urlData.publicUrl;
  };

  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    const resourceErrors = validateResourceForm();
    setErrors((prev) => ({ ...prev, resource: resourceErrors }));
    if (Object.keys(resourceErrors).length > 0) return;

    try {
      const fileUrl = await uploadFile(resourceForm.file);
      await dispatch(addResource({
        ...resourceForm,
        link: fileUrl,
      })).unwrap();
      toast.success('Resource added successfully');
      setResourceForm({ file: null, title: '', description: '', type: 'PDF' });
      e.target.querySelector('#file').value = '';
    } catch (error) {
      if (error.message.includes('No active session')) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error(error.message || 'Failed to add resource');
      }
    }
  };

  const handleTipSubmit = async (e) => {
    e.preventDefault();
    const tipErrors = validateTipForm();
    setErrors((prev) => ({ ...prev, tip: tipErrors }));
    if (Object.keys(tipErrors).length > 0) return;

    try {
      if (tipForm.id) {
        await dispatch(updateTip(tipForm)).unwrap();
        toast.success('Tip updated successfully');
      } else {
        await dispatch(addTip({ title: tipForm.title, description: tipForm.description })).unwrap();
        toast.success('Tip added successfully');
      }
      setTipForm({ id: '', title: '', description: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to save tip');
    }
  };

  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    const faqErrors = validateFaqForm();
    setErrors((prev) => ({ ...prev, faq: faqErrors }));
    if (Object.keys(faqErrors).length > 0) return;

    try {
      if (faqForm.id) {
        await dispatch(updateFaq(faqForm)).unwrap();
        toast.success('FAQ updated successfully');
      } else {
        await dispatch(addFaq({ question: faqForm.question, answer: faqForm.answer })).unwrap();
        toast.success('FAQ added successfully');
      }
      setFaqForm({ id: '', question: '', answer: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to save FAQ');
    }
  };

  const handleDeleteResource = async (resource) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        await dispatch(deleteResource({ id: resource.id, link: resource.link })).unwrap();
        toast.success('Resource deleted successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to delete resource');
      }
    }
  };

  const handleDeleteTip = async (id) => {
    if (window.confirm('Are you sure you want to delete this tip?')) {
      try {
        await dispatch(deleteTip(id)).unwrap();
        toast.success('Tip deleted successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to delete tip');
      }
    }
  };

  const handleDeleteFaq = async (id) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await dispatch(deleteFaq(id)).unwrap();
        toast.success('FAQ deleted successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to delete FAQ');
      }
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center py-12">
        <svg
          className="animate-spin h-10 w-10 text-purple-600"
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
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin: Placement Management</h1>

        {/* Resources CRUD */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Resources</h2>
          <form onSubmit={handleResourceSubmit} className="mb-6 bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">Resource File *</label>
              <input
                type="file"
                id="file"
                accept="application/pdf"
                onChange={(e) => setResourceForm({ ...resourceForm, file: e.target.files[0] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.resource.file && <p className="mt-1 text-sm text-red-600">{errors.resource.file}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                id="title"
                value={resourceForm.title}
                onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                placeholder="Title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.resource.title && <p className="mt-1 text-sm text-red-600">{errors.resource.title}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                id="description"
                value={resourceForm.description}
                onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                placeholder="Description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="4"
              />
              {errors.resource.description && <p className="mt-1 text-sm text-red-600">{errors.resource.description}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                id="type"
                value={resourceForm.type}
                onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="PDF">PDF</option>
                <option value="Video">Video</option>
                <option value="Interactive">Interactive</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Add Resource
            </button>
          </form>
          <ul className="space-y-2">
            {resources.map((resource) => (
              <li key={resource.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md">
                <span className="text-gray-900">{resource.title} ({resource.type})</span>
                <button
                  onClick={() => handleDeleteResource(resource)}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Tips CRUD */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Interview Tips</h2>
          <form onSubmit={handleTipSubmit} className="mb-6 bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <label htmlFor="tipTitle" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                id="tipTitle"
                value={tipForm.title}
                onChange={(e) => setTipForm({ ...tipForm, title: e.target.value })}
                placeholder="Title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.tip.title && <p className="mt-1 text-sm text-red-600">{errors.tip.title}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="tipDescription" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                id="tipDescription"
                value={tipForm.description}
                onChange={(e) => setTipForm({ ...tipForm, description: e.target.value })}
                placeholder="Description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="4"
              />
              {errors.tip.description && <p className="mt-1 text-sm text-red-600">{errors.tip.description}</p>}
            </div>
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              {tipForm.id ? 'Update Tip' : 'Add Tip'}
            </button>
          </form>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md">
                <span className="text-gray-900">{tip.title}</span>
                <div>
                  <button
                    onClick={() => setTipForm(tip)}
                    className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTip(tip.id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* FAQs CRUD */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">FAQs</h2>
          <form onSubmit={handleFaqSubmit} className="mb-6 bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <label htmlFor="faqQuestion" className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
              <input
                type="text"
                id="faqQuestion"
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="Question"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.faq.question && <p className="mt-1 text-sm text-red-600">{errors.faq.question}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="faqAnswer" className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
              <textarea
                id="faqAnswer"
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="Answer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="4"
              />
              {errors.faq.answer && <p className="mt-1 text-sm text-red-600">{errors.faq.answer}</p>}
            </div>
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              {faqForm.id ? 'Update FAQ' : 'Add FAQ'}
            </button>
          </form>
          <ul className="space-y-2">
            {faqs.map((faq) => (
              <li key={faq.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md">
                <span className="text-gray-900">{faq.question}</span>
                <div>
                  <button
                    onClick={() => setFaqForm(faq)}
                    className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlacementCRUD;