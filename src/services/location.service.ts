import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { Location, LocationInfo } from '@/types';

const LOCATIONS_COLLECTION = 'locations';

export const locationService = {
  async getCurrentPosition(): Promise<LocationInfo> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Reverse geocoding usando API pública (em produção, usar serviço pago)
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY&limit=1`
            );
            
            let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            
            if (response.ok) {
              const data = await response.json();
              if (data.results?.[0]?.formatted) {
                address = data.results[0].formatted;
              }
            }

            resolve({
              coordinates: { lat: latitude, lng: longitude },
              address,
              accuracy,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            // Fallback sem reverse geocoding
            resolve({
              coordinates: { lat: latitude, lng: longitude },
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              accuracy,
              timestamp: new Date().toISOString()
            });
          }
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  },

  async createLocation(location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location> {
    const locationsCollection = collection(db, LOCATIONS_COLLECTION);
    const docRef = await addDoc(locationsCollection, {
      ...location,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { 
      ...location, 
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async getAllLocations(): Promise<Location[]> {
    const locationsCollection = collection(db, LOCATIONS_COLLECTION);
    const q = query(locationsCollection, where('isActive', '==', true), orderBy('name'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Location;
    });
  },

  async getUserAllowedLocations(userId: string): Promise<Location[]> {
    const locationsCollection = collection(db, LOCATIONS_COLLECTION);
    const q = query(
      locationsCollection, 
      where('isActive', '==', true),
      where('allowedUsers', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Location;
    });
  },

  async updateLocation(locationId: string, updates: Partial<Location>): Promise<void> {
    const docRef = doc(db, LOCATIONS_COLLECTION, locationId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async deleteLocation(locationId: string): Promise<void> {
    const docRef = doc(db, LOCATIONS_COLLECTION, locationId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  },

  calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distância em metros
  },

  async validateLocation(
    currentLocation: LocationInfo,
    allowedLocations: Location[]
  ): Promise<{ isValid: boolean; nearestLocation?: Location; distance?: number }> {
    if (!allowedLocations.length) {
      return { isValid: true }; // Se não há locais configurados, permite em qualquer lugar
    }

    let nearestLocation: Location | undefined;
    let minDistance = Infinity;

    for (const location of allowedLocations) {
      const distance = this.calculateDistance(
        currentLocation.coordinates,
        location.coordinates
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }

      if (distance <= location.radius) {
        return { 
          isValid: true, 
          nearestLocation: location, 
          distance 
        };
      }
    }

    return { 
      isValid: false, 
      nearestLocation, 
      distance: minDistance 
    };
  },

  async isLocationValidForUser(userId: string, currentLocation?: LocationInfo): Promise<{
    isValid: boolean;
    location?: LocationInfo;
    nearestLocation?: Location;
    distance?: number;
    error?: string;
  }> {
    try {
      const location = currentLocation || await this.getCurrentPosition();
      const allowedLocations = await this.getUserAllowedLocations(userId);
      
      const validation = await this.validateLocation(location, allowedLocations);
      
      return {
        isValid: validation.isValid,
        location,
        nearestLocation: validation.nearestLocation,
        distance: validation.distance
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Locais padrão para inicialização
  getDefaultLocations(): Omit<Location, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: 'Escritório Principal',
        address: 'Centro da cidade',
        coordinates: { lat: -23.5505, lng: -46.6333 }, // São Paulo como exemplo
        radius: 100, // 100 metros
        allowedUsers: [],
        isActive: true,
        type: 'office'
      },
      {
        name: 'Home Office',
        address: 'Trabalho remoto',
        coordinates: { lat: 0, lng: 0 }, // Coordenadas genéricas
        radius: 50000, // 50km - permite grande área para home office
        allowedUsers: [],
        isActive: true,
        type: 'home_office'
      }
    ];
  }
};