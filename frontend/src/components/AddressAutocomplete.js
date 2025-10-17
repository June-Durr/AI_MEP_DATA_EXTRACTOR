// frontend/src/components/AddressAutocomplete.js - SIMPLIFIED VERSION
import React, { useRef, useEffect, useState } from "react";

const AddressAutocomplete = ({ value, onChange, placeholder, style }) => {
  const inputRef = useRef(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps API is loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleLoaded(true);

      try {
        // Try to use the new PlaceAutocompleteElement
        if (window.google.maps.places.PlaceAutocompleteElement) {
          const autocompleteElement =
            new window.google.maps.places.PlaceAutocompleteElement();

          // Set placeholder on the input inside the element
          setTimeout(() => {
            const input = autocompleteElement.querySelector("input");
            if (input && placeholder) {
              input.placeholder = placeholder;
            }
          }, 100);

          // Clear and append
          if (inputRef.current) {
            inputRef.current.innerHTML = "";
            inputRef.current.appendChild(autocompleteElement);
          }

          // Listen for selection
          autocompleteElement.addEventListener(
            "gmp-placeselect",
            async (event) => {
              const place = event.place;
              if (!place) return;

              try {
                await place.fetchFields({ fields: ["formattedAddress"] });
                onChange(place.formattedAddress || "");
              } catch (err) {
                console.error("Error fetching place:", err);
              }
            }
          );

          return; // Exit if successful
        }
      } catch (err) {
        console.error("Google Places error:", err);
      }
    }

    // Fallback: Google not loaded or error - render will show regular input
  }, [onChange, placeholder]);

  // If Google isn't loaded or errored, show regular input
  if (!googleLoaded) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
      />
    );
  }

  // Google is loaded, render container for autocomplete element
  return <div ref={inputRef} style={{ width: "100%" }} />;
};

export default AddressAutocomplete;
