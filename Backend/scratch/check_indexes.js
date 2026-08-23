const mongoose = require("mongoose");

const checkIndexes = async () => {
  try {
    await mongoose.connect("mongodb+srv://vijayvargiyaakshay062_db_user:6XgmTRL7Ty2cnIOc@placement-tracker-db.iknry91.mongodb.net/placement_tracker?appName=placement-tracker-db");
    console.log("Connected to MongoDB.");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    const indexes = await mongoose.connection.db.collection("users").indexes();
    console.log("Indexes on users collection:", JSON.stringify(indexes, null, 2));
    
    await mongoose.disconnect();
    console.log("Disconnected.");
  } catch (err) {
    console.error("Error:", err);
  }
};

checkIndexes();
