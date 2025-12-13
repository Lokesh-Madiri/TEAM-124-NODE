import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import eventService from '../api/eventService';
import EventCard from './EventCard';
import './MapView.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapView() {
  const [userPosition, setUserPosition] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef();

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userPos = [latitude, longitude];
          setUserPosition(userPos);
          setMapCenter(userPos);
          setMapZoom(14);
          setLoading(false);
        },
        (err) => {
          console.error("Error getting location:", err);
          setError("Unable to get your location. Showing default location.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser. Showing default location.");
      setLoading(false);
    }
  }, []);

  // Fetch events near user's location
  useEffect(() => {
    if (userPosition) {
      fetchEventsNearUser();
    }
  }, [userPosition]);

  const fetchEventsNearUser = async () => {
    try {
      if (!userPosition) return;
      
      const [latitude, longitude] = userPosition;
      const eventsData = await eventService.getEvents({ latitude, longitude });
      setEvents(eventsData);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events");
    }
  };

  const handleMapClick = (e) => {
    // Handle map click for adding new events
    console.log("Map clicked at:", e.latlng);
  };

  if (loading) {
    return <div className="map-loading">Detecting your location...</div>;
  }

  return (
    <div className="map-view">
      {error && <div className="map-error">{error}</div>}
      
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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userPosition && (
          <>
            <Marker position={userPosition}>
              <Popup>
                <div className="user-popup">
                  <h3>Your Location</h3>
                  <p>You are here</p>
                </div>
              </Popup>
            </Marker>
            
            {/* 10km radius circle */}
            <Circle 
              center={userPosition} 
              radius={10000} 
              fillColor="#3b82f6" 
              fillOpacity={0.1} 
              color="#3b82f6" 
              weight={1}
            />
          </>
        )}
        
        {events.map(event => (
          <Marker 
            key={event._id} 
            position={[event.latitude, event.longitude]}
          >
            <Popup>
              <EventCard event={{
                id: event._id,
                title: event.title,
                description: event.description,
                location: event.location,
                latitude: event.latitude,
                longitude: event.longitude,
                date: event.date,
                category: event.category,
                attendees: event.attendees || 0
              }} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="map-overlay">
        <div className="events-summary">
          <h2>Nearby Events</h2>
          <p>{events.length} events within 10km</p>
        </div>
      </div>
    </div>
  );
}