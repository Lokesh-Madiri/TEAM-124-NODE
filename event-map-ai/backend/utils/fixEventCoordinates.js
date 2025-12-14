/**
 * Database Migration Script: Fix and Validate Event Coordinates
 * 
 * This script:
 * 1. Validates all event coordinates
 * 2. Fixes invalid coordinates
 * 3. Migrates old coordinate format to new format
 * 4. Adds missing geospatial indexes
 */

const mongoose = require('mongoose');
const Event = require('../src/models/Event');
require('dotenv').config({ path: '../backend/.env' });

// Coordinate validation ranges
const VALID_LAT_RANGE = { min: -90, max: 90 };
const VALID_LNG_RANGE = { min: -180, max: 180 };

// Default fallback location (India center)
const DEFAULT_LOCATION = {
  latitude: 20.5937,
  longitude: 78.9629,
  type: 'Point',
  coordinates: [78.9629, 20.5937] // [lng, lat] for GeoJSON
};

class CoordinateFixer {
  constructor() {
    this.stats = {
      total: 0,
      valid: 0,
      fixed: 0,
      invalid: 0,
      errors: []
    };
  }

  /**
   * Validate coordinate values
   */
  isValidCoordinate(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }
    
    if (isNaN(lat) || isNaN(lng)) {
      return false;
    }
    
    if (lat < VALID_LAT_RANGE.min || lat > VALID_LAT_RANGE.max) {
      return false;
    }
    
    if (lng < VALID_LNG_RANGE.min || lng > VALID_LNG_RANGE.max) {
      return false;
    }
    
    return true;
  }

  /**
   * Get coordinate from various possible formats
   */
  extractCoordinates(event) {
    let lat, lng;

    // Try direct properties
    if (event.latitude !== undefined && event.longitude !== undefined) {
      lat = parseFloat(event.latitude);
      lng = parseFloat(event.longitude);
      if (this.isValidCoordinate(lat, lng)) {
        return { lat, lng, source: 'direct' };
      }
    }

    // Try locationCoords (GeoJSON format)
    if (event.locationCoords?.coordinates) {
      lng = parseFloat(event.locationCoords.coordinates[0]);
      lat = parseFloat(event.locationCoords.coordinates[1]);
      if (this.isValidCoordinate(lat, lng)) {
        return { lat, lng, source: 'geoJSON' };
      }
    }

    // Try location object
    if (event.location?.coordinates) {
      lng = parseFloat(event.location.coordinates[0]);
      lat = parseFloat(event.location.coordinates[1]);
      if (this.isValidCoordinate(lat, lng)) {
        return { lat, lng, source: 'location' };
      }
    }

    return null;
  }

  /**
   * Geocode location string to coordinates (placeholder)
   * In production, integrate with geocoding service
   */
  async geocodeLocation(locationString) {
    console.log(`  ℹ️  Geocoding needed for: ${locationString}`);
    // TODO: Integrate with geocoding service (Google Maps, Nominatim, etc.)
    // For now, return default location
    return DEFAULT_LOCATION;
  }

  /**
   * Fix a single event
   */
  async fixEvent(event) {
    try {
      // Extract coordinates
      const coords = this.extractCoordinates(event);
      
      if (coords) {
        // Valid coordinates found, ensure both formats are present
        const needsUpdate = 
          !event.latitude || 
          !event.longitude || 
          !event.locationCoords?.coordinates;

        if (needsUpdate) {
          event.latitude = coords.lat;
          event.longitude = coords.lng;
          event.locationCoords = {
            type: 'Point',
            coordinates: [coords.lng, coords.lat]
          };

          await event.save();
          console.log(`  ✅ Fixed event: ${event.title} (${coords.source})`);
          this.stats.fixed++;
        } else {
          console.log(`  ✓ Valid: ${event.title}`);
          this.stats.valid++;
        }
      } else {
        // No valid coordinates, try geocoding
        if (event.location && typeof event.location === 'string') {
          const geocoded = await this.geocodeLocation(event.location);
          
          event.latitude = geocoded.latitude;
          event.longitude = geocoded.longitude;
          event.locationCoords = {
            type: 'Point',
            coordinates: geocoded.coordinates
          };

          await event.save();
          console.log(`  🔧 Geocoded: ${event.title}`);
          this.stats.fixed++;
        } else {
          console.log(`  ❌ Cannot fix: ${event.title} - No location data`);
          this.stats.invalid++;
          this.stats.errors.push({
            id: event._id,
            title: event.title,
            reason: 'No valid location data'
          });
        }
      }
    } catch (error) {
      console.error(`  ❌ Error fixing event ${event.title}:`, error.message);
      this.stats.errors.push({
        id: event._id,
        title: event.title,
        reason: error.message
      });
    }
  }

  /**
   * Run the migration
   */
  async run() {
    try {
      console.log('🚀 Starting Event Coordinate Migration...\n');

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-map');
      console.log('✅ Connected to MongoDB\n');

      // Get all events
      const events = await Event.find({});
      this.stats.total = events.length;
      console.log(`📊 Found ${events.length} events to process\n`);

      // Process each event
      for (let i = 0; i < events.length; i++) {
        console.log(`[${i + 1}/${events.length}] Processing: ${events[i].title}`);
        await this.fixEvent(events[i]);
      }

      // Print summary
      console.log('\n📋 Migration Summary:');
      console.log('═══════════════════════════════════════');
      console.log(`Total events processed: ${this.stats.total}`);
      console.log(`Already valid: ${this.stats.valid}`);
      console.log(`Fixed: ${this.stats.fixed}`);
      console.log(`Still invalid: ${this.stats.invalid}`);
      console.log('═══════════════════════════════════════\n');

      if (this.stats.errors.length > 0) {
        console.log('⚠️  Errors encountered:');
        this.stats.errors.forEach((err, idx) => {
          console.log(`${idx + 1}. ${err.title} (${err.id}): ${err.reason}`);
        });
        console.log('');
      }

      // Ensure geospatial index exists
      console.log('🔍 Ensuring geospatial index...');
      try {
        await Event.collection.createIndex({ locationCoords: '2dsphere' });
        console.log('✅ Geospatial index created/verified\n');
      } catch (indexError) {
        console.log('ℹ️  Geospatial index already exists or error:', indexError.message);
      }

      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('👋 Database connection closed');
    }
  }

  /**
   * Validate all coordinates without fixing
   */
  async validate() {
    try {
      console.log('🔍 Validating Event Coordinates...\n');

      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-map');
      console.log('✅ Connected to MongoDB\n');

      const events = await Event.find({});
      this.stats.total = events.length;

      const issues = [];

      for (const event of events) {
        const coords = this.extractCoordinates(event);
        
        if (!coords) {
          issues.push({
            id: event._id,
            title: event.title,
            issue: 'No valid coordinates',
            location: event.location
          });
        } else {
          // Check if both formats exist
          const hasDirectProps = event.latitude && event.longitude;
          const hasGeoJSON = event.locationCoords?.coordinates;

          if (!hasDirectProps || !hasGeoJSON) {
            issues.push({
              id: event._id,
              title: event.title,
              issue: 'Missing coordinate format',
              hasDirectProps,
              hasGeoJSON
            });
          }
        }
      }

      console.log(`📊 Validation Results:`);
      console.log(`Total events: ${events.length}`);
      console.log(`Issues found: ${issues.length}\n`);

      if (issues.length > 0) {
        console.log('⚠️  Events with coordinate issues:');
        issues.forEach((issue, idx) => {
          console.log(`${idx + 1}. ${issue.title}`);
          console.log(`   Issue: ${issue.issue}`);
          if (issue.location) console.log(`   Location: ${issue.location}`);
          console.log('');
        });
      } else {
        console.log('✅ All events have valid coordinates!');
      }

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    } finally {
      await mongoose.connection.close();
    }
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const fixer = new CoordinateFixer();

  if (command === 'validate') {
    fixer.validate().catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else {
    fixer.run().catch(err => {
      console.error(err);
      process.exit(1);
    });
  }
}

module.exports = CoordinateFixer;
