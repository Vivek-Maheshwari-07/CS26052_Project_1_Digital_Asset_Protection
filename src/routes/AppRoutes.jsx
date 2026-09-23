import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import AppLayout from '../components/layout/AppLayout';

// Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Gallery from '../pages/Gallery';
import Dashboard from '../pages/Dashboard';
import Register from '../pages/Register';
import RegistrationResult from '../pages/RegistrationResult';
import Assets from '../pages/Assets';
import AssetDetails from '../pages/AssetDetails';
import Verify from '../pages/Verify';
import VerificationResults from '../pages/VerificationResults';
import Evidence from '../pages/Evidence';
import Certificate from '../pages/Certificate';
import Notifications from '../pages/Notifications';
import DownloadRequests from '../pages/DownloadRequests';
import Profile from '../pages/Profile';
import NotFound from '../pages/NotFound';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES (Public Header & Footer) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* APP / AUTHENTICATED ROUTES (App Shell: Sidebar, Top Header, Mobile Nav) */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/result" element={<RegistrationResult />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assets/:id" element={<AssetDetails />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify/results" element={<VerificationResults />} />
        <Route path="/evidence/:id" element={<Evidence />} />
        <Route path="/certificate/:id" element={<Certificate />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/download-requests" element={<DownloadRequests />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
