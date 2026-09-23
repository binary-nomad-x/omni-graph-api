import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const schemaDir = join(__dirname, "..", "src", "schema");
const outputFile = join(__dirname, "..", "schema.graphql");

try {
  if (!existsSync(schemaDir)) {
    throw new Error(`Schema directory not found: ${schemaDir}`);
  }

  const schemaFiles = readdirSync(schemaDir)
    .filter((file) => file.endsWith(".graphql"))
    .sort();

  if (schemaFiles.length === 0) {
    throw new Error(`No .graphql files found in ${schemaDir}`);
  }

  const orderedFiles = [...(schemaFiles.includes("base.graphql") ? ["base.graphql"] : []), ...schemaFiles.filter((file) => file !== "base.graphql")];

  if (!schemaFiles.includes("base.graphql")) {
    console.warn("⚠️  base.graphql not found. Merging files alphabetically.");
  }

  const mergedSchema = orderedFiles
    .map((file) => {
      const filePath = join(schemaDir, file);
      console.log(`• ${file}`);
      return readFileSync(filePath, "utf8").trim();
    })
    .filter(Boolean)
    .join("\n\n");

  writeFileSync(outputFile, `${mergedSchema}\n`, "utf8");

  console.log(`\n✅ Successfully merged ${orderedFiles.length} schema file(s) into:`);
  console.log(outputFile);
} catch (error) {
  console.error("\n❌ Failed to merge GraphQL schema.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
}
