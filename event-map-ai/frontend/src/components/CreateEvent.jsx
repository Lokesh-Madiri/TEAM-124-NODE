import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import eventService from '../api/eventService';
import './CreateEvent.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function CreateEvent() {
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    location: '',
    latitude: '',
    longitude: '',
    date: '',
    endDate: '',
    category: 'other'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);
  const [markerPosition, setMarkerPosition] = useState(null);
  
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  // Initialize map center to user's location if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setMarkerPosition([latitude, longitude]);
          setEventData(prev => ({
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6)
          }));
        },
        (err) => {
          console.error("Error getting location:", err);
        }
      );
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setMarkerPosition([lat, lng]);
    setEventData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!eventData.title || !eventData.description || !eventData.location || 
        !eventData.latitude || !eventData.longitude || !eventData.date) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      const response = await eventService.createEvent(eventData, token);
      setSuccess(true);
      
      // Reset form
      setEventData({
        title: '',
        description: '',
        location: '',
        latitude: '',
        longitude: '',
        date: '',
        endDate: '',
        category: 'other'
      });
      
      // Redirect to event page after short delay
      setTimeout(() => {
        navigate(`/event/${response.event._id}`);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to create event');
    }
    
    setLoading(false);
  };

  if (!currentUser || (currentUser.role !== 'organizer' && currentUser.role !== 'admin')) {
    return (
      <div className="create-event-container">
        <div className="create-event-card">
          <h2>Access Denied</h2>
          <p>You must be an organizer or admin to create events.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-container">
      <div className="create-event-card">
        <h2>Create New Event</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Event created successfully!</div>}
        
        <div className="map-section">
          <h3>Select Event Location</h3>
          <p>Click on the map to set the event location</p>
          
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            style={{ height: '300px', marginBottom: '20px' }}
            whenCreated={(map) => {
              mapRef.current = map;
              map.on('click', handleMapClick);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markerPosition && (
              <Marker position={markerPosition}>
                <Popup>Event location</Popup>
              </Marker>
            )}
          </MapContainer>
          
          {markerPosition && (
            <p className="coordinates-display">
              Selected coordinates: {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
            </p>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={eventData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={eventData.description}
              onChange={handleChange}
              rows="4"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={eventData.location}
              onChange={handleChange}
              placeholder="e.g., Central Park, Conference Hall, etc."
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="latitude">Latitude *</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                value={eventData.latitude}
                onChange={handleChange}
                step="any"
                placeholder="Click on map or enter manually"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="longitude">Longitude *</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                value={eventData.longitude}
                onChange={handleChange}
                step="any"
                placeholder="Click on map or enter manually"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="date">Start Date & Time *</label>
            <input
              type="datetime-local"
              id="date"
              name="date"
              value={eventData.date}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="endDate">End Date & Time</label>
            <input
              type="datetime-local"
              id="endDate"
              name="endDate"
              value={eventData.endDate}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={eventData.category}
              onChange={handleChange}
            >
              <option value="other">Other</option>
              <option value="music">Music</option>
              <option value="sports">Sports</option>
              <option value="workshop">Workshop</option>
              <option value="exhibition">Exhibition</option>
              <option value="college fest">College Fest</option>
              <option value="religious">Religious</option>
              <option value="promotion">Promotion</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Creating Event...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}