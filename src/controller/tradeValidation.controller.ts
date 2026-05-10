import { Request, Response, NextFunction } from "express";
import fs from "fs";
import { detectBroker } from "../service/broker-detector/broker.detector";
import { parseZerodha } from "../service/parsers/zerodha.parser";
import { parseIBKR } from "../service/parsers/IBKR.parser";
import { ApiError } from "../utils/ErrorHandler";
import { customResponse } from "../utils/ResponseHandler";

/**
 * POST /import
 * Accepts a CSV file upload (multipart/form-data),
 * auto-detects the broker, parses & validates trades,
 * and returns structured JSON response.
 */
export const importTrades = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const filePath = req.file?.path;

  try {
    // 1. Validate file was uploaded
    if (!req.file || !filePath) {
      throw new ApiError(
        400,
        "No CSV file uploaded. Use field name 'file' with multipart/form-data.",
      );
    }

    // 2. Auto-detect broker from CSV headers
    const broker = await detectBroker(filePath);

    // 3. Parse using the appropriate broker parser
    let result;
    switch (broker) {
      case "zerodha":
        result = await parseZerodha(filePath);
        break;
      case "ibkr":
        result = await parseIBKR(filePath);
        break;
      default:
        throw new ApiError(400, `No parser available for broker: ${broker}`);
    }

    // 4. Return structured response
    res
      .status(200)
      .json(new customResponse(200, result, "CSV processed successfully"));
  } catch (err) {
    next(err);
  } finally {
    // 5. Cleanup: remove temp file after processing
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr)
          console.error(`Failed to delete temp file: ${unlinkErr.message}`);
      });
    }
  }
};
