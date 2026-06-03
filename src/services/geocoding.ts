/**
 * Fetches a human-readable address from coordinates using OpenStreetMap Nominatim API.
 * @param lat Latitude
 * @param lng Longitude
 * @returns A promise that resolves to a string address.
 */
export async function fetchAddress(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'MyPickForagingApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data && data.display_name) {
      // Try to get a concise address
      const addr = data.address;
      if (addr) {
        const houseNumber = addr.house_number || '';
        const road = addr.road || addr.pedestrian || addr.path || '';
        const city = addr.city || addr.town || addr.village || addr.suburb || '';
        const county = addr.county || '';
        const state = addr.state || '';

        if (road) {
          return `${houseNumber ? houseNumber + ' ' : ''}${road}, ${city || county || state}`.trim();
        }
        
        if (city) {
          return `${city}, ${state || county}`.trim();
        }

        if (county) {
          return `${county}, ${state}`.trim();
        }
      }
      
      // Fallback to simplified display_name
      const parts = data.display_name.split(', ');
      return parts.slice(0, 3).join(', ');
    }

    return 'Address not found';
  } catch (error) {
    console.error('Error fetching address:', error);
    return 'Address not found';
  }
}
