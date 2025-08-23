export interface SimulatedGPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface SimulationConfig {
  startLat: number;
  startLng: number;
  duration: number; // seconds
  speed: number; // km/h
  updateInterval: number; // milliseconds
  route: 'straight' | 'circular' | 'random' | 'figure8';
  accuracy?: number; // meters
}

export class GPSSimulator {
  private config: SimulationConfig;
  private currentLat: number;
  private currentLng: number;
  private startTime: number;
  private intervalId: number | null = null;
  private onUpdate?: (point: SimulatedGPSPoint) => void;
  private angle: number = 0; // for circular and figure8 routes
  private step: number = 0;

  constructor(config: SimulationConfig, onUpdate?: (point: SimulatedGPSPoint) => void) {
    this.config = {
      accuracy: 5, // default 5m accuracy
      ...config
    };
    this.currentLat = config.startLat;
    this.currentLng = config.startLng;
    this.startTime = Date.now();
    this.onUpdate = onUpdate;
  }

  start(): void {
    if (this.intervalId) return;

    this.startTime = Date.now();
    this.step = 0;
    
    // Send initial position
    this.sendUpdate();

    this.intervalId = window.setInterval(() => {
      this.updatePosition();
      this.sendUpdate();
      
      // Stop after duration
      if (Date.now() - this.startTime >= this.config.duration * 1000) {
        this.stop();
      }
    }, this.config.updateInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updatePosition(): void {
    const distancePerUpdate = (this.config.speed * 1000 / 3600) * (this.config.updateInterval / 1000); // meters
    const earthRadius = 6371000; // meters

    switch (this.config.route) {
      case 'straight':
        this.updateStraightRoute(distancePerUpdate, earthRadius);
        break;
      case 'circular':
        this.updateCircularRoute(distancePerUpdate, earthRadius);
        break;
      case 'figure8':
        this.updateFigure8Route(distancePerUpdate, earthRadius);
        break;
      case 'random':
        this.updateRandomRoute(distancePerUpdate, earthRadius);
        break;
    }

    this.step++;
  }

  private updateStraightRoute(distance: number, earthRadius: number): void {
    // Move north-east
    const bearing = 45; // degrees
    const bearingRad = (bearing * Math.PI) / 180;
    
    const deltaLat = (distance * Math.cos(bearingRad)) / earthRadius;
    const deltaLng = (distance * Math.sin(bearingRad)) / (earthRadius * Math.cos(this.currentLat * Math.PI / 180));
    
    this.currentLat += deltaLat * (180 / Math.PI);
    this.currentLng += deltaLng * (180 / Math.PI);
  }

  private updateCircularRoute(distance: number, earthRadius: number): void {
    const radius = 100; // 100m radius circle
    const circumference = 2 * Math.PI * radius;
    const angleIncrement = (distance / circumference) * 2 * Math.PI;
    
    this.angle += angleIncrement;
    
    const centerLat = this.config.startLat;
    const centerLng = this.config.startLng;
    
    const deltaLat = (radius * Math.cos(this.angle)) / earthRadius;
    const deltaLng = (radius * Math.sin(this.angle)) / (earthRadius * Math.cos(centerLat * Math.PI / 180));
    
    this.currentLat = centerLat + deltaLat * (180 / Math.PI);
    this.currentLng = centerLng + deltaLng * (180 / Math.PI);
  }

  private updateFigure8Route(distance: number, earthRadius: number): void {
    const radius = 50; // 50m radius for each loop
    const t = this.step * 0.1; // time parameter
    
    // Figure-8 parametric equations
    const x = radius * Math.sin(t);
    const y = radius * Math.sin(t) * Math.cos(t);
    
    const deltaLat = y / earthRadius;
    const deltaLng = x / (earthRadius * Math.cos(this.config.startLat * Math.PI / 180));
    
    this.currentLat = this.config.startLat + deltaLat * (180 / Math.PI);
    this.currentLng = this.config.startLng + deltaLng * (180 / Math.PI);
  }

  private updateRandomRoute(distance: number, earthRadius: number): void {
    // Random walk with some momentum
    const maxTurn = Math.PI / 4; // 45 degrees max turn
    const turnAngle = (Math.random() - 0.5) * maxTurn;
    this.angle += turnAngle;
    
    const deltaLat = (distance * Math.cos(this.angle)) / earthRadius;
    const deltaLng = (distance * Math.sin(this.angle)) / (earthRadius * Math.cos(this.currentLat * Math.PI / 180));
    
    this.currentLat += deltaLat * (180 / Math.PI);
    this.currentLng += deltaLng * (180 / Math.PI);
  }

  private sendUpdate(): void {
    if (!this.onUpdate) return;

    // Add some GPS accuracy noise
    const accuracyNoise = (this.config.accuracy || 5) / 111000; // convert meters to degrees (rough)
    const latNoise = (Math.random() - 0.5) * accuracyNoise;
    const lngNoise = (Math.random() - 0.5) * accuracyNoise;

    const point: SimulatedGPSPoint = {
      latitude: this.currentLat + latNoise,
      longitude: this.currentLng + lngNoise,
      timestamp: Date.now(),
      accuracy: this.config.accuracy
    };

    this.onUpdate(point);
  }

  getCurrentPosition(): SimulatedGPSPoint {
    return {
      latitude: this.currentLat,
      longitude: this.currentLng,
      timestamp: Date.now(),
      accuracy: this.config.accuracy
    };
  }
}

// Predefined test locations
export const TEST_LOCATIONS = {
  // Central Park, NYC
  centralPark: { lat: 40.7829, lng: -73.9654 },
  // Hyde Park, London
  hydePark: { lat: 51.5074, lng: -0.1278 },
  // Golden Gate Park, SF
  goldenGate: { lat: 37.7694, lng: -122.4862 },
  // Default test location (somewhere in Europe)
  default: { lat: 52.5200, lng: 13.4050 }
};

// Helper function to create common test scenarios
export function createTestScenario(scenario: 'jog' | 'run' | 'walk' | 'sprint', location = TEST_LOCATIONS.default) {
  const scenarios = {
    walk: { speed: 5, route: 'random' as const },
    jog: { speed: 8, route: 'circular' as const },
    run: { speed: 12, route: 'straight' as const },
    sprint: { speed: 20, route: 'figure8' as const }
  };

  const config = scenarios[scenario];
  
  return {
    startLat: location.lat,
    startLng: location.lng,
    duration: 300, // 5 minutes
    speed: config.speed,
    updateInterval: 1000, // 1 second
    route: config.route,
    accuracy: 5
  };
}