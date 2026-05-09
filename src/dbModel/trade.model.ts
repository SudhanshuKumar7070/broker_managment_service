import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, minlength: 1 }, 
    side: { type: String, required: true, enum: ["BUY", "SELL"] },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true }, 
    currency: { type: String, required: true, minlength: 3, maxlength: 3 }, 
    executedAt: { type: Date, required: true },
    broker: { type: String, required: true, minlength: 1 },
    rawData: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Trade = mongoose.model("Trade", tradeSchema);
