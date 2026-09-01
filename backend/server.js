require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static uploads
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api', routes);

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/project_management_portal';
mongoose.connect(mongoURI)
  .then(async () => {
    console.log('Connected to MongoDB successfully.');
    
    // Migrate existing roles from 'Backend Designer' to 'Backend Developer'
    try {
      const User = mongoose.model('User');
      const res = await User.updateMany({ role: 'Backend Designer' }, { role: 'Backend Developer' });
      if (res.modifiedCount > 0) {
        console.log(`Migrated ${res.modifiedCount} users from Backend Designer to Backend Developer.`);
      }
    } catch (e) {
      console.error('Migration error:', e.message);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
  });
