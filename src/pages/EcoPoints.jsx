import React from 'react';
import EcoPointsSection from '../components/EcoPointsSection';

export default function EcoPoints() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
            <EcoPointsSection showHeader={true} compact={false} />
        </div>
    );
}
