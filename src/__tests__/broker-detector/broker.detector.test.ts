import path from "path";
import { detectBroker } from "../../service/broker-detector/broker.detector";

const FIXTURES = path.resolve(__dirname, "../fixtures");

describe("Broker Auto-Detection", () => {
  it("should detect Zerodha format from CSV headers", async () => {
    const broker = await detectBroker(path.join(FIXTURES, "zerodha_sample.csv"));
    expect(broker).toBe("zerodha");
  });

  it("should detect IBKR format from CSV headers", async () => {
    const broker = await detectBroker(path.join(FIXTURES, "ibkr_sample.csv"));
    expect(broker).toBe("ibkr");
  });

  it("should throw error for unrecognized CSV format", async () => {
    await expect(
      detectBroker(path.join(FIXTURES, "unknown_format.csv"))
    ).rejects.toThrow("Unrecognized CSV format");
  });

  it("should throw error for empty CSV file", async () => {
    await expect(
      detectBroker(path.join(FIXTURES, "empty.csv"))
    ).rejects.toThrow(/CSV file is empty|CSV file has no headers/);
  });

  it("should throw error for non-existent file", async () => {
    await expect(
      detectBroker(path.join(FIXTURES, "does_not_exist.csv"))
    ).rejects.toThrow("File not found");
  });

  it("should detect correctly with single valid row CSV", async () => {
    const broker = await detectBroker(path.join(FIXTURES, "zerodha_single_valid.csv"));
    expect(broker).toBe("zerodha");
  });
});
