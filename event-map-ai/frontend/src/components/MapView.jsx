import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import eventService from '../api/eventService';
import EventCard from './EventCard';
import FilterPanel from './FilterPanel';
import { useAuth } from '../context/AuthContext';
import './MapView.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for events based on category
const getCategoryIcon = (category, color = '#3b82f6') => {
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">
      ${getCategoryEmoji(category)}
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const getCategoryEmoji = (category) => {
  const emojiMap = {
    'music': '🎵',
    'sports': '⚽',
    'workshop': '🔧',
    'exhibition': '🎨',
    'college-fest': '🎓',
    'religious': '🕉️',
    'promotion': '📢',
    'other': '🎪'
  };
  return emojiMap[category?.toLowerCase()] || '📍';
};

const getCategoryColor = (category) => {
  const colorMap = {
    'music': '#e91e63',
    'sports': '#2196f3',
    'workshop': '#ff9800',
    'exhibition': '#9c27b0',
    'college-fest': '#4caf50',
    'religious': '#795548',
    'promotion': '#ff5722',
    'other': '#607d8b'
  };
  return colorMap[category?.toLowerCase()] || '#3b82f6';
};

// User location icon (pulsing blue dot)
const userLocationIcon = L.divIcon({
  html: `
    <div class="user-location-marker">
      <div class="user-location-dot"></div>
      <div class="user-location-pulse"></div>
    </div>
  `,
  className: 'user-location-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const taskIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1827/1827951.png', // Checklist icon
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// Map controller component for dynamic updates
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function MapView() {
  const { currentUser } = useAuth();
  const [userPosition, setUserPosition] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India default
  const [mapZoom, setMapZoom] = useState(5);
  const mapRef = useRef();
  const watchIdRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [mapLayer, setMapLayer] = useState('standard');
  const [showLegend, setShowLegend] = useState(true);

  // High-accuracy location detection with continuous updates
  useEffect(() => {
    if (navigator.geolocation) {
      // Check permission status
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          setLocationPermission(result.state);
          result.addEventListener('change', () => {
            setLocationPermission(result.state);
          });
        });
      }

      // Request high-accuracy location
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const userPos = [latitude, longitude];
          setUserPosition(userPos);
          setLocationAccuracy(accuracy);
          setMapCenter(userPos);
          setMapZoom(14);
          setLoading(false);
          
          fetchAllEvents();
        },
        (err) => {
          console.error("Error getting location:", err);
          handleLocationError(err);
          setLoading(false);
          fetchAllEvents();
        },
        options
      );

      // Watch position for continuous updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const userPos = [latitude, longitude];
          setUserPosition(userPos);
          setLocationAccuracy(accuracy);
        },
        (err) => {
          console.error("Error watching location:", err);
        },
        { ...options, maximumAge: 30000 }
      );
    } else {
      setError("Geolocation is not supported by your browser. Showing all events.");
      setLocationPermission('denied');
      setLoading(false);
      fetchAllEvents();
    }

    // Cleanup watch on unmount
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleLocationError = (err) => {
    switch(err.code) {
      case err.PERMISSION_DENIED:
        setError("Location access denied. Enable location permissions to see nearby events.");
        setLocationPermission('denied');
        break;
      case err.POSITION_UNAVAILABLE:
        setError("Location information unavailable. Showing all events.");
        break;
      case err.TIMEOUT:
        setError("Location request timed out. Showing all events.");
        break;
      default:
        setError("An unknown error occurred. Showing all events.");
    }
  };

  const fetchAllEvents = async () => {
    try {
      const eventsData = await eventService.getEvents();
      setAllEvents(eventsData);
      setFilteredEvents(eventsData);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events from server. Showing demo data.");
      const staticEvents = eventService.getStaticEvents();
      setAllEvents(staticEvents);
      setFilteredEvents(staticEvents);
    }
  };

  // Apply filters to events
  useEffect(() => {
    if (!allEvents.length) return;

    let filtered = [...allEvents];

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(event => 
        filters.categories.includes(event.category?.toLowerCase())
      );
    }

    // Distance filter
    if (userPosition && filters.distance) {
      filtered = filtered.filter(event => {
        const distance = calculateDistance(
          userPosition[0], 
          userPosition[1],
          event.latitude || event.locationCoords?.coordinates[1],
          event.longitude || event.locationCoords?.coordinates[0]
        );
        return distance <= filters.distance;
      });
    }

    // Date range filter
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        if (filters.dateRange.start && eventDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && eventDate > filters.dateRange.end) return false;
        return true;
      });
    }

    // Time slot filter
    if (filters.timeSlots && filters.timeSlots.length > 0) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        const eventHour = eventDate.getHours();
        return filters.timeSlots.some(slot => {
          const TIME_SLOTS = [
            { id: 'morning', start: 6, end: 12 },
            { id: 'afternoon', start: 12, end: 17 },
            { id: 'evening', start: 17, end: 21 },
            { id: 'night', start: 21, end: 6 }
          ];
          const timeSlot = TIME_SLOTS.find(s => s.id === slot);
          if (!timeSlot) return false;
          if (timeSlot.id === 'night') {
            return eventHour >= 21 || eventHour < 6;
          }
          return eventHour >= timeSlot.start && eventHour < timeSlot.end;
        });
      });
    }

    // Price filter
    if (filters.priceRange) {
      if (filters.priceRange.free) {
        filtered = filtered.filter(event => !event.price || event.price === 0);
      } else {
        filtered = filtered.filter(event => {
          const price = event.price || 0;
          return price >= filters.priceRange.min && price <= filters.priceRange.max;
        });
      }
    }

    setFilteredEvents(filtered);

    // Auto-center map on filtered events
    if (filtered.length > 0 && !userPosition) {
      const firstEvent = filtered[0];
      const lat = firstEvent.latitude || firstEvent.locationCoords?.coordinates[1];
      const lng = firstEvent.longitude || firstEvent.locationCoords?.coordinates[0];
      if (lat && lng) {
        setMapCenter([lat, lng]);
        setMapZoom(12);
      }
    }
  }, [filters, allEvents, userPosition]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const userPos = [latitude, longitude];
          setUserPosition(userPos);
          setLocationAccuracy(accuracy);
          setMapCenter(userPos);
          setMapZoom(14);
          setError(null);
          setLocationPermission('granted');
        },
        (err) => {
          handleLocationError(err);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleSearchLocation = () => {
    if (!searchQuery.trim()) return;
    
    // Simple geocoding simulation - in production use a real geocoding service
    const matchedEvent = allEvents.find(event => 
      event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (matchedEvent) {
      const lat = matchedEvent.latitude || matchedEvent.locationCoords?.coordinates[1];
      const lng = matchedEvent.longitude || matchedEvent.locationCoords?.coordinates[0];
      if (lat && lng) {
        setMapCenter([lat, lng]);
        setMapZoom(15);
      }
    }
  };

  const handleUseMyLocation = () => {
    if (userPosition) {
      setMapCenter(userPosition);
      setMapZoom(14);
    } else {
      requestLocationPermission();
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.setZoom(currentZoom - 1);
    }
  };

  const getTileLayerUrl = () => {
    switch(mapLayer) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  if (loading && allEvents.length === 0) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="map-view">
      {/* Filter Panel */}
      <FilterPanel 
        onFilterChange={setFilters}
        totalEvents={filteredEvents.length}
        userLocation={userPosition}
      />

      {/* Search Box */}
      <div className="map-search-box">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search location or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
        <button 
          className="btn-use-location"
          onClick={handleUseMyLocation}
          title="Use my location"
        >
          📍 My Location
        </button>
      </div>

      {/* Event Counter */}
      <div className="event-counter-card">
        <div className="counter-content">
          <span className="counter-number">{filteredEvents.length}</span>
          <span className="counter-label">Events Found</span>
        </div>
      </div>

      {/* Map Legend */}
      {showLegend && (
        <div className="map-legend">
          <div className="legend-header">
            <h4>Legend</h4>
            <button 
              className="legend-close"
              onClick={() => setShowLegend(false)}
            >
              ✕
            </button>
          </div>
          <div className="legend-items">
            <div className="legend-item">
              <span style={{color: '#e91e63'}}>🎵</span>
              <span>Music</span>
            </div>
            <div className="legend-item">
              <span style={{color: '#2196f3'}}>⚽</span>
              <span>Sports</span>
            </div>
            <div className="legend-item">
              <span style={{color: '#ff9800'}}>🔧</span>
              <span>Workshop</span>
            </div>
            <div className="legend-item">
              <span style={{color: '#9c27b0'}}>🎨</span>
              <span>Exhibition</span>
            </div>
            <div className="legend-item">
              <span style={{color: '#4caf50'}}>🎓</span>
              <span>College Fest</span>
            </div>
            <div className="legend-item">
              <span style={{color: '#795548'}}>🕉️</span>
              <span>Religious</span>
            </div>
            <div className="legend-item">
              <span style={{color: '#ff5722'}}>📢</span>
              <span>Promotion</span>
            </div>
            <div className="legend-item">
              <span style={{color: '#607d8b'}}>🎪</span>
              <span>Other</span>
            </div>
          </div>
        </div>
      )}

      {!showLegend && (
        <button 
          className="legend-toggle"
          onClick={() => setShowLegend(true)}
        >
          🗺️ Legend
        </button>
      )}

      {/* Custom Zoom Controls */}
      <div className="custom-zoom-controls">
        <button 
          className="zoom-btn zoom-in"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          +
        </button>
        <button 
          className="zoom-btn zoom-out"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          −
        </button>
      </div>

      {/* Layer Toggle */}
      <div className="layer-toggle">
        <button
          className={`layer-btn ${mapLayer === 'standard' ? 'active' : ''}`}
          onClick={() => setMapLayer('standard')}
        >
          Standard
        </button>
        <button
          className={`layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapLayer('satellite')}
        >
          Satellite
        </button>
        <button
          className={`layer-btn ${mapLayer === 'terrain' ? 'active' : ''}`}
          onClick={() => setMapLayer('terrain')}
        >
          Terrain
        </button>
      </div>

      {/* Location Permission Banner */}
      {locationPermission === 'denied' && (
        <div className="location-banner error">
          <span className="banner-icon">📍</span>
          <span className="banner-text">
            Location access denied. <button onClick={requestLocationPermission}>Enable Location</button> to see nearby events.
          </span>
        </div>
      )}

      {locationPermission === 'prompt' && !userPosition && (
        <div className="location-banner info">
          <span className="banner-icon">ℹ️</span>
          <span className="banner-text">
            Enable location for personalized nearby events. <button onClick={requestLocationPermission}>Enable Now</button>
          </span>
        </div>
      )}

      {error && !userPosition && (
        <div className="location-banner warning">
          <span className="banner-icon">⚠️</span>
          <span className="banner-text">{error}</span>
        </div>
      )}
      
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        ref={mapRef}
        className="map-container"
        whenCreated={(map) => {
          mapRef.current = map;
          map.on('click', handleMapClick);
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={getTileLayerUrl()}
          key={mapLayer}
        />
        
        <MapController center={mapCenter} zoom={mapZoom} />
        
        {/* User Location Marker with Accuracy Circle */}
        {userPosition && (
          <>
            <Marker position={userPosition} icon={userLocationIcon}>
              <Popup>
                <div className="user-popup">
                  <h3>📍 Your Location</h3>
                  <p>You are here</p>
                  {locationAccuracy && (
                    <p className="accuracy-info">
                      Accuracy: {locationAccuracy < 100 ? '🎯 Precise' : '📡 Approximate'} 
                      ({Math.round(locationAccuracy)}m)
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            
            {/* Distance radius circle */}
            <Circle 
              center={userPosition} 
              radius={filters.distance ? filters.distance * 1000 : 10000}
              fillColor="#3b82f6" 
              fillOpacity={0.05} 
              color="#3b82f6" 
              weight={2}
              dashArray="5, 10"
            />
            
            {/* Accuracy circle */}
            {locationAccuracy && (
              <Circle
                center={userPosition}
                radius={locationAccuracy}
                fillColor="#3b82f6"
                fillOpacity={0.15}
                color="#3b82f6"
                weight={1}
              />
            )}
          </>
        )}
        
        {/* Event Markers with Category Colors */}
        {filteredEvents.map(event => {
          const lat = event.latitude || event.locationCoords?.coordinates[1];
          const lng = event.longitude || event.locationCoords?.coordinates[0];
          
          if (!lat || !lng) return null;
          
          const categoryColor = getCategoryColor(event.category);
          
          return (
            <Marker 
              key={`event-${event._id}`} 
              position={[lat, lng]}
              icon={getCategoryIcon(event.category, categoryColor)}
            >
              <Popup>
                <EventCard event={{
                  id: event._id,
                  title: event.title,
                  description: event.description,
                  location: event.location,
                  latitude: lat,
                  longitude: lng,
                  date: event.date,
                  category: event.category,
                  attendees: event.attendees?.length || 0
                }} />
              </Popup>
            </Marker>
          );
        })}

        {tasks.map(task => (
          <Marker 
            key={`task-${task._id}`} 
            position={[task.latitude, task.longitude]}
            icon={taskIcon}
          >
            <Popup>
              <div className="task-card">
                <h3>{task.title}</h3>
                <p><strong>Description:</strong> {task.description}</p>
                <p><strong>Location:</strong> {task.location}</p>
                <p><strong>Date:</strong> {new Date(task.date).toLocaleString()}</p>
                <p><strong>Category:</strong> {task.category}</p>
                <p><strong>Priority:</strong> 
                  <span className={`priority-${task.priority}`}> {task.priority}</span>
                </p>
                <p><strong>Attendees:</strong> {task.attendees}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Info Overlay */}
      <div className="map-overlay">
        <div className="events-summary">
          <h2>📊 Event Stats</h2>
          <div className="stat-item">
            <span className="stat-label">Total Events:</span>
            <span className="stat-value">{allEvents.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Filtered:</span>
            <span className="stat-value">{filteredEvents.length}</span>
          </div>
          {userPosition && locationAccuracy && (
            <div className="stat-item">
              <span className="stat-label">Location:</span>
              <span className="stat-value">
                {locationAccuracy < 100 ? '🎯 Precise' : '📡 Approximate'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}