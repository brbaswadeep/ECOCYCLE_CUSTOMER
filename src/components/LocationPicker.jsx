import React, { useEffect, useRef, useState } from 'react';
// Import the place picker web component which is a valid export
import '@googlemaps/extended-component-library/place_picker.js';

export default function LocationPicker({
    initialLocation,
    onLocationSelect,
    readOnly = false
}) {
    // ... (keep hooks)

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
