import path from "path";
import { parseIBKR } from "../../service/parsers/IBKR.parser";

const FIXTURES = path.resolve(__dirname, "../fixtures");

describe("IBKR Parser", () => {
  it("should parse sample CSV with correct valid/skipped counts", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    expect(result.broker).toBe("ibkr");
    expect(result.summary.total).toBe(6);
    expect(result.summary.valid).toBe(5);
    expect(result.summary.skipped).toBe(1);
    expect(result.trades).toHaveLength(5);
    expect(result.errors).toHaveLength(1);
  });

  it("should skip row with zero quantity", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const zeroQtyError = result.errors.find((e) => e.row === 6); // row 6 = AMZN qty 0
    expect(zeroQtyError).toBeDefined();
    expect(zeroQtyError!.reason).toContain("Quantity must be positive");
  });

  it("should normalize BOT to BUY and SLD to SELL", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const aaplTrade = result.trades.find((t) => t.symbol === "AAPL");
    expect(aaplTrade!.side).toBe("BUY"); // BOT → BUY

    const msftTrade = result.trades.find((t) => t.symbol === "MSFT");
    expect(msftTrade!.side).toBe("SELL"); // SLD → SELL
  });

  it("should normalize EUR.USD to EUR/USD", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const forexTrade = result.trades.find((t) => t.symbol === "EUR/USD");
    expect(forexTrade).toBeDefined();
  });

  it("should parse ISO 8601 datetime correctly", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const aaplTrade = result.trades.find((t) => t.symbol === "AAPL");
    expect(aaplTrade!.executedAt).toContain("2026-04-01");
  });

  it("should parse MM/DD/YYYY date format (row 4)", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const tslaTrade = result.trades.find((t) => t.symbol === "TSLA");
    expect(tslaTrade).toBeDefined();
    // 04/03/2026 → 2026-04-03T00:00:00Z
    expect(tslaTrade!.executedAt).toBe("2026-04-03T00:00:00Z");
  });

  it("should use currency from CSV column", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    result.trades.forEach((trade) => {
      expect(trade.currency).toBe("USD");
    });
  });

  it("should handle empty commission field (row 6) gracefully", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const googlTrade = result.trades.find((t) => t.symbol === "GOOGL");
    expect(googlTrade).toBeDefined(); // should not be skipped
    // Empty commission should still be in rawData
    expect(googlTrade!.rawData).toHaveProperty("commission");
  });

  it("should preserve extra fields in rawData", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const trade = result.trades[0];
    expect(trade.rawData).toHaveProperty("tradeid");
    expect(trade.rawData).toHaveProperty("accountid");
    expect(trade.rawData).toHaveProperty("commission");
    expect(trade.rawData).toHaveProperty("netamount");
    expect(trade.rawData).toHaveProperty("assetclass");
  });

  it("should calculate totalAmount (negative for SELL)", async () => {
    const result = await parseIBKR(path.join(FIXTURES, "ibkr_sample.csv"));

    const buyTrade = result.trades.find((t) => t.symbol === "AAPL")!;
    expect(buyTrade.totalAmount).toBeCloseTo(100 * 185.50);

    const sellTrade = result.trades.find((t) => t.symbol === "MSFT")!;
    expect(sellTrade.totalAmount).toBeCloseTo(-(50 * 420.25));
  });
});
