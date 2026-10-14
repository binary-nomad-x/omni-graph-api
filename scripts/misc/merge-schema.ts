import "dotenv/config";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { logger } from "../../src/utils/logger.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const schemaDir = join(__dirname, "..", "..", "src", "schema");
const outputFile = join(__dirname, "..", "..", "schema.graphql");

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
    logger.warning("⚠️  base.graphql not found. Merging files alphabetically.");
  }

  const mergedSchema = orderedFiles
    .map((file) => {
      const filePath = join(schemaDir, file);
      logger.info(`• ${file}`);
      return readFileSync(filePath, "utf8").trim();
    })
    .filter(Boolean)
    .join("\n\n");

  writeFileSync(outputFile, `${mergedSchema}\n`, "utf8");

  logger.info(`\n✅ Successfully merged ${orderedFiles.length} schema file(s) into:`);
  logger.info(outputFile);
} catch (error) {
  logger.error("\n❌ Failed to merge GraphQL schema.");

  if (error instanceof Error) {
    logger.error(error.message);
  } else {
    logger.error(String(error));
  }

  process.exit(1);
}
