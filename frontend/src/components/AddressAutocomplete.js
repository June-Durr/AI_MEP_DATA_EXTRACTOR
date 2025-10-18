// frontend/src/components/AddressAutocomplete.js - With Dynamic Loading
import React, { useRef, useEffect, useState } from "react";

const AddressAutocomplete = ({ value, onChange, placeholder, style }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn("Google Maps API key not found");
      return;
    }

    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleLoaded(true);
      return;
    }

    // Load the script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    try {
      // Use the classic Autocomplete widget
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          fields: ["formatted_address", "address_components"],
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          setInputValue(place.formatted_address);
          onChange(place.formatted_address);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.error("Error initializing autocomplete:", err);
    }
  }, [googleLoaded, onChange]);

  // Update local state when prop changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={(e) => {
        setInputValue(e.target.value);
        onChange(e.target.value);
      }}
      placeholder={placeholder}
      style={style}
    />
  );
};

export default AddressAutocomplete;
