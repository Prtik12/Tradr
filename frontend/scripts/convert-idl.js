#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the JSON IDL
const idlPath = path.join(__dirname, '../../anchor/target/idl/amm_anchor.json');
const outputPath = path.join(__dirname, '../lib/anchor/idl.ts');

const idlJson = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Generate TypeScript content
const tsContent = `/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at \`target/idl/amm_anchor.json\`.
 */
export type AmmAnchor = ${JSON.stringify(idlJson, null, 2)};

export const IDL: AmmAnchor = ${JSON.stringify(idlJson, null, 2)};
`;

// Write the TypeScript file
fs.writeFileSync(outputPath, tsContent, 'utf8');

console.log('✅ IDL converted successfully!');
console.log(`📝 Output: ${outputPath}`);
console.log(`📦 Address: ${idlJson.address}`);
console.log(`🔢 Instructions: ${idlJson.instructions.length}`);
console.log(`📋 Types: ${idlJson.types.length}`);
