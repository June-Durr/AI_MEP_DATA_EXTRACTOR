// frontend/src/utils/loadGoogleMaps.js
let isLoading = false;
let isLoaded = false;
let loadPromise = null;

export const loadGoogleMaps = () => {
  // Already loaded
  if (isLoaded) {
    return Promise.resolve();
  }

  // Currently loading - return existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;

  loadPromise = new Promise((resolve, reject) => {
    // Check if API key is configured
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      console.warn(
        "Google Maps API key not configured. Address autocomplete disabled."
      );
      isLoading = false;
      reject(new Error("API key not configured"));
      return;
    }

    // Create script tag with proper async loading
    const script = document.createElement("script");
    // NEW
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      console.log("Google Maps API loaded successfully");
      resolve();
    };

    script.onerror = (error) => {
      isLoading = false;
      loadPromise = null;
      console.error("Failed to load Google Maps API:", error);
      reject(error);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

// Check if Google Maps is already loaded (useful for testing)
export const isGoogleMapsLoaded = () => {
  return (
    isLoaded && window.google && window.google.maps && window.google.maps.places
  );
};
