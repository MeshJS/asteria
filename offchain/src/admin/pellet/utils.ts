import { existsSync } from "node:fs";
import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDist = __dirname.includes("/dist/");
const sourceDir = isDist ? join(__dirname, "../../admin/pellet") : __dirname;

const csvSourcePath = join(sourceDir, "pellets.csv");

export const writePelletsCsvFIle = async (
  pellets: {
    posX: number;
    posY: number;
    fuel: string;
  }[]
) => {
  const csvHeaders = "posX,posY,fuel\n";
  const csvData = pellets
    .map((pellet) => `${pellet.posX},${pellet.posY},${pellet.fuel}`)
    .join("\n");

  console.log("Writing pellets CSV to:", csvSourcePath);

  await writeFile(csvSourcePath, csvHeaders + csvData, "utf8");
};

export const readPelletsCsvFile = async () => {
  console.log("Reading pellets CSV from:", csvSourcePath);

  const csvPath = existsSync(csvSourcePath) ? csvSourcePath : csvSourcePath;

  if (existsSync(csvPath)) {
    const csvContent = await readFile(csvPath, "utf8");
    const readPellet = csvContent
      .split("\n")
      .slice(1)
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const [posX, posY, fuel] = line.split(",");
        return {
          posX: parseInt(posX!, 10),
          posY: parseInt(posY!, 10),
          fuel: fuel!.trim(),
        };
      });
    return readPellet;
  } else {
    console.log(csvSourcePath);
    throw new Error(
      "Unable to read pellets from both source and dist locations"
    );
  }
};
export { __dirname };

//87266c337bcc8b17ce5e76a82c53668e16bfaedfe623c45751b3830d69a51f1a
