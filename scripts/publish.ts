import { parseArgs } from "node:util";

const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        "dry-run": {
            type: "boolean",
            default: false,
        },
        continue: {
            type: "boolean",
            default: false,
        },
        channel: {
            type: "string",
        },
    },
});

// Check required files
const packageFile = Bun.file("package.json");
const packageExists = await packageFile.exists();

if (!packageExists) {
    console.error("❌ Required package.json not found");
    process.exit(1);
}

const pkg = await packageFile.json();
let { name, version } = pkg;

// Override package name for fork publishing
const nameMap: Record<string, string> = {
    "@surrealdb/node": "@mdrv/surrealdb-node",
    "@surrealdb/wasm": "@mdrv/surrealdb-wasm",
};
const publishName = nameMap[name] ?? name;
const isRemapped = publishName !== name;
if (isRemapped) {
    pkg.name = publishName;
    await Bun.write("package.json", JSON.stringify(pkg, null, 2));
    console.log(`✏️ Renamed ${name} → ${publishName}`);
    name = publishName;
}

// Compute channel
let channel = "latest";

if (version.includes("-alpha")) {
    channel = "alpha";
}

if (version.includes("-beta")) {
    channel = "beta";
}

if (values.channel) {
    channel = values.channel;
}

// Auth

console.log("🔐 Checking npm auth");

await Bun.spawn(["npm", "whoami"], {
    stdout: "inherit",
    stderr: "inherit",
}).exited;

// Packing
const safeName = name.replace("@", "").replaceAll("/", "-");
const packCmd = ["bun", "pm", "pack"];

console.log(`📦 Packing ${name}@${version}...`);

const packCode = await Bun.spawn(packCmd, {
    stdout: "inherit",
    stderr: "inherit",
}).exited;

if (values.continue && packCode !== 0) {
    console.log("❌ Pack failed, but continuing...");
    process.exit(0);
}

// Publishing
const publishCmd = [
    "bun",
    "publish",
    `${safeName}-${version}.tgz`,
    "--loglevel",
    "silly",
    "--access",
    "public",
    "--tag",
    channel,
];

if (values["dry-run"]) {
    console.log("🔍 Preparing dry run release...");
    publishCmd.push("--dry-run");
}

console.log(`🚀 Publishing ${name}@${version} to ${channel} in NPM...`);

const publishCode = await Bun.spawn(publishCmd, {
    stdout: "inherit",
    stderr: "inherit",
}).exited;

if (values.continue && publishCode !== 0) {
    console.log("❌ Publish failed, but continuing...");
    process.exit(0);
}

process.exit(publishCode);
