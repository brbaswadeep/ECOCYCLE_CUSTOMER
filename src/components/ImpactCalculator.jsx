import React, { useState } from 'react';
import { calculateEnvironmentalImpact } from '../../services/environmentalImpactService';

const ImpactCalculator = () => {
  const [wasteType, setWasteType] = useState('plastic');
  const [weight, setWeight] = useState('');
  const [impact, setImpact] = useState(null);
  const [error, setError] = useState('');

  const wasteTypes = [
    'plastic',
    'paper',
    'cardboard',
    'metal',
    'glass',
    'wood',
    'fabric',
    'textile',
    'rubber',
    'organic',
    'e-waste',
    'mixed',
    'unknown',
  ];

  const handleCalculate = () => {
    setError('');
    setImpact(null);

    if (!weight || parseFloat(weight) <= 0) {
      setError('Please enter a valid weight greater than 0');
      return;
    }

    const result = calculateEnvironmentalImpact(wasteType, parseFloat(weight));

    if (result.error) {
      setError(result.error);
    } else {
      setImpact(result);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            Environmental Impact Calculator
          </h1>
          <p className="text-gray-600 mb-6">
            Discover the positive environmental impact of your waste recycling
          </p>

          {/* Input Section */}
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Waste
              </label>
              <select
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {wasteTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (in kg)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight in kilograms"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                step="0.1"
              />
            </div>

            <button
              onClick={handleCalculate}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              Calculate Impact
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Results Section */}
          {impact && (
            <div className="space-y-6">
              {/* Impact Score */}
              <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Environmental Impact Score
                  </h2>
                  <div className="text-center">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: getScoreColor(impact.earth_impact_score) }}
                    >
                      {impact.earth_impact_score}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="text-gray-600 text-sm mb-1">CO₂ Saved</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {impact.co2_saved_kg} kg
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                  <p className="text-gray-600 text-sm mb-1">Energy Saved</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {impact.energy_saved_kwh} kWh
                  </p>
                </div>

                <div className="bg-cyan-50 p-4 rounded-lg border-l-4 border-cyan-500">
                  <p className="text-gray-600 text-sm mb-1">Water Saved</p>
                  <p className="text-2xl font-bold text-cyan-600">
                    {impact.water_saved_liters} L
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="text-gray-600 text-sm mb-1">Waste Diverted</p>
                  <p className="text-2xl font-bold text-green-600">
                    {impact.waste_diverted_kg} kg
                  </p>
                </div>
              </div>

              {/* Trees Saved */}
              {impact.trees_saved !== null && (
                <div className="bg-green-100 p-4 rounded-lg border-l-4 border-green-600">
                  <p className="text-gray-700 font-bold">
                    🌱 Trees Equivalent: {impact.trees_saved}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    This is equivalent to protecting trees from being cut down
                  </p>
                </div>
              )}

              {/* Human Readable Impact */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  What Your Impact Means
                </h3>
                <div className="space-y-3">
                  {impact.human_readable_impact.map((statement, index) => (
                    <p key={index} className="text-gray-700 leading-relaxed">
                      ✓ {statement}
                    </p>
                  ))}
                </div>
              </div>

              {/* Congratulations */}
              <div className="bg-green-600 text-white p-6 rounded-lg text-center">
                <p className="text-lg font-bold">
                  🎉 Great Job! You're making a difference for our planet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpactCalculator;
