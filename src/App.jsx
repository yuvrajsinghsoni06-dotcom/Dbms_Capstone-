import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import ClubHome from './pages/ClubHome';
import BronzeTable from './pages/BronzeTable';
import Gatherings from './pages/Gatherings';
import Members from './pages/Members';
import Conversations from './pages/Conversations';
import Intelligence from './pages/Intelligence';
import Pathways from './pages/Pathways';
import Artifacts from './pages/Artifacts';
import Commissions from './pages/Commissions';
import WeeklyMysteries from './pages/WeeklyMysteries';
import MyPersona from './pages/MyPersona';
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';

export default function App() {
  return (
    <>
      <Toaster
        toastOptions={{
          style: {
            background: '#1E1E2C',
            color: '#EAE7DC',
            border: '1px solid #7B5A2B',
            boxShadow: '0 0 15px rgba(123, 90, 43, 0.4)'
          }
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<ClubHome />} />
          <Route path="/bronze-table" element={<BronzeTable />} />
          <Route path="/gatherings" element={<Gatherings />} />
          <Route path="/members" element={<Members />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/pathways" element={<Pathways />} />
          <Route path="/artifacts" element={<Artifacts />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/mysteries" element={<WeeklyMysteries />} />
          <Route path="/persona" element={<MyPersona />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}
