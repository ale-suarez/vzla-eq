export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export async function getCurrentGeoPoint(): Promise<GeoPoint> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("La geolocalización no está disponible en este dispositivo.");
  }

  return await new Promise<GeoPoint>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        reject(new Error("No se pudo obtener la ubicación del dispositivo."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
