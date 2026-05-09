import mongoose from "mongoose";

const brokerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 1 },
    brokerId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    region: { type: String },
    commissionRate: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true },
);

export const Broker = mongoose.model("Broker", brokerSchema);
