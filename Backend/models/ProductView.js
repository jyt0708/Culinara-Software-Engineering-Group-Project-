import mongoose from "mongoose"

const productViewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// each signed-in user has exactly one record for one product
productViewSchema.index(
  { productId: 1, userId: 1 },
  { unique: true }
)

export default mongoose.model("ProductView", productViewSchema)