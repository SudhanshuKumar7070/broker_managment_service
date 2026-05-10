# Broker Trade CSV Import Service

A robust, stateless Node.js/TypeScript service that normalizes broker-specific CSV trade exports (Zerodha, Interactive Brokers) into a standardized JSON format. This service features automatic broker detection, stream-based CSV parsing, and strict runtime validation using Zod.

## Features

- **Automatic Broker Detection**: Intelligently detects whether a CSV belongs to Zerodha or IBKR based on column header signatures.
- **Robust Normalization**: 
  - Standardizes side indicators (e.g., `BOT`/`SLD` to `BUY`/`SELL`).
  - Normalizes diverse date formats (DD-MM-YYYY, MM/DD/YYYY) to ISO 8601 datetimes.
  - Normalizes asset symbols (e.g., `EUR.USD` to `EUR/USD`).
- **Strict Validation**: All parsed rows are validated against a central Zod schema, ensuring downstream data integrity.
- **Error Handling & Reporting**: Granular error reporting for skipped rows (e.g., invalid dates, negative quantities) while allowing valid rows to process successfully.
- **Stateless & Efficient**: Uses streaming for CSV parsing and cleans up temporary files immediately after processing.

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Validation**: Zod
- **File Uploads**: Multer
- **CSV Parsing**: `csv-parser`
- **Testing**: Jest

## Setup & Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory (optional):
   ```env
   PORT=3000
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Testing

The project includes a comprehensive test suite (28 tests) covering parser logic, broker detection, and edge cases.

```bash
npm test
```

## API Documentation

### 1. Health Check
Endpoint to verify service status.

**GET** `/api/v1/ping`

**Response:**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "pong",
  "success": true
}
```

### 2. Import Trades
Upload a broker CSV file for parsing and normalization.

**POST** `/api/v1/trade/import`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (The CSV file to process)

**Example Response:**
```json
{
  "statusCode": 200,
  "data": {
    "broker": "zerodha",
    "summary": {
      "total": 7,
      "valid": 5,
      "skipped": 2
    },
    "trades": [
      {
        "symbol": "RELIANCE",
        "side": "BUY",
        "quantity": 10,
        "price": 2450.5,
        "totalAmount": 24505,
        "currency": "INR",
        "executedAt": "2026-04-01T00:00:00Z",
        "broker": "zerodha",
        "rawData": {
          "symbol": "RELIANCE",
          "isin": "INE002A01018"
          // ...
        }
      }
    ],
    "errors": [
      {
        "row": 7,
        "reason": "Invalid date: 'invalid_date'"
      }
    ]
  },
  "message": "CSV processed successfully",
  "success": true
}
```

## Design Decisions

- **Stateless Architecture**: The service acts as a pure pipeline (parse, normalize, validate, respond) without database dependencies. This ensures it's horizontally scalable and acts perfectly as a specialized microservice.
- **Strict Separation of Concerns**: Logic is decoupled into clear domains: `controller` (HTTP logic), `broker-detector` (identification), `parsers` (broker-specific parsing), and `schema` (Zod validation).
- **Zod for Runtime Validation**: Provides both TypeScript type inference (`TradeSchemaType`) and robust runtime validation, acting as a strict contract between the service and clients.
- **Fail-Safe Parsing**: Instead of failing an entire file due to one bad row, the parser skips invalid rows, logs them in an `errors` array with the exact row number and reason, and processes the valid rows. This provides a vastly superior UX.
- **Score-Based Broker Detection**: Rather than relying on rigid exact-matching, headers are evaluated using a score-based threshold (60%), making detection resilient to minor broker export changes.
- **Streaming Large CSVs**: `csv-parser` is used to stream the file rather than loading it entirely into memory, ensuring memory stability for large trade histories.

## Data Flow & Architecture

1. **Upload & Storage**: The client uploads a CSV via multipart/form-data. `multer` middleware temporarily stores the file on disk (`Public/temp`).
2. **Auto-Detection**: The `detectBroker` service reads the first line (headers) of the CSV, matches it against known broker signatures, and calculates a match score. If the score exceeds a 60% threshold, the broker format is identified.
3. **Parsing & Normalization**: The file is streamed via `csv-parser`. Depending on the detected broker, `parseZerodha` or `parseIBKR` processes each row, normalizing dates, symbols, and trade sides.
4. **Validation**: Each normalized row is parsed through the central `TradeSchema` (Zod). Invalid rows are pushed to an errors array with their row number and reason. Valid rows form the standardized output.
5. **Response & Cleanup**: The controller returns the structured JSON (with summary, valid trades, and errors) and cleans up the temporary file from the disk.

## Edge Cases Handled

- **Empty Files / Missing Headers**: Fails fast with descriptive 400 Bad Request errors.
- **Negative/Zero Quantities**: Skips the row and adds to the `errors` array.
- **Invalid Dates**: Catches malformed or impossible dates, reports the row, and continues.
- **Missing Non-Critical Fields**: IBKR rows with missing commissions are still processed successfully, and original values are preserved in the `rawData` object for auditing.
