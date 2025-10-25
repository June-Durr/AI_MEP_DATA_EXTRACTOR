// frontend/src/components/AddressAutocomplete.js
import React, { useRef, useEffect, useState } from "react";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";

const AddressAutocomplete = ({ value, onChange, placeholder, style }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Load Google Maps API using centralized loader
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        console.log("Google Maps loaded, initializing autocomplete...");
        setGoogleLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
      });
  }, []);

  // Initialize new PlaceAutocompleteElement
  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    try {
      // Create new PlaceAutocompleteElement instance
      const autocompleteElement =
        new window.google.maps.places.PlaceAutocompleteElement();

      // Apply styling to the autocomplete element
      autocompleteElement.style.width = "100%";
      autocompleteElement.style.backgroundColor = "white";

      // Replace the input with the autocomplete element
      const parent = inputRef.current.parentNode;
      parent.replaceChild(autocompleteElement, inputRef.current);
      autocompleteRef.current = autocompleteElement;

      // Listen for place selection using new event
      autocompleteElement.addEventListener("gmp-placeselect", async (event) => {
        const place = event.place;

        if (place) {
          // Fetch place details
          await place.fetchFields({
            fields: ["formattedAddress", "addressComponents"],
          });

          if (place.formattedAddress) {
            onChange(place.formattedAddress);
          }
        }
      });

      // Style the internal input element and dropdown with !important
      const styleElements = () => {
        const input = autocompleteElement.querySelector("input");
        if (input) {
          input.style.setProperty("background-color", "white", "important");
          input.style.setProperty("color", "#000", "important");
          input.style.setProperty("padding", "10px", "important");
          input.style.setProperty("font-size", "16px", "important");
          input.style.setProperty("border", "1px solid #ccc", "important");
          input.style.setProperty("border-radius", "4px", "important");
          input.style.setProperty("box-sizing", "border-box", "important");
          input.style.setProperty("width", "100%", "important");

          // Set the value to preserve existing address
          if (value) {
            input.value = value;
          }
        }
      };

      // Apply styles immediately and after a short delay to ensure they stick
      styleElements();
      setTimeout(styleElements, 0);
      setTimeout(styleElements, 100);
      setTimeout(styleElements, 500);

      // Use MutationObserver to re-apply styles if they get overridden
      const observer = new MutationObserver(styleElements);
      observer.observe(autocompleteElement, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      // Add global styles for the input and dropdown suggestions
      if (!document.getElementById("gmap-autocomplete-styles")) {
        const style = document.createElement("style");
        style.id = "gmap-autocomplete-styles";
        style.textContent = `
          gmp-placeautocomplete input {
            background-color: white !important;
            color: #000 !important;
            padding: 10px !important;
            font-size: 16px !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            box-sizing: border-box !important;
          }
          gmp-placeautocomplete input::placeholder {
            color: #999 !important;
          }
          .pac-container {
            background-color: white !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
            margin-top: 2px !important;
            z-index: 10000 !important;
          }
          .pac-item {
            background-color: white !important;
            color: #000 !important;
            padding: 8px !important;
            cursor: pointer !important;
            border-top: 1px solid #e6e6e6 !important;
          }
          .pac-item:first-child {
            border-top: none !important;
          }
          .pac-item:hover {
            background-color: #f5f5f5 !important;
          }
          .pac-item-query {
            color: #000 !important;
            font-size: 14px !important;
          }
          .pac-matched {
            font-weight: bold !important;
            color: #1a73e8 !important;
          }
          .pac-icon {
            background-image: none !important;
          }
        `;
        document.head.appendChild(style);
      }

      console.log("PlaceAutocompleteElement initialized successfully");
    } catch (err) {
      console.error("Error initializing PlaceAutocompleteElement:", err);
    }

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
      }
    };
  }, [googleLoaded, onChange]);

  // Update input value when prop changes
  useEffect(() => {
    if (autocompleteRef.current) {
      const input = autocompleteRef.current.querySelector("input");
      if (input && value !== undefined) {
        input.value = value;
      }
    } else if (inputRef.current && value !== undefined) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder || "Enter an address"}
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px",
        fontSize: "16px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
};

export default AddressAutocomplete;
