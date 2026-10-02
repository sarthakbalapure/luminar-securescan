import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";

const seedOwnerUser = async () => {
  try {
    await connectDb();

    const email = "owner@securelite.com";
    const password = "OwnerPass123";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: "SecureLite Owner",
        email,
        password,
        companyName: "SecureLite",
        role: "owner",
        plan: {
          code: "internal",
          name: "Internal Owner",
          priceInr: 0,
          billingCycle: "monthly",
          status: "active",
          scanLimitMonthly: 9999,
          scansUsedThisMonth: 0
        },
        alertPreferences: {
          emailAlerts: true
        }
      });
      console.log("Owner user created successfully.");
    } else {
      user.role = "owner";
      user.plan = {
        code: "internal",
        name: "Internal Owner",
        priceInr: 0,
        billingCycle: "monthly",
        status: "active",
        scanLimitMonthly: 9999,
        scansUsedThisMonth: 0
      };
      await user.save();
      console.log("Existing user upgraded to owner.");
    }

    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${user._id}`);
  } catch (error) {
    console.error("Failed to seed owner user:", error.message);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

seedOwnerUser();
