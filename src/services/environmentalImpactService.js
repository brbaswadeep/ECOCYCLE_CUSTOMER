/**
 * Environmental Impact Estimation Service
 * Calculates conservative environmental benefits when waste is recycled or upcycled
 */

const REFERENCE_FACTORS = {
  CO2_SAVED_PER_KG: {
    plastic: 1.5,
    paper: 1.0,
    cardboard: 0.9,
    metal: 4.0,
    glass: 0.3,
    wood: 0.6,
    fabric: 2.0,
    textile: 2.0,
    rubber: 2.7,
    organic: 0.5,
    'e-waste': 3.5,
    mixed: 1.2,
    unknown: 1.0,
  },

  ENERGY_SAVED_PER_KG: {
    plastic: 5,
    paper: 4,
    cardboard: 3.5,
    metal: 14,
    glass: 2,
    wood: 1.5,
    fabric: 6,
    textile: 6,
    rubber: 8,
    organic: 1,
    'e-waste': 12,
    mixed: 5,
    unknown: 3,
  },

  WATER_SAVED_PER_KG: {
    plastic: 90,
    paper: 60,
    cardboard: 50,
    metal: 40,
    glass: 20,
    wood: 30,
    fabric: 200,
    textile: 200,
    rubber: 50,
    organic: 20,
    'e-waste': 70,
    mixed: 50,
    unknown: 40,
  },
};

/**
 * Calculate environmental impact of waste recycling/upcycling
 * @param {string} waste_type - Type of waste (plastic, paper, cardboard, metal, glass, wood, fabric, textile, rubber, organic, e-waste, mixed, unknown)
 * @param {number} waste_weight_kg - Weight of waste in kilograms
 * @returns {object} Environmental impact metrics in JSON format
 */
export const calculateEnvironmentalImpact = (waste_type, waste_weight_kg) => {
  // Validate inputs
  if (!waste_type || waste_weight_kg <= 0) {
    return {
      error: 'Invalid input: waste_type is required and waste_weight_kg must be greater than 0',
    };
  }

  // Normalize waste_type to lowercase
  const normalizedWasteType = waste_type.toLowerCase().trim();

  // Check if waste_type is valid
  const validWasteTypes = Object.keys(REFERENCE_FACTORS.CO2_SAVED_PER_KG);
  if (!validWasteTypes.includes(normalizedWasteType)) {
    return {
      error: `Invalid waste_type: ${waste_type}. Must be one of: ${validWasteTypes.join(', ')}`,
    };
  }

  // 1. Waste diverted from landfill
  const waste_diverted_kg = waste_weight_kg;

  // 2. CO₂ saved
  const co2_saved_kg = Number(
    (waste_weight_kg * REFERENCE_FACTORS.CO2_SAVED_PER_KG[normalizedWasteType]).toFixed(2)
  );

  // 3. Energy saved
  const energy_saved_kwh = Number(
    (waste_weight_kg * REFERENCE_FACTORS.ENERGY_SAVED_PER_KG[normalizedWasteType]).toFixed(2)
  );

  // 4. Water saved
  const water_saved_liters = Number(
    (waste_weight_kg * REFERENCE_FACTORS.WATER_SAVED_PER_KG[normalizedWasteType]).toFixed(2)
  );

  // 5. Trees saved
  let trees_saved = null;
  if (normalizedWasteType === 'paper' || normalizedWasteType === 'cardboard') {
    trees_saved = Number((waste_weight_kg / 17).toFixed(2));
  } else if (normalizedWasteType === 'wood') {
    trees_saved = Number((waste_weight_kg / 100).toFixed(2));
  }

  // 6. Earth impact score (0–100)
  const earth_score_raw =
    0.4 * co2_saved_kg + 0.3 * energy_saved_kwh + 0.3 * waste_diverted_kg;

  // Find max possible score (use metal as reference for highest impact)
  const maxPossibleScore =
    0.4 * (waste_weight_kg * REFERENCE_FACTORS.CO2_SAVED_PER_KG['metal']) +
    0.3 * (waste_weight_kg * REFERENCE_FACTORS.ENERGY_SAVED_PER_KG['metal']) +
    0.3 * waste_weight_kg;

  const earth_impact_score = Number(
    Math.min((earth_score_raw / maxPossibleScore) * 100, 100).toFixed(2)
  );

  // 7. Generate human-readable impact statements
  const human_readable_impact = generateImpactStatements(
    normalizedWasteType,
    waste_weight_kg,
    co2_saved_kg,
    energy_saved_kwh,
    water_saved_liters,
    trees_saved
  );

  return {
    waste_type: normalizedWasteType,
    waste_diverted_kg: Number(waste_diverted_kg.toFixed(2)),
    co2_saved_kg,
    energy_saved_kwh,
    water_saved_liters,
    trees_saved,
    earth_impact_score,
    human_readable_impact,
  };
};

/**
 * Generate simple, friendly impact statements
 */
const generateImpactStatements = (
  waste_type,
  weight,
  co2,
  energy,
  water,
  trees
) => {
  const statements = [];

  // CO2 statement with Indian context
  const carKmEquivalent = Number((co2 / 0.21).toFixed(1)); // Average car emits 0.21 kg CO2 per km
  statements.push(
    `By recycling ${weight}kg of ${waste_type}, you prevented ${co2}kg of CO₂ emissions — equivalent to a car not driving ${carKmEquivalent}km.`
  );

  // Energy statement with Indian context
  const householdDaysEquivalent = Number((energy / 5).toFixed(1)); // Average Indian household uses ~5 kWh/day
  statements.push(
    `You saved ${energy}kWh of energy, which can power an average Indian household for about ${householdDaysEquivalent} days.`
  );

  // Water statement with Indian context
  const waterBottlesEquivalent = Number((water / 0.5).toFixed(0)); // Standard water bottle is 500ml
  statements.push(
    `You conserved ${water} liters of water — roughly ${waterBottlesEquivalent} standard water bottles.`
  );

  // Trees statement (if applicable)
  if (trees !== null) {
    statements.push(
      `Your recycling is equivalent to planting and protecting approximately ${trees} trees from being cut down.`
    );
  } else if (waste_type === 'unknown') {
    statements.push(
      `Since the exact waste type is unknown, these estimates are approximate and conservative.`
    );
  }

  return statements;
};

/**
 * Batch calculate environmental impact for multiple waste items
 */

export const calculateBatchEnvironmentalImpact = (wasteItems) => {
  if (!Array.isArray(wasteItems)) {
    return { error: 'Input must be an array of waste items' };
  }

  const results = wasteItems.map((item) =>
    calculateEnvironmentalImpact(item.waste_type, item.waste_weight_kg)
  );

  // Calculate totals
  const totals = {
    total_waste_diverted_kg: 0,
    total_co2_saved_kg: 0,
    total_energy_saved_kwh: 0,
    total_water_saved_liters: 0,
    total_trees_saved: 0,
    average_earth_impact_score: 0,
  };

  const validResults = results.filter((r) => !r.error);

  if (validResults.length > 0) {
    validResults.forEach((result) => {
      totals.total_waste_diverted_kg += result.waste_diverted_kg;
      totals.total_co2_saved_kg += result.co2_saved_kg;
      totals.total_energy_saved_kwh += result.energy_saved_kwh;
      totals.total_water_saved_liters += result.water_saved_liters;
      if (result.trees_saved !== null) {
        totals.total_trees_saved += result.trees_saved;
      }
      totals.average_earth_impact_score += result.earth_impact_score;
    });

    totals.average_earth_impact_score = Number(
      (totals.average_earth_impact_score / validResults.length).toFixed(2)
    );

    // Round totals
    Object.keys(totals).forEach((key) => {
      if (typeof totals[key] === 'number') {
        totals[key] = Number(totals[key].toFixed(2));
      }
    });
  }

  return {
    individual_results: results,
    batch_totals: totals,
    total_items_processed: wasteItems.length,
    successful_calculations: validResults.length,
  };
};