import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

async function testMongoConnection() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Please check your backend/.env file');
    process.exit(1);
  }

  console.log('🔍 Testing MongoDB connection...');
  console.log('📍 URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
  
  try {
    // Attempt connection
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📋 Collections found: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('   Available collections:');
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Test write operation
    const testCollection = mongoose.connection.db.collection('connection_test');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      app: 'brand-mention-tracker'
    });
    console.log('✅ Write operation successful');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('🧹 Cleaned up test data');
    
    await mongoose.disconnect();
    console.log('🎉 MongoDB connection test completed successfully!');
    console.log('');
    console.log('🚀 Your database is ready! You can now start the application:');
    console.log('   npm run dev');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    console.log('');
    console.log('💡 Troubleshooting tips:');
    
    if (error.message.includes('Authentication failed')) {
      console.log('   - Check your username and password in MONGODB_URI');
      console.log('   - Make sure the database user has proper permissions');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
      console.log('   - Check your internet connection');
      console.log('   - Verify the cluster URL is correct');
      console.log('   - Make sure IP address is whitelisted (0.0.0.0/0 for development)');
    }
    
    if (error.message.includes('bad auth')) {
      console.log('   - Double-check your MongoDB Atlas username and password');
      console.log('   - Make sure you\'re using the database user, not your Atlas account');
    }
    
    console.log('');
    console.log('📚 See API_KEYS_GUIDE.md for detailed setup instructions');
    process.exit(1);
  }
}

// Run the test
testMongoConnection();