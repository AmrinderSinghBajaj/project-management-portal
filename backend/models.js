const mongoose = require('mongoose');

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: 'Tunix@5494' },
  role: { 
    type: String, 
    required: true,
    enum: [
      'CEO', 'PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 
      'BA', 'Business Analyst (BA)', 'Developer', 'QA', 'Quality Analyst (QA)', 
      'Designer', 'Sales', 'Sales Rep', 'Android Developer', 'iOS Developer', 
      'Flutter Developer', 'Python Developer', 'Full Stack Developer', 
      'Angular Developer', 'Frontend Designer', 'Backend Developer', 'Delivery Head',
      'Product Owner'
    ]
  }
}, { timestamps: true });

// Project Schema
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  deliveryDate: { type: Date },
  status: { 
    type: String, 
    enum: ['In Progress', 'Live', 'On Hold', 'Testing', 'Completed'], 
    default: 'In Progress' 
  },
  totalRevenue: { type: Number, default: 0 },
  paymentReceived: { type: Number, default: 0 },
  pendingPayment: { type: Number, default: 0 },
  sequence: { type: Number, default: 0 },
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  documents: [{
    name: { type: String, required: true },
    path: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  importantLinks: [{
    title: { type: String, required: true },
    category: { 
      type: String, 
      default: 'Live URL',
      enum: ['Live URL', 'Test / Staging URL', 'Admin Portal', 'Dispatcher Portal', 'API / Swagger', 'Figma / Design', 'Database / Server', 'Other']
    },
    url: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    notes: { type: String, default: '' },
    addedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  changeRequests: [{
    title: { type: String, required: true },
    path: { type: String },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  columns: {
    type: [new mongoose.Schema({
      title: { type: String, required: true },
      sequence: { type: Number, required: true, default: 1 }
    })],
    default: [
      { title: 'To be started', sequence: 1 },
      { title: 'In progress', sequence: 2 },
      { title: 'Ready for testing', sequence: 3 },
      { title: 'Tested', sequence: 4 }
    ]
  }
}, { timestamps: true });

// Ticket Schema
const TicketSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  task: { type: String, required: true },
  ticketType: { 
    type: String, 
    enum: ['Feature', 'Task', 'Bug'], 
    default: 'Task' 
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  description: { type: String, required: true },
  figmaRef: { type: String },
  deadline: { type: Date },
  tags: [{ type: String }],
  images: [{ type: String }],
  status: { 
    type: String, 
    default: 'To be started'
  },
  comments: [{
    user: { type: String, required: true },
    comment: { type: String, default: '' },
    images: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
    parentId: { type: String, default: null },
    reactions: {
      type: [{
        emoji: { type: String, required: true },
        users: { type: [String], default: [] }
      }],
      default: []
    }
  }],
  history: [{
    user: { type: String, required: true },
    action: { type: String, required: true }, // e.g., "Moved from 'To be started' to 'In progress'"
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });



const User = mongoose.model('User', UserSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = { User, Project, Ticket };
