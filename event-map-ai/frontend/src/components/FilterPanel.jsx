import React, { useState, useEffect } from 'react';
import './FilterPanel.css';

const CATEGORIES = [
  { id: 'music', name: 'Music', icon: '🎵', color: '#e91e63' },
  { id: 'sports', name: 'Sports', icon: '⚽', color: '#2196f3' },
  { id: 'workshop', name: 'Workshop', icon: '🔧', color: '#ff9800' },
  { id: 'exhibition', name: 'Exhibition', icon: '🎨', color: '#9c27b0' },
  { id: 'college-fest', name: 'College Fest', icon: '🎓', color: '#4caf50' },
  { id: 'religious', name: 'Religious', icon: '🕉️', color: '#795548' },
  { id: 'promotion', name: 'Promotion', icon: '📢', color: '#ff5722' },
  { id: 'other', name: 'Other', icon: '🎪', color: '#607d8b' }
];

const DATE_PRESETS = [
  { id: 'today', label: 'Today', getValue: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  }},
  { id: 'week', label: 'This Week', getValue: () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }},
  { id: 'month', label: 'This Month', getValue: () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start, end };
  }}
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', start: 6, end: 12 },
  { id: 'afternoon', label: 'Afternoon', start: 12, end: 17 },
  { id: 'evening', label: 'Evening', start: 17, end: 21 },
  { id: 'night', label: 'Night', start: 21, end: 6 }
];

const FilterPanel = ({ onFilterChange, totalEvents, userLocation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    dateRange: { start: null, end: null },
    distance: 10, // km
    priceRange: { min: 0, max: 1000, free: false },
    timeSlots: [],
    status: ['upcoming'],
    attendeeRange: { min: 0, max: 1000 }
  });

  const [activePreset, setActivePreset] = useState(null);
  const [savedPresets, setSavedPresets] = useState([]);

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('filterPresets');
    if (saved) {
      setSavedPresets(JSON.parse(saved));
    }
  }, []);

  // Emit filter changes
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const toggleCategory = (categoryId) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const applyDatePreset = (presetId) => {
    const preset = DATE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const { start, end } = preset.getValue();
      setFilters(prev => ({ ...prev, dateRange: { start, end } }));
      setActivePreset(presetId);
    }
  };

  const setCustomDateRange = (start, end) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end } }));
    setActivePreset('custom');
  };

  const toggleTimeSlot = (slotId) => {
    setFilters(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slotId)
        ? prev.timeSlots.filter(s => s !== slotId)
        : [...prev.timeSlots, slotId]
    }));
  };

  const setDistance = (distance) => {
    setFilters(prev => ({ ...prev, distance: parseInt(distance) }));
  };

  const setPriceRange = (min, max, free) => {
    setFilters(prev => ({ 
      ...prev, 
      priceRange: { 
        min: parseInt(min), 
        max: parseInt(max), 
        free: free !== undefined ? free : prev.priceRange.free 
      } 
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      dateRange: { start: null, end: null },
      distance: 10,
      priceRange: { min: 0, max: 1000, free: false },
      timeSlots: [],
      status: ['upcoming'],
      attendeeRange: { min: 0, max: 1000 }
    });
    setActivePreset(null);
  };

  const saveCurrentPreset = () => {
    const name = prompt('Enter a name for this filter preset:');
    if (name) {
      const newPreset = { id: Date.now(), name, filters: { ...filters } };
      const updated = [...savedPresets, newPreset];
      setSavedPresets(updated);
      localStorage.setItem('filterPresets', JSON.stringify(updated));
    }
  };

  const applyPreset = (preset) => {
    setFilters(preset.filters);
  };

  const deletePreset = (presetId) => {
    const updated = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updated);
    localStorage.setItem('filterPresets', JSON.stringify(updated));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.distance !== 10) count++;
    if (filters.priceRange.free || filters.priceRange.min > 0 || filters.priceRange.max < 1000) count++;
    if (filters.timeSlots.length > 0) count++;
    return count;
  };

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : ''}`}>
      {/* Category Filter Bar - Always Visible */}
      <div className="category-filter-bar">
        <div className="category-chips">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              className={`category-chip ${filters.categories.includes(category.id) ? 'active' : ''}`}
              style={{
                '--category-color': category.color,
                backgroundColor: filters.categories.includes(category.id) ? category.color : 'white',
                color: filters.categories.includes(category.id) ? 'white' : '#333'
              }}
              onClick={() => toggleCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
        
        <button 
          className="advanced-filter-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="filter-icon">🔍</span>
          Advanced Filters
          {getActiveFilterCount() > 0 && (
            <span className="filter-badge">{getActiveFilterCount()}</span>
          )}
        </button>
      </div>

      {/* Active Filter Summary */}
      <div className="filter-summary">
        {totalEvents !== undefined && (
          <span className="event-count">
            Showing <strong>{totalEvents}</strong> event{totalEvents !== 1 ? 's' : ''}
            {filters.categories.length > 0 && ` in ${filters.categories.length} categor${filters.categories.length > 1 ? 'ies' : 'y'}`}
            {userLocation && ` within ${filters.distance}km`}
          </span>
        )}
        
        {getActiveFilterCount() > 0 && (
          <button className="clear-filters-btn" onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters Sidebar */}
      {isExpanded && (
        <div className="advanced-filters-sidebar">
          <div className="sidebar-header">
            <h3>Advanced Filters</h3>
            <button className="close-sidebar" onClick={() => setIsExpanded(false)}>×</button>
          </div>

          <div className="sidebar-content">
            {/* Date Range Filter */}
            <div className="filter-section">
              <h4>📅 Date Range</h4>
              <div className="date-presets">
                {DATE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    className={`preset-btn ${activePreset === preset.id ? 'active' : ''}`}
                    onClick={() => applyDatePreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="custom-date-range">
                <label>
                  From:
                  <input
                    type="date"
                    value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => setCustomDateRange(new Date(e.target.value), filters.dateRange.end)}
                  />
                </label>
                <label>
                  To:
                  <input
                    type="date"
                    value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => setCustomDateRange(filters.dateRange.start, new Date(e.target.value))}
                  />
                </label>
              </div>
            </div>

            {/* Distance Filter */}
            {userLocation && (
              <div className="filter-section">
                <h4>📍 Distance</h4>
                <div className="distance-slider">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={filters.distance}
                    onChange={(e) => setDistance(e.target.value)}
                  />
                  <span className="distance-value">{filters.distance} km</span>
                </div>
              </div>
            )}

            {/* Time of Day Filter */}
            <div className="filter-section">
              <h4>🕐 Time of Day</h4>
              <div className="time-slots">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot.id}
                    className={`time-slot-btn ${filters.timeSlots.includes(slot.id) ? 'active' : ''}`}
                    onClick={() => toggleTimeSlot(slot.id)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="filter-section">
              <h4>💰 Price Range</h4>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.priceRange.free}
                  onChange={(e) => setPriceRange(filters.priceRange.min, filters.priceRange.max, e.target.checked)}
                />
                Free Events Only
              </label>
              {!filters.priceRange.free && (
                <div className="price-range">
                  <label>
                    Min:
                    <input
                      type="number"
                      min="0"
                      value={filters.priceRange.min}
                      onChange={(e) => setPriceRange(e.target.value, filters.priceRange.max)}
                    />
                  </label>
                  <label>
                    Max:
                    <input
                      type="number"
                      min="0"
                      value={filters.priceRange.max}
                      onChange={(e) => setPriceRange(filters.priceRange.min, e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Saved Presets */}
            <div className="filter-section">
              <h4>⭐ Saved Presets</h4>
              <button className="save-preset-btn" onClick={saveCurrentPreset}>
                Save Current Filters
              </button>
              <div className="saved-presets">
                {savedPresets.map(preset => (
                  <div key={preset.id} className="preset-item">
                    <button onClick={() => applyPreset(preset)}>{preset.name}</button>
                    <button className="delete-preset" onClick={() => deletePreset(preset.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
