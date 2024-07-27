// models/monthlyFees.js
const mongoose = require("mongoose");

const monthlyFeesSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  feeAmount: {
    type: Number,
    required: true,
  },
  pendingCount: {
    type: Number,
    default: 0,
  },
  paidDate: {
    type: Date,
    default: null,
  },
});


module.exports = mongoose.model("MonthlyFees", monthlyFeesSchema);;
