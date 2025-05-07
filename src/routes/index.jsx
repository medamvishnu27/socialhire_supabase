import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Home from '../pages/Home';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Profile from '../pages/Profile';
import Jobs from '../pages/Jobs';
import Mentors from '../pages/Mentors';
import Webinars from '../pages/Sessions';
import PlacementPage from '../pages/Placement';
import ResumeBuilder from '../pages/ResumeBuilder';
import CodeLabs from '../pages/CodeLabs';
import AdminDashboard from '../pages/admin/AdminDashboard';
import About from '../pages/About';
import ContactUs from '../pages/ContactUs';
import NotFound from '../pages/NotFound';
import Sessions from '../pages/Sessions';
// import ForgotPassword from '../pages/auth/ForgotPassword'; 
// import ResetPassword from '../../../ResetPassword'; 

// Admin sub-route components
import AdminOverview from '../pages/admin/AdminOverview';
import SessionsCRUD from '../pages/admin/SessionsCRUD';
import PlacementCRUD from '../pages/admin/PlacementCRUD';
import MentorsCRUD from '../pages/admin/MentorsCRUD';
import JobsCRUD from '../pages/admin/JobsCRUD';
import StudentsCRUD from '../pages/admin/StudentsCRUD';

const AppRoutes = () => {
  return (
    <Routes
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      {/* <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />  */}
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/contactus" element={<ContactUs />} />
      <Route path="*" element={<NotFound />} />

      {/* Protected Routes for Authenticated Users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/mentors" element={<Mentors />} />
        <Route path="/webinars" element={<Webinars />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/placement" element={<PlacementPage />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/codelabs" element={<CodeLabs />} />
      </Route>

      {/* Protected Routes for Admins */}
      <Route element={<ProtectedRoute adminOnly={true} />}>
        <Route path="/admin/*" element={<AdminDashboard />}>
          <Route index element={<AdminOverview />} /> {/* Default view for /admin */}
          <Route path="overview" element={<AdminOverview />} />
          <Route path="sessions" element={<SessionsCRUD />} />
          <Route path="placements" element={<PlacementCRUD />} />
          <Route path="mentors" element={<MentorsCRUD />} />
          <Route path="jobs" element={<JobsCRUD />} />
          <Route path="students" element={<StudentsCRUD />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;