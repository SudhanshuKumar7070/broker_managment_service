import { TradeSchema, type TradeSchemaType } from "../../schema/trade.schema";
import { parseCSV } from "../../config/csv-parser.config";
import { normalizeSide } from "./utility/shared.utility";
import { ParseResult } from "./utility/shared.utility";

/**
 * Normalizes IBKR symbol format.
 * e.g. "EUR.USD" → "EUR/USD"
 */
const normalizeSymbol = (symbol: string): string => {
  return symbol.trim().replace(/\./g, "/");
};

/**
 * Parses IBKR datetime which can be:
 *  - ISO 8601: "2026-04-01T14:30:00Z"
 *  - MM/DD/YYYY: "04/03/2026"
 * Returns ISO 8601 string or null if invalid.
 */
const parseDateTime = (dateStr: string): string | null => {
  const trimmed = dateStr.trim();

  // Try MM/DD/YYYY format
  const slashParts = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashParts) {
    const [, month, day, year] = slashParts;
    const isoDate = `${year}-${month}-${day}T00:00:00Z`;
    const parsed = new Date(isoDate);
    if (isNaN(parsed.getTime())) return null;
    return isoDate;
  }

  // Try ISO 8601 format
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

// IKBR --csv parser
export  const parseIBKR= async(filePath: string): Promise<ParseResult> => {
  const rows = await parseCSV(filePath);

  const trades: TradeSchemaType[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2: row 1 is header, data starts at row 2

    // --- Map fields ---
    const symbolRaw = (row["symbol"] || "").trim();
    const dateTimeRaw = (row["datetime"] || "").trim();
    const sideRaw = (row["buy/sell"] || "").trim();
    const quantityRaw = parseFloat(row["quantity"]);
    const priceRaw = parseFloat(row["tradeprice"]);
    const currency = (row["currency"] || "").trim().toUpperCase();

    // --- Validate & transform ---

    // Symbol
    const symbol = normalizeSymbol(symbolRaw);
    if (!symbol) {
      errors.push({ row: rowNumber, reason: "Symbol is empty" });
      continue;
    }

    // DateTime
    const executedAt = parseDateTime(dateTimeRaw);
    if (!executedAt) {
      errors.push({
        row: rowNumber,
        reason: `Invalid datetime: '${dateTimeRaw}'`,
      });
      continue;
    }

    // Side
    const side = normalizeSide(sideRaw);
    if (!side) {
      errors.push({
        row: rowNumber,
        reason: `Invalid Buy/Sell value: '${sideRaw}'`,
      });
      continue;
    }

    // Quantity
    if (isNaN(quantityRaw) || quantityRaw <= 0) {
      errors.push({
        row: rowNumber,
        reason: `Quantity must be positive, got ${quantityRaw}`,
      });
      continue;
    }

    // Price
    if (isNaN(priceRaw) || priceRaw <= 0) {
      errors.push({
        row: rowNumber,
        reason: `Price must be positive, got ${priceRaw}`,
      });
      continue;
    }

    // Build trade object
    const totalAmount =
      side === "SELL" ? -(quantityRaw * priceRaw) : quantityRaw * priceRaw;

    const tradeObj = {
      symbol,
      side,
      quantity: quantityRaw,
      price: priceRaw,
      totalAmount,
      currency,
      executedAt,
      broker: "ibkr",
      rawData: { ...row }, // preserves all original fields (Commission, NetAmount, AccountID, etc.)
    };

    // Validate with Zod
    const result = TradeSchema.safeParse(tradeObj);
    if (result.success) {
      trades.push(result.data);
    } else {
      const reasons = result.error.issues
        .map((issue) => issue.message)
        .join("; ");
      errors.push({ row: rowNumber, reason: reasons });
    }
  }

  return {
    broker: "ibkr",
    summary: {
      total: rows.length,
      valid: trades.length,
      skipped: errors.length,
    },
    trades,
    errors,
  };
}
