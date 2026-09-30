import { execSync } from 'child_process';

console.log('🚀 Running Full Verification Test Suite...\n');

const testFiles = [
  'verification/ladder_virtualization_p0.test.ts',
  'verification/hardware_map_and_latch.test.ts',
  'verification/macro_insertion.test.ts',
  'verification/used_symbols.test.ts',
  'verification/subroutine_ladder_edit.test.ts'
];

let failed = false;

for (const file of testFiles) {
  console.log(`--------------------------------------------------`);
  console.log(`Executing: ${file}`);
  console.log(`--------------------------------------------------`);
  try {
    const output = execSync(`npx tsx ${file}`, { encoding: 'utf-8' });
    console.log(output);
  } catch (err: any) {
    console.error(`❌ TEST FAILED: ${file}\n`);
    console.error(err.stdout || err.message);
    failed = true;
    break;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('==================================================');
  console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================');
}
