import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MakeUpList from './pages/MakeUpList'
import StudentList from './pages/StudentList'
import StudentDetail from './pages/StudentDetail'
import VersionList from './pages/VersionList'
import CorrectionList from './pages/CorrectionList'
import GroupStats from './pages/GroupStats'
import DataImport from './pages/DataImport'

const isAuthenticated = () => {
  return localStorage.getItem('token') !== null
}

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="students" element={<StudentList />} />
          <Route path="students/:studentId" element={<StudentDetail />} />
          <Route path="versions" element={<VersionList />} />
          <Route path="versions/:versionId" element={<VersionList />} />
          <Route path="corrections" element={<CorrectionList />} />
          <Route path="corrections/:correctionId" element={<CorrectionList />} />
          <Route path="groups" element={<GroupStats />} />
          <Route path="groups/:groupId" element={<GroupStats />} />
          <Route path="makeup" element={<MakeUpList />} />
          <Route path="import" element={<DataImport />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
