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
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    location: '',
    latitude: '',
    longitude: '',
    date: '',
    endDate: '',
    category: 'other',
    photos: [] // Added for photo upload
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India center
  const [markerPosition, setMarkerPosition] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);

  // AI Generator State
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiGenData, setAiGenData] = useState({
    type: '',
    audience: '',
    highlights: ''
  });
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiChange = (e) => {
    const { name, value } = e.target;
    setAiGenData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateDescription = async () => {
    if (!eventData.title || !aiGenData.type) {
      setError('Please provide at least a Title and Event Type for AI generation');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const response = await eventService.generateDescription({
        title: eventData.title,
        type: aiGenData.type,
        audience: aiGenData.audience,
        highlights: aiGenData.highlights
      }, token);

      if (response.success) {
        setEventData(prev => ({
          ...prev,
          description: response.description
        }));
        setShowAiGenerator(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate description');
    }
    setAiLoading(false);
  };

  const { token, currentUser } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map center to user's location if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("User's actual location:", latitude, longitude);
          setMapCenter([latitude, longitude]);
          
          // Set marker position and form data if using current location
          if (useCurrentLocation) {
            setMarkerPosition([latitude, longitude]);
            setEventData(prev => ({
              ...prev,
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6)
            }));
          }
        },
        (err) => {
          console.error("Error getting location:", err);
          setError("Unable to get your precise location. Please select location manually on the map.");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser. Please select location manually on the map.");
    }
  }, []);

  const validateStep = (step) => {
    switch(step) {
      case 1:
        return eventData.title && eventData.category;
      case 2:
        return eventData.description;
      case 3:
        return eventData.location && eventData.latitude && eventData.longitude;
      case 4:
        return eventData.date;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setError('');
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      setError('Please complete all required fields before continuing');
    }
  };

  const prevStep = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle photo file selection
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setEventData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  };

  // Remove a photo from the list
  const removePhoto = (index) => {
    setEventData(prev => {
      const newPhotos = [...prev.photos];
      newPhotos.splice(index, 1);
      return { ...prev, photos: newPhotos };
    });
  };

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setMarkerPosition([lat, lng]);
    
    // Update form data when clicking on map
    setEventData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
    
    // Disable current location mode when manually selecting
    setUseCurrentLocation(false);
  };

  // Enable marker dragging
  const enableMarkerDrag = () => {
    setIsDraggingMarker(true);
  };

  // Handle marker drag end
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const position = marker.getLatLng();
    
    setMarkerPosition([position.lat, position.lng]);
    setEventData(prev => ({
      ...prev,
      latitude: position.lat.toFixed(6),
      longitude: position.lng.toFixed(6)
    }));
    
    // Disable current location mode when manually dragging
    setUseCurrentLocation(false);
  };

  const toggleUseCurrentLocation = () => {
    const newUseCurrentLocation = !useCurrentLocation;
    setUseCurrentLocation(newUseCurrentLocation);
    
    if (newUseCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMarkerPosition([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setEventData(prev => ({
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6)
          }));
        },
        (err) => {
          setError("Unable to get your current location: " + err.message);
        }
      );
    }
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
      // Prepare form data for submission
      const formData = new FormData();
      Object.keys(eventData).forEach(key => {
        if (key !== 'photos') {
          // Ensure latitude and longitude are properly formatted
          if (key === 'latitude' || key === 'longitude') {
            formData.append(key, String(eventData[key]));
          } else {
            formData.append(key, eventData[key]);
          }
        }
      });
      
      // Append photos if any
      if (eventData.photos && Array.isArray(eventData.photos)) {
        eventData.photos.forEach(photo => {
          formData.append('photos', photo);
        });
      }
      
      // Debugging: Log FormData contents
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const response = await eventService.createEvent(formData, token);
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
        category: 'other',
        photos: []
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
      <div className="create-event-card wizard">
        <h2>Create New Event</h2>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className="progress-steps">
            {[1, 2, 3, 4].map(step => (
              <div 
                key={step}
                className={`progress-step ${
                  step === currentStep ? 'active' : 
                  step < currentStep ? 'completed' : ''
                }`}
              >
                <div className="step-number">
                  {step < currentStep ? '✓' : step}
                </div>
                <div className="step-label">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Description'}
                  {step === 3 && 'Location'}
                  {step === 4 && 'Date & Details'}
                </div>
              </div>
            ))}
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{width: `${(currentStep / totalSteps) * 100}%`}}
            />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Event created successfully!</div>}

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="wizard-step animate-fade-in">
              <h3>Basic Information</h3>
              
              <div className="form-group">
                <label htmlFor="title">Event Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={eventData.title}
                  onChange={handleChange}
                  placeholder="Enter your event name"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <div className="category-grid">
                  {[
                    { value: 'music', label: 'Music', emoji: '🎵' },
                    { value: 'sports', label: 'Sports', emoji: '⚽' },
                    { value: 'workshop', label: 'Workshop', emoji: '🔧' },
                    { value: 'exhibition', label: 'Exhibition', emoji: '🎨' },
                    { value: 'college-fest', label: 'College Fest', emoji: '🎓' },
                    { value: 'religious', label: 'Religious', emoji: '🕉️' },
                    { value: 'promotion', label: 'Promotion', emoji: '📢' },
                    { value: 'other', label: 'Other', emoji: '🎪' }
                  ].map(cat => (
                    <div
                      key={cat.value}
                      className={`category-card ${
                        eventData.category === cat.value ? 'selected' : ''
                      }`}
                      onClick={() => setEventData(prev => ({ ...prev, category: cat.value }))}
                    >
                      <span className="category-emoji">{cat.emoji}</span>
                      <span className="category-label">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Description */}
          {currentStep === 2 && (
            <div className="wizard-step animate-fade-in">
              <h3>Event Description</h3>
              
              <div className="form-group">
                <div className="label-with-action">
                  <label htmlFor="description">Description *</label>
                  <button
                    type="button"
                    className="btn-ai"
                    onClick={() => setShowAiGenerator(!showAiGenerator)}
                  >
                    {showAiGenerator ? 'Cancel' : '✨ AI Generate'}
                  </button>
                </div>

                {showAiGenerator && (
                  <div className="ai-generator-panel">
                    <p className="ai-hint">Answer a few questions to generate a description</p>
                    <div className="form-group">
                      <label>Event Type *</label>
                      <input
                        type="text"
                        name="type"
                        value={aiGenData.type}
                        onChange={handleAiChange}
                        placeholder="e.g. Technology Conference, Music Festival"
                      />
                    </div>
                    <div className="form-group">
                      <label>Target Audience</label>
                      <input
                        type="text"
                        name="audience"
                        value={aiGenData.audience}
                        onChange={handleAiChange}
                        placeholder="e.g. Developers, Students, Families"
                      />
                    </div>
                    <div className="form-group">
                      <label>Key Highlights</label>
                      <textarea
                        name="highlights"
                        value={aiGenData.highlights}
                        onChange={handleAiChange}
                        placeholder="e.g. Keynote speakers, Live demos, Free food"
                        rows="2"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={generateDescription}
                      disabled={aiLoading}
                    >
                      {aiLoading ? 'Generating...' : 'Generate Description'}
                    </button>
                  </div>
                )}
                
                <textarea
                  id="description"
                  name="description"
                  value={eventData.description}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Describe your event in detail..."
                  required
                />
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="wizard-step animate-fade-in">
              <h3>Event Location</h3>
              
              <div className="form-group">
                <label htmlFor="location">Location Name *</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={eventData.location}
                  onChange={handleChange}
                  placeholder="e.g., Central Park, Conference Hall"
                  required
                />
              </div>
          
              <div className="location-options">
                <div className="toggle-option">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={useCurrentLocation}
                      onChange={toggleUseCurrentLocation}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span className="toggle-label">
                    {useCurrentLocation ? 'Using Current Location' : 'Set Manual Location'}
                  </span>
                </div>
              </div>

              <p className="map-hint">Click on the map or drag the marker to set location</p>

              <MapContainer
                center={mapCenter}
                zoom={6}
                style={{ height: '350px', marginBottom: '20px' }}
                whenCreated={(map) => { mapRef.current = map; }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markerPosition && (
                  <Marker 
                    position={markerPosition}
                    draggable={true}
                    eventHandlers={{
                      dragend: handleMarkerDragEnd,
                      click: () => {}
                    }}
                    ref={markerRef}
                  >
                    <Popup>Drag me to reposition</Popup>
                  </Marker>
                )}
              </MapContainer>

              {markerPosition && (
                <p className="coordinates-display">
                  📍 {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
                </p>
              )}
            </div>
          )}

          {/* Step 4: Date & Details */}
          {currentStep === 4 && (
            <div className="wizard-step animate-fade-in">
              <h3>Date & Details</h3>
              
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
                <label htmlFor="photos">Event Photos</label>
                <input
                  type="file"
                  id="photos"
                  name="photos"
                  onChange={handlePhotoChange}
                  accept="image/*"
                  multiple
                />
                {eventData.photos.length > 0 && (
                  <div className="photo-preview">
                    <h4>Selected Photos ({eventData.photos.length})</h4>
                    <div className="photo-list">
                      {eventData.photos.map((photo, index) => (
                        <div key={index} className="photo-item">
                          <span>{photo.name}</span>
                          <button 
                            type="button" 
                            className="btn-remove-photo"
                            onClick={() => removePhoto(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="wizard-navigation">
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={prevStep}
              >
                ← Previous
              </button>
            )}
            
            <div className="step-indicator-text">
              Step {currentStep} of {totalSteps}
            </div>
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : '✨ Create Event'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
