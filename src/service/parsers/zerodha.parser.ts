import { TradeSchema, type TradeSchemaType } from "../../schema/trade.schema";
import { parseCSV } from "../../config/csv-parser.config";
import { normalizeSide } from "./utility/shared.utility";
import { ParseResult } from "./utility/shared.utility";

// Converts DD-MM-YYYY to ISO 8601 datetime string for zerodha
// Returns null if the date is invalid.

const parseDateDDMMYYYY = (dateStr: string): string | null => {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  const isoDate = `${year}-${month}-${day}T00:00:00Z`;

  // Verify the date is actually valid
  const parsed = new Date(isoDate);
  if (isNaN(parsed.getTime())) return null;

  return isoDate;
};

// Normalizes trade_type ("buy", "sell", "BUY", "SELL") → "BUY" | "SELL"

//  converts  currency from exchange column (NSE/BSE → INR).

const inferCurrency = (exchange: string): string => {
  const upper = exchange.trim().toUpperCase();
  if (upper === "NSE" || upper === "BSE") return "INR";
  return "INR";
};
// zerodha - csv parser
export const parseZerodha = async (filePath: string): Promise<ParseResult> => {
  const rows = await parseCSV(filePath);

  const trades: TradeSchemaType[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because row 1 is header, data starts at row 2

    // --- Map fields ---
    const symbol = (row["symbol"] || "").trim();
    const tradeDate = (row["trade_date"] || "").trim();
    const tradeType = (row["trade_type"] || "").trim();
    const quantityRaw = parseFloat(row["quantity"]);
    const priceRaw = parseFloat(row["price"]);
    const exchange = (row["exchange"] || "").trim();

    // Date
    const executedAt = parseDateDDMMYYYY(tradeDate);
    if (!executedAt) {
      errors.push({ row: rowNumber, reason: `Invalid date: '${tradeDate}'` });
      continue;
    }

    // Side
    const side = normalizeSide(tradeType);
    if (!side) {
      errors.push({
        row: rowNumber,
        reason: `Invalid trade_type: '${tradeType}'`,
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
      currency: inferCurrency(exchange),
      executedAt,
      broker: "zerodha",
      rawData: { ...row }, // preserve original row as key-value pairs
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
    broker: "zerodha",
    summary: {
      total: rows.length,
      valid: trades.length,
      skipped: errors.length,
    },
    trades,
    errors,
  };
};
