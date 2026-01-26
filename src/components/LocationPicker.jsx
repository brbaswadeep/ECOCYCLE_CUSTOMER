import React, { useEffect, useRef, useState } from 'react';
// Import the place picker web component which is a valid export
import '@googlemaps/extended-component-library/place_picker.js';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("LocationPicker Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                    <p className="text-red-600 font-medium">Something went wrong loading the map.</p>
                    <p className="text-xs text-red-400 mt-1">{this.state.error?.message}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function LocationPickerContent({
    initialLocation,
    onLocationSelect,
    readOnly = false
}) {
    const mapRef = useRef(null);
    const pickerRef = useRef(null);
    const [map, setMap] = useState(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // Check if google maps is loaded
        if (!window.google || !window.google.maps) {
            console.warn("Google Maps API not loaded");
            return;
        }

        const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // India center
        const startLocation = initialLocation || defaultLocation;

        const initializedMap = new window.google.maps.Map(mapRef.current, {
            center: startLocation,
            zoom: initialLocation ? 17 : 5,
            mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
            disableDefaultUI: true,
            zoomControl: true,
        });

        setMap(initializedMap);

        // Initialize marker
        const { AdvancedMarkerElement } = window.google.maps.marker;
        const marker = new AdvancedMarkerElement({
            map: initializedMap,
            position: startLocation,
            gmpDraggable: !readOnly,
            title: "Selected Location"
        });
        markerRef.current = marker;

        // Handle marker drag
        if (!readOnly) {
            marker.addListener('dragend', async () => {
                const position = marker.position;
                if (position) {
                    const lat = position.lat;
                    const lng = position.lng;
                    // Simplify: just passing lat/lng. Geocoding would happen here ideally.
                    if (onLocationSelect) {
                        onLocationSelect({ lat, lng });
                    }
                }
            });

            initializedMap.addListener('click', (e) => {
                if (e.latLng) {
                    marker.position = e.latLng;
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    if (onLocationSelect) {
                        onLocationSelect({ lat, lng });
                    }
                }
            });
        }

        // Setup Place Picker
        if (pickerRef.current) {
            pickerRef.current.addEventListener('gmpx-placechange', () => {
                const place = pickerRef.current.place;
                if (place && place.location) {
                    const location = place.location;
                    initializedMap.setCenter(location);
                    initializedMap.setZoom(17);
                    marker.position = location;

                    if (onLocationSelect) {
                        onLocationSelect({
                            lat: location.lat(),
                            lng: location.lng(),
                            address: place.formattedAddress,
                            name: place.displayName
                        });
                    }
                }
            });
        }

        return () => {
            // Cleanup listeners if needed
        };
    }, []); // Run once on mount

    // Update marker if initialLocation changes (e.g. from prop update)
    useEffect(() => {
        if (map && initialLocation && markerRef.current) {
            const newPos = { lat: initialLocation.lat, lng: initialLocation.lng };
            markerRef.current.position = newPos;
            map.setCenter(newPos);
            map.setZoom(17);
        }
    }, [initialLocation, map]);

    return (
        <div className="w-full space-y-4">
            {!readOnly && (
                <div className="bg-white p-2 rounded-xl border border-brand-brown/10 shadow-sm z-10 relative">
                    <gmpx-place-picker
                        ref={pickerRef}
                        placeholder="Search for your address..."
                        style={{ width: '100%' }}
                    ></gmpx-place-picker>
                </div>
            )}

            <div className={`w-full rounded-2xl overflow-hidden shadow-md border border-brand-brown/10 relative z-0 ${readOnly ? 'h-[250px]' : 'h-[400px]'}`}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {!readOnly && (
                <p className="text-xs text-brand-brown/60 text-center">
                    Search or drag the marker to pinpoint your exact location.
                </p>
            )}
        </div>
    );
}

export default function LocationPicker(props) {
    return (
        <ErrorBoundary>
            <LocationPickerContent {...props} />
        </ErrorBoundary>
    );
}
