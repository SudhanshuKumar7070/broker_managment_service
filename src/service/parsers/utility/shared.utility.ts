import { TradeSchemaType } from "../../../schema/trade.schema";
// Normalises BUY/SELL
 export const normalizeSide =(tradeType: string): "BUY" | "SELL" | null =>{
  const upper = tradeType.trim().toUpperCase();
  if (upper === "BUY" || upper === "BOT") return "BUY";
  if (upper === "SELL" || upper === "SLD") return "SELL";
  return null;
}

 export interface ParseResult {
  broker: string;
  summary: { total: number; valid: number; skipped: number };
  trades: TradeSchemaType[];
  errors: { row: number; reason: string }[];
}