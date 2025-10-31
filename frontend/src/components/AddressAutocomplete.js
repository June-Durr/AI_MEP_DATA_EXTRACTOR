// frontend/src/components/AddressAutocomplete.js
import React, { useRef, useEffect } from "react";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";

const AddressAutocomplete = ({ value, onChange, placeholder }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(async () => {
        if (!inputRef.current) return;

        try {
          await window.google.maps.importLibrary("places");
          const { Autocomplete } = await window.google.maps.importLibrary("places");

          // Use the classic Autocomplete that doesn't replace the input
          const autocomplete = new Autocomplete(inputRef.current, {
            types: ["address"],
            fields: ["formatted_address"],
          });

          autocompleteRef.current = autocomplete;

          // Listen for place selection
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place && place.formatted_address) {
              console.log("Address selected:", place.formatted_address);
              onChange(place.formatted_address);
            }
          });

          console.log("Autocomplete attached to input");
        } catch (err) {
          console.error("Error initializing autocomplete:", err);
        }
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
      });

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Enter an address"}
      style={{
        width: "100%",
        padding: "10px",
        fontSize: "16px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        boxSizing: "border-box",
      }}
    />
  );
};

export default AddressAutocomplete;
