import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import store from './store.js'

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'

// Public Layout & Pages
import Layout from './components/Layout.jsx';
import Welcome from './pages/Welcome.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';

// Student Pages
import Dashboard from './pages/Dashboard.jsx';
import Results from './pages/Results.jsx';
import UploadResult from './pages/UploadResults.jsx';
import ManageCourses from './pages/ManageCourses.jsx';
import Quizzes from './pages/Quizzes.jsx';
import Study from "./pages/Study.jsx";
import ManageMaterials from './pages/ManageMaterials.jsx';
import Anonymous from './pages/Anonymous.jsx';
import DropAnonymous from './pages/DropAnonymous.jsx'

// Admin Layout & Pages
import AdminLogin from './pages/admin/Login.jsx';
import AdminLayout from './components/admin/Layout.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import UserDirectory from './pages/admin/UserDirectory.jsx';
import Appointments from './pages/admin/Appointments.jsx';
import Teams from './pages/admin/Teams.jsx';
import Departments from './pages/admin/Departments.jsx';
import SessionsPromotions from './pages/admin/SessionsPromotions.jsx';
import CourseCatalog from './pages/admin/CourseCatalog.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminAnonymous from './pages/admin/AdminAnonymous.jsx'

// 👇 NEW: Lecturer Imports
import LecturerLayout from './components/lecturer/Layout.jsx';
import LecturerDashboard from './pages/lecturer/Dashboard.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // =========================================
      // PUBLIC ROUTES
      // =========================================
      { index: true, element: <Welcome /> },
      { path: "signup", element: <Signup /> },
      { path: "login", element: <Login /> },
      { path: "superuser/login", element: <AdminLogin /> },
      {path: "drop/:token", element: <DropAnonymous />},

      // =========================================
      // STUDENT PORTAL
      // =========================================
      { 
        path: '/', 
        element: <Layout />, 
        children: [
          { path: "dashboard", element: <Dashboard /> },
          { path: "results", element: <Results /> },
          { path: "upload-results", element: <UploadResult /> },
          { path: "manage-courses", element: <ManageCourses /> },
          { path: "quizzes", element: <Quizzes /> },
          {path: "study", element: <Study />},
          {path: "manage-materials", element: <ManageMaterials />},
          {path: "anonymous", element: <Anonymous />},
        ]
      },

      // =========================================
      // LECTURER PORTAL
      // =========================================
      {
        path: "/lecturer",
        element: <LecturerLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <LecturerDashboard /> },
          
          // Add other lecturer routes here as you build them:
          // { path: "results", element: <ManageResults /> },
          // { path: "materials", element: <ManageMaterials /> },
          // { path: "quizzes", element: <ManageQuizzes /> },
        ]
      },

      // =========================================
      // ADMIN / SUPERUSER PORTAL
      // =========================================
      {
        path: "/superuser",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "users", element: <UserDirectory /> },
          { path: "appointments", element: <Appointments /> },
          { path: "teams", element: <Teams /> },
          { path: "departments", element: <Departments /> },
          { path: "sessions", element: <SessionsPromotions /> },
          { path: "courses", element: <CourseCatalog /> },
          { path: "audit-logs", element: <AuditLogs /> },
          { path: "settings", element: <AdminSettings /> },
          {path: "anonymous", element: <AdminAnonymous />},
        ]
      }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  </Provider>
)