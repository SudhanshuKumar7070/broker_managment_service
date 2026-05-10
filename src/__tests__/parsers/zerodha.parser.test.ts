import path from "path";
import { parseZerodha } from "../../service/parsers/zerodha.parser";

const FIXTURES = path.resolve(__dirname, "../fixtures");

describe("Zerodha Parser", () => {
  it("should parse sample CSV with correct valid/skipped counts", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    expect(result.broker).toBe("zerodha");
    expect(result.summary.total).toBe(7);
    expect(result.summary.valid).toBe(5);
    expect(result.summary.skipped).toBe(2);
    expect(result.trades).toHaveLength(5);
    expect(result.errors).toHaveLength(2);
  });

  it("should skip row with invalid date", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    const invalidDateError = result.errors.find((e) => e.row === 7); // row 7 in CSV = "invalid_date"
    expect(invalidDateError).toBeDefined();
    expect(invalidDateError!.reason).toContain("Invalid date");
  });

  it("should skip row with negative quantity", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    const negQuantityError = result.errors.find((e) => e.row === 8); // row 8 in CSV = qty -5
    expect(negQuantityError).toBeDefined();
    expect(negQuantityError!.reason).toContain("Quantity must be positive");
  });

  it("should normalize lowercase buy/sell to uppercase", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    // First row is "buy" (lowercase) → should become "BUY"
    expect(result.trades[0].side).toBe("BUY");
    // Second row is "sell" (lowercase) → should become "SELL"
    expect(result.trades[1].side).toBe("SELL");
  });

  it("should handle uppercase SELL correctly", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    // Row 5 has "SELL" in uppercase
    const sbinTrade = result.trades.find((t) => t.symbol === "SBIN");
    expect(sbinTrade).toBeDefined();
    expect(sbinTrade!.side).toBe("SELL");
  });

  it("should infer INR currency from NSE/BSE exchange", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    result.trades.forEach((trade) => {
      expect(trade.currency).toBe("INR");
    });
  });

  it("should convert DD-MM-YYYY to ISO 8601 datetime", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    // 01-04-2026 → 2026-04-01T00:00:00Z
    expect(result.trades[0].executedAt).toBe("2026-04-01T00:00:00Z");
  });

  it("should calculate totalAmount correctly (negative for SELL)", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    const buyTrade = result.trades[0]; // RELIANCE buy 10 @ 2450.50
    expect(buyTrade.totalAmount).toBeCloseTo(10 * 2450.50);

    const sellTrade = result.trades[1]; // INFY sell 25 @ 1520.75
    expect(sellTrade.totalAmount).toBeCloseTo(-(25 * 1520.75));
  });

  it("should preserve original row data in rawData", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    expect(result.trades[0].rawData).toHaveProperty("trade_id");
    expect(result.trades[0].rawData).toHaveProperty("order_id");
    expect(result.trades[0].rawData).toHaveProperty("exchange");
  });

  it("should handle empty isin gracefully (row 4)", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_sample.csv"));

    const hdfcTrade = result.trades.find((t) => t.symbol === "HDFCBANK");
    expect(hdfcTrade).toBeDefined(); // should not be skipped
  });

  it("should handle single valid row", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_single_valid.csv"));

    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.skipped).toBe(0);
    expect(result.trades).toHaveLength(1);
  });

  it("should handle all invalid rows", async () => {
    const result = await parseZerodha(path.join(FIXTURES, "zerodha_all_invalid.csv"));

    expect(result.summary.valid).toBe(0);
    expect(result.summary.skipped).toBe(result.summary.total);
    expect(result.trades).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
