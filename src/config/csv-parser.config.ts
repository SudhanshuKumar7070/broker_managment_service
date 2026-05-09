import fs from "fs";
import csvParser from "csv-parser";

export function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser({
        mapHeaders:({header})=> header.trim().toLowerCase(),
        skipLines:0,
        strict:true
      }))
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        console.log("file parsed successfully",)
        resolve(results);
      })
      .on("error", (err) => {
        console.error(`error on file parser ${err}`)
        reject(err);
      });
  });
}
