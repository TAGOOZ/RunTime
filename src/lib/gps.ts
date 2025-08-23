export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface GPSTrack {
  points: GPSPoint[];
  totalDistance: number;
  averagePace: number; // minutes per km
  maxSpeed: number; // km/h
}

export class GPSTracker {
  private watchId: number | null = null;
  private points: GPSPoint[] = [];
  private isTracking = false;
  private onUpdate?: (point: GPSPoint, totalDistance: number) => void;

  constructor(onUpdate?: (point: GPSPoint, totalDistance: number) => void) {
    this.onUpdate = onUpdate;
  }

  async requestPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  startTracking(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      if (this.isTracking) {
        resolve();
        return;
      }

      this.points = [];
      this.isTracking = true;

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const point: GPSPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: Date.now(),
            accuracy: position.coords.accuracy
          };

          this.points.push(point);
          const totalDistance = this.calculateTotalDistance();
          
          if (this.onUpdate) {
            this.onUpdate(point, totalDistance);
          }

          if (this.points.length === 1) {
            resolve(); // First point received, tracking started
          }
        },
        (error) => {
          console.error('GPS tracking error:', error);
          if (this.points.length === 0) {
            reject(error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        }
      );
    });
  }

  stopTracking(): GPSTrack {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    
    const totalDistance = this.calculateTotalDistance();
    const averagePace = this.calculateAveragePace();
    const maxSpeed = this.calculateMaxSpeed();

    return {
      points: [...this.points],
      totalDistance,
      averagePace,
      maxSpeed
    };
  }

  private calculateTotalDistance(): number {
    if (this.points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      totalDistance += this.haversineDistance(prev, curr);
    }
    return totalDistance;
  }

  private calculateAveragePace(): number {
    if (this.points.length < 2) return 0;

    const totalDistance = this.calculateTotalDistance() / 1000; // km
    const totalTime = (this.points[this.points.length - 1].timestamp - this.points[0].timestamp) / 1000 / 60; // minutes
    
    if (totalDistance === 0) return 0;
    return totalTime / totalDistance; // minutes per km
  }

  private calculateMaxSpeed(): number {
    if (this.points.length < 2) return 0;

    let maxSpeed = 0;
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const distance = this.haversineDistance(prev, curr) / 1000; // km
      const time = (curr.timestamp - prev.timestamp) / 1000 / 3600; // hours
      
      if (time > 0) {
        const speed = distance / time; // km/h
        maxSpeed = Math.max(maxSpeed, speed);
      }
    }
    return maxSpeed;
  }

  private haversineDistance(point1: GPSPoint, point2: GPSPoint): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  getCurrentDistance(): number {
    return this.calculateTotalDistance();
  }

  getCurrentPace(): number {
    if (this.points.length < 2) return 0;
    
    // Calculate pace for last 5 points for more current reading
    const recentPoints = this.points.slice(-5);
    if (recentPoints.length < 2) return 0;

    const distance = this.haversineDistance(recentPoints[0], recentPoints[recentPoints.length - 1]) / 1000; // km
    const time = (recentPoints[recentPoints.length - 1].timestamp - recentPoints[0].timestamp) / 1000 / 60; // minutes
    
    if (distance === 0) return 0;
    return time / distance; // minutes per km
  }

  getPoints(): GPSPoint[] {
    return [...this.points];
  }
}