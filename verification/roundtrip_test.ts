import { migrateProjectData } from '../src/utils/schemaValidation';
import { EXAMPLE_PROJECTS } from '../src/data/exampleProjects';

function testRoundTrip() {
  const originalData = {
    version: "3.1.0",
    name: "Test Project",
    rungs: EXAMPLE_PROJECTS[0].rungs,
    setupRungs: EXAMPLE_PROJECTS[0].setupRungs || [],
    subroutines: [],
    variables: [],
    constants: [],
    arrays: []
  };

  // Simulate JSON Serialization (Export)
  const jsonString = JSON.stringify(originalData);

  // Simulate JSON Parsing (Import)
  const parsedData = JSON.parse(jsonString);

  // Run through our validation and migration layer
  try {
    const migratedData = migrateProjectData(parsedData);

    // Check if the critical data remains intact
    if (migratedData.rungs?.length === originalData.rungs.length) {
      console.log('✅ Round-trip test passed: Rung count matches.');
    } else {
      console.error('❌ Round-trip test failed: Rung count mismatch.');
    }
  } catch (err) {
    console.error('❌ Round-trip test failed during validation:', err);
  }
}

testRoundTrip();
