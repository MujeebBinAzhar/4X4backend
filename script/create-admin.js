require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const { connectDB } = require("../config/db");

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Wait a bit for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@gmail.com" });
    
    if (existingAdmin) {
      console.log("Admin user already exists!");
      console.log("Updating password...");
      
      // Update password
      existingAdmin.password = bcrypt.hashSync("12345678");
      await existingAdmin.save();
      
      console.log("✅ Admin password updated successfully!");
      console.log("Email: admin@gmail.com");
      console.log("Password: 12345678");
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
        phone: "",
      });

      await newAdmin.save();
      
      console.log("✅ Admin user created successfully!");
      console.log("Email: admin@gmail.com");
      console.log("Password: 12345678");
      console.log("Role: Admin");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  }
};

createAdmin();

