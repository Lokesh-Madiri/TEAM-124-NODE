import React from 'react';
import { Link } from 'react-router-dom';
import './EventCard.css';

export default function EventCard({ event }) {
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'music': '#e91e63',
      'sports': '#2196f3',
      'workshop': '#ff9800',
      'exhibition': '#9c27b0',
      'college-fest': '#4caf50',
      'religious': '#795548',
      'promotion': '#ff5722',
      'other': '#607d8b',
      'Technology': '#3b82f6',
      'Music': '#ef4444',
      'Arts': '#8b5cf6',
      'Sports': '#10b981',
      'default': '#6b7280'
    };
    return colors[category?.toLowerCase()] || colors.default;
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

  return (
    <div className="event-card-popup">
      {/* Hero Section */}
      <div 
        className="event-hero"
        style={{
          background: `linear-gradient(135deg, ${getCategoryColor(event.category)}20, ${getCategoryColor(event.category)}40)`
        }}
      >
        <div className="event-category-badge">
          <span className="category-emoji">{getCategoryEmoji(event.category)}</span>
          <span className="category-text">{event.category}</span>
        </div>
      </div>

      {/* Content */}
      <div className="event-content">
        <h3 className="event-title">{event.title}</h3>
        <p className="event-description">{event.description}</p>
        
        {/* Quick Info Grid */}
        <div className="event-info-grid">
          <div className="info-item">
            <span className="info-icon">📅</span>
            <div className="info-text">
              <span className="info-label">Date</span>
              <span className="info-value">{formatDate(event.date)}</span>
            </div>
          </div>
          
          <div className="info-item">
            <span className="info-icon">📍</span>
            <div className="info-text">
              <span className="info-label">Location</span>
              <span className="info-value">{event.location}</span>
            </div>
          </div>
          
          <div className="info-item">
            <span className="info-icon">👥</span>
            <div className="info-text">
              <span className="info-label">Attending</span>
              <span className="info-value">{event.attendees || 0} people</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="event-actions">
          <Link 
            to={`/event/${event.id}`} 
            className="btn-action btn-primary"
          >
            <span>📖</span>
            View Details
          </Link>
          <a 
            href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-action btn-secondary"
          >
            <span>🗺️</span>
            Directions
          </a>
        </div>
      </div>
    </div>
  );
}