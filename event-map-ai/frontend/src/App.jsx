import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapView from './components/MapView';
import Login from './components/Login';
import Register from './components/Register';
import EventDetails from './components/EventDetails';
import UserProfile from './components/UserProfile';
import CreateEvent from './components/CreateEvent';
import Navigation from './components/Navigation';
import AuthProvider from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/create-event" element={<CreateEvent />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;