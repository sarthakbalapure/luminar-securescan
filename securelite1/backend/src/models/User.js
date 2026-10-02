import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    companyName: {
      type: String,
      trim: true,
      default: ""
    },
    role: {
      type: String,
      enum: ["owner", "public"],
      default: "public"
    },
    plan: {
      code: {
        type: String,
        default: "starter"
      },
      name: {
        type: String,
        default: "Starter"
      },
      priceInr: {
        type: Number,
        default: 50
      },
      billingCycle: {
        type: String,
        default: "monthly"
      },
      status: {
        type: String,
        enum: ["active", "trialing", "past_due", "cancelled"],
        default: "active"
      },
      scanLimitMonthly: {
        type: Number,
        default: 10
      },
      scansUsedThisMonth: {
        type: Number,
        default: 0
      },
      renewalDate: {
        type: Date,
        default: () => {
          const date = new Date();
          date.setMonth(date.getMonth() + 1);
          return date;
        }
      }
    },
    alertPreferences: {
      emailAlerts: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function save(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
