#!/usr/bin/env bun

import { satisfies } from "semver";
import { resolvePackages } from "./utils/package.js";

console.log("🔍 Validating package versions...");

const packages = await resolvePackages();

// Find specific packages
const wasmPackage = packages.get("@mdrv/surrealdb-wasm");
const nodePackage = packages.get("@mdrv/surrealdb-node");
const surrealdbPackage = packages.get("surrealdb");

if (!wasmPackage || !nodePackage || !surrealdbPackage) {
    console.log("❌ SDK packages not found");
    process.exit(1);
}

// Check that WASM and Node packages have the same version
if (wasmPackage.version !== nodePackage.version) {
    console.log("❌ @mdrv/surrealdb-wasm and @mdrv/surrealdb-node have different versions:");
    console.log(`   @mdrv/surrealdb-wasm: ${wasmPackage.version}`);
    console.log(`   @mdrv/surrealdb-node: ${nodePackage.version}`);
    process.exit(1);
}

console.log(`✅ @mdrv/surrealdb-wasm and @mdrv/surrealdb-node have the same version: ${wasmPackage.version}`);

const sdkVersion = surrealdbPackage.version;

function checkDependencies(list: Record<string, string>) {
    const range = list.surrealdb;
    surrealdbPackage;

    if (!range) {
        console.log("❌ SDK is not a dependency");
        process.exit(1);
    }

    if (!satisfies(sdkVersion, range)) {
        console.log(`❌ SDK version ${sdkVersion} does not satisfy ${range}`);
        process.exit(1);
    }
}

checkDependencies(nodePackage.peerDependencies);
checkDependencies(nodePackage.devDependencies);
checkDependencies(wasmPackage.peerDependencies);
checkDependencies(wasmPackage.devDependencies);

console.log("✅ Version ranges are valid");
