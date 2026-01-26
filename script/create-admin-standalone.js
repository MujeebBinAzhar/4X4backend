/**
 * Standalone script to create admin user
 * Usage: node script/create-admin-standalone.js [database_name] [mongo_uri]
 * 
 * Example:
 * node script/create-admin-standalone.js all4x4 mongodb://localhost:27017/all4x4
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const DB_NAME = process.argv[2] || "all4x4";
const MONGO_URI = process.argv[3] || process.env.MONGO_URI || `mongodb://localhost:27017/${DB_NAME}`;

// Admin schema (inline - doesn't require models)
const adminSchema = new mongoose.Schema({
  name: {
    type: Object,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    required: true,
    default: "Admin",
    enum: ["Admin", "Super Admin", "Cashier", "Manager", "CEO", "Driver", "Security Guard", "Accountant"],
  },
  status: {
    type: String,
    required: false,
    default: "Active",
    enum: ["Active", "Inactive"],
  },
  phone: String,
  image: String,
  address: String,
  country: String,
  city: String,
  joiningData: Date,
}, {
  timestamps: true,
});

const Admin = mongoose.model("Admin", adminSchema);

const createAdmin = async () => {
  try {
    console.log(`Connecting to: ${MONGO_URI.replace(/:[^:@]+@/, ':****@')}`);
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log("✅ Connected to MongoDB");
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@gmail.com" });
    
    if (existingAdmin) {
      console.log("\n⚠️  Admin user already exists!");
      console.log("Updating password...");
      
      existingAdmin.password = bcrypt.hashSync("12345678");
      await existingAdmin.save();
      
      console.log("\n✅ Admin password updated successfully!");
    } else {
      // Create new admin user
      const newAdmin = new Admin({
        name: {
          en: "Admin",
        },
        email: "admin@gmail.com",
        password: bcrypt.hashSync("12345678"),
        role: "Admin",
        status: "Active",
      });

      await newAdmin.save();
      
      console.log("\n✅ Admin user created successfully!");
    }

    console.log("\n📋 Admin Details:");
    console.log("   Email: admin@gmail.com");
    console.log("   Password: 12345678");
    console.log("   Role: Admin");
    console.log("   Status: Active");
    
    await mongoose.connection.close();
    console.log("\n✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes('connection timed out')) {
      console.error("\n💡 Troubleshooting:");
      console.error("   1. Make sure MongoDB is running");
      console.error("   2. Check your MONGO_URI (should use port 27017, not 5432)");
      console.error("   3. For local MongoDB: mongodb://localhost:27017/" + DB_NAME);
      console.error("   4. Try: brew services start mongodb-community (macOS)");
    }
    
    process.exit(1);
  }
};

createAdmin();

