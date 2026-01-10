/**
 * Test cases for Environmental Impact Service
 * Run this to verify calculations are working correctly
 */

import { calculateEnvironmentalImpact, calculateBatchEnvironmentalImpact } from './environmentalImpactService.js';

// Test single waste item calculations
console.log('=== SINGLE WASTE ITEM TESTS ===\n');

// Test 1: Plastic waste
console.log('Test 1: 5kg of plastic');
const plastic_result = calculateEnvironmentalImpact('plastic', 5);
console.log(JSON.stringify(plastic_result, null, 2));
console.log('\n');

// Test 2: Paper waste
console.log('Test 2: 10kg of paper');
const paper_result = calculateEnvironmentalImpact('paper', 10);
console.log(JSON.stringify(paper_result, null, 2));
console.log('\n');

// Test 3: Metal waste (high impact)
console.log('Test 3: 2kg of metal');
const metal_result = calculateEnvironmentalImpact('metal', 2);
console.log(JSON.stringify(metal_result, null, 2));
console.log('\n');

// Test 4: Fabric waste
console.log('Test 4: 3kg of fabric');
const fabric_result = calculateEnvironmentalImpact('fabric', 3);
console.log(JSON.stringify(fabric_result, null, 2));
console.log('\n');

// Test 5: Unknown waste
console.log('Test 5: 8kg of unknown waste (conservative estimate)');
const unknown_result = calculateEnvironmentalImpact('unknown', 8);
console.log(JSON.stringify(unknown_result, null, 2));
console.log('\n');

// Test 6: E-waste
console.log('Test 6: 1kg of e-waste');
const ewaste_result = calculateEnvironmentalImpact('e-waste', 1);
console.log(JSON.stringify(ewaste_result, null, 2));
console.log('\n');

// Test batch calculation
console.log('=== BATCH WASTE CALCULATION TEST ===\n');

const wasteItems = [
  { waste_type: 'plastic', waste_weight_kg: 5 },
  { waste_type: 'paper', waste_weight_kg: 10 },
  { waste_type: 'metal', waste_weight_kg: 2 },
  { waste_type: 'fabric', waste_weight_kg: 3 },
];

console.log('Processing multiple waste items...');
const batch_result = calculateBatchEnvironmentalImpact(wasteItems);
console.log(JSON.stringify(batch_result, null, 2));
