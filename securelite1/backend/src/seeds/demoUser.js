import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";

const seedDemoUser = async () => {
  try {
    await connectDb();

    const email = "demo@securelite.com";
    const password = "DemoPass123";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: "Demo User",
        email,
        password,
        companyName: "SecureLite Demo",
        role: "public",
        plan: {
          code: "starter",
          name: "Starter",
          priceInr: 50,
          billingCycle: "monthly",
          status: "active",
          scanLimitMonthly: 10,
          scansUsedThisMonth: 0
        },
        alertPreferences: {
          emailAlerts: true
        }
      });
      console.log("Demo user created successfully.");
    } else {
      user.role = "public";
      user.plan = {
        code: "starter",
        name: "Starter",
        priceInr: 50,
        billingCycle: "monthly",
        status: "active",
        scanLimitMonthly: 10,
        scansUsedThisMonth: 0
      };
      await user.save();
      console.log("Demo user already exists.");
    }

    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${user._id}`);
  } catch (error) {
    console.error("Failed to seed demo user:", error.message);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

seedDemoUser();
