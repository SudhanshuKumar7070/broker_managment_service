import fs from "fs";
import csvParser from "csv-parser";
import { ApiError } from "../../utils/ErrorHandler";

// Known broker header signatures
const BROKER_HEADERS: Record<string, string[]> = {
  zerodha: [
    "symbol",
    "isin",
    "trade_date",
    "trade_type",
    "quantity",
    "price",
    "trade_id",
    "order_id",
    "exchange",
    "segment",
  ],
  ibkr: [
    "tradeid",
    "accountid",
    "symbol",
    "datetime",
    "buy/sell",
    "quantity",
    "tradeprice",
    "currency",
    "commission",
    "netamount",
    "assetclass",
  ],
};

/**
 * Reads only the first line (header row) of a CSV file.
 */
function readHeaders(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    let resolved = false;

    stream
      .pipe(csvParser())
      .on("headers", (headers: string[]) => {
        resolved = true;
        stream.destroy(); // stop reading — we only need headers
        const normalized = headers.map((h) => h.trim().toLowerCase());
        resolve(normalized);
      })
      .on("error", (err) => {
        if (!resolved) reject(err);
      })
      .on("end", () => {
        if (!resolved) {
          reject(new ApiError(400, "CSV file is empty or has no headers"));
        }
      });
  });
}

/**
 * Calculates how many of the expected headers are present in the actual headers.
 * Returns a score between 0 and 1.
 */
const matchScore = (actual: string[], expected: string[]): number => {
  const matchCount = expected.filter((h) => actual.includes(h)).length;
  return matchCount / expected.length;
}

export type BrokerName = "zerodha" | "ibkr";


export async function detectBroker(filePath: string): Promise<BrokerName> {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new ApiError(400, `File not found: ${filePath}`);
  }

  // Check file is not empty
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new ApiError(400, "CSV file is empty");
  }

  let headers: string[];
  try {
    headers = await readHeaders(filePath);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      400,
      "Failed to read CSV headers. Ensure the file is a valid CSV.",
    );
  }

  if (headers.length === 0) {
    throw new ApiError(400, "CSV file has no headers");
  }

  // Score each broker
  const THRESHOLD = 0.6;
  let bestBroker: BrokerName | null = null;
  let bestScore = 0;

  for (const [broker, expectedHeaders] of Object.entries(BROKER_HEADERS)) {
    const score = matchScore(headers, expectedHeaders);
    if (score > bestScore) {
      bestScore = score;
      bestBroker = broker as BrokerName;
    }
  }

  if (!bestBroker || bestScore < THRESHOLD) {
    throw new ApiError(
      400,
      `Unrecognized CSV format. Headers found: [${headers.join(", ")}]. ` +
        `No known broker matched above the ${THRESHOLD * 100}% threshold.`,
    );
  }

  return bestBroker;
}
