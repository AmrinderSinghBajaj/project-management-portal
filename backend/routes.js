const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Project, Ticket } = require('./models');

const JWT_SECRET = process.env.JWT_SECRET || 'apptunix_pm_portal_super_secure_jwt_secret_2026_@key';

// Generate cryptographically signed token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Sanitize user object for responses (omit password)
const sanitizeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

// Middleware: Authenticate Bearer JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists or session expired.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
  }
};

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed. Please provide cloud links (e.g. Google Drive) for videos.'), false);
  }
};

const imageUpload = multer({ 
  storage: storage, 
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Image Upload Endpoint (Up to 10 images)
router.post('/upload-images', (req, res) => {
  imageUpload.array('images', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Image upload failed.' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files uploaded.' });
    }
    const filePaths = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ images: filePaths, count: filePaths.length });
  });
});

// --- AUTH & USERS ---

// Signup
router.post('/users/signup', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, role, and password are required.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }
    // Securely hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ name, email, role, password: hashedPassword });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login / Verify User by Email & Password
router.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sign up.' });
    }

    // Secure password comparison (supports both bcrypt hashed & automatic legacy password upgrade)
    let isMatch = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      isMatch = await bcrypt.compare(password, user.password);
    } else if (user.password) {
      // Legacy plain-text check with auto-migration to bcrypt
      isMatch = (user.password === password);
      if (isMatch) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check and try again.' });
    }

    const token = generateToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Current User Session Token (Anti-tamper endpoint)
router.get('/users/me', authenticateToken, async (req, res) => {
  try {
    const token = generateToken(req.user);
    res.json({ token, user: sanitizeUser(req.user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (useful for PM assigning team members - password excluded)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- PROJECTS ---

// Create Project (PM only in concept)
router.post('/projects', async (req, res) => {
  try {
    const { name, description, deliveryDate, status, totalRevenue, paymentReceived, pendingPayment, teamMembers } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const trimmedName = name.trim();
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingProject = await Project.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
    });

    if (existingProject) {
      return res.status(400).json({ error: 'A project with this name already exists. Please choose a unique name.' });
    }

    const project = new Project({
      name: trimmedName,
      description,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      status: status || 'In Progress',
      totalRevenue: Number(totalRevenue) || 0,
      paymentReceived: Number(paymentReceived) || 0,
      pendingPayment: Number(pendingPayment) || 0,
      teamMembers: teamMembers || []
    });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Projects (CEO gets all, others get assigned projects)
router.get('/projects', async (req, res) => {
  try {
    const { userId, role } = req.query;
    let query = {};
    
    // Managers (CEO, Delivery Head, PM, PC) get all projects; others get assigned projects
    const isManager = ['CEO', 'Delivery Head', 'PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)'].includes(role);
    if (!isManager && userId) {
      query.teamMembers = userId;
    }
    
    const projects = await Project.find(query).populate('teamMembers', 'name email role').sort({ sequence: 1, createdAt: 1 });
    
    const projectsWithCount = await Promise.all(projects.map(async (project) => {
      let testingStageTitle = 'Ready for testing';
      let todoTitle = 'To be started';
      let inProgressTitle = 'In progress';

      if (project.columns && project.columns.length > 0) {
        const sorted = [...project.columns].sort((a, b) => a.sequence - b.sequence);
        
        // Find testing column
        const testFound = sorted.find(c => c.title.toLowerCase().includes('testing'));
        if (testFound) testingStageTitle = testFound.title;

        // Find todo (first column)
        todoTitle = sorted[0].title;

        // Find in progress
        const ipFound = sorted.find(c => c.title.toLowerCase().includes('progress') || c.title.toLowerCase().includes('doing'));
        if (ipFound) {
          inProgressTitle = ipFound.title;
        } else if (sorted.length > 1) {
          inProgressTitle = sorted[1].title;
        }
      }
      
      const readyCount = await Ticket.countDocuments({
        project: project._id,
        status: testingStageTitle
      });

      const devCount = await Ticket.countDocuments({
        project: project._id,
        status: { $in: [todoTitle, inProgressTitle] }
      });
      
      const pObj = project.toObject();
      if (!['In Progress', 'Live', 'On Hold'].includes(pObj.status)) {
        pObj.status = 'In Progress';
      }
      return {
        ...pObj,
        readyForTestingCount: readyCount,
        developerPendingCount: devCount
      };
    }));

    res.json(projectsWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Reorder Projects Priority
router.post('/projects/reorder', async (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!Array.isArray(projectIds)) {
      return res.status(400).json({ error: 'projectIds must be an array.' });
    }

    const updates = projectIds.map((id, index) => 
      Project.findByIdAndUpdate(id, { sequence: index })
    );
    await Promise.all(updates);
    
    res.json({ message: 'Project order updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Project Details
router.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('teamMembers', 'name email role');
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    // Also fetch tickets for this project
    const tickets = await Ticket.find({ project: req.params.id });
    res.json({ project, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const { name, description, deliveryDate, status, totalRevenue, paymentReceived, pendingPayment, teamMembers, columns } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Project name cannot be empty.' });
      }
      const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingProject = await Project.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      });
      if (existingProject) {
        return res.status(400).json({ error: 'A project with this name already exists. Please choose a unique name.' });
      }
      project.name = trimmedName;
    }

    if (description !== undefined) project.description = description;
    if (deliveryDate !== undefined) {
      project.deliveryDate = deliveryDate ? new Date(deliveryDate) : undefined;
    }
    if (status) project.status = status;
    if (totalRevenue !== undefined) project.totalRevenue = Number(totalRevenue) || 0;
    if (paymentReceived !== undefined) project.paymentReceived = Number(paymentReceived) || 0;
    if (pendingPayment !== undefined) project.pendingPayment = Number(pendingPayment) || 0;
    if (teamMembers !== undefined) project.teamMembers = teamMembers;
    if (columns) project.columns = columns;

    await project.save();
    
    // Return populated project
    const populated = await Project.findById(project._id).populate('teamMembers', 'name email role');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Project (Cascade deletes tickets)
router.delete('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const userRole = (req.body?.userRole || req.query?.userRole || '').toLowerCase();
    if (userRole) {
      const isAuthorized = userRole.includes('pm') || userRole.includes('project manager') ||
                           userRole.includes('pc') || userRole.includes('project coordinator') ||
                           userRole.includes('delivery head') || userRole.includes('dl') ||
                           userRole.includes('ceo') || userRole.includes('product owner') || userRole.includes('po');
      if (!isAuthorized) {
        return res.status(403).json({ error: 'Permission Denied: Only PM, PC, DL, CEO, and Product Owner have permission to delete projects.' });
      }
    }

    // Cascade delete associated tickets
    await Ticket.deleteMany({ project: req.params.id });

    // Delete project
    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: `Project '${project.name}' and all associated tickets deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DOCUMENTS (Upload) ---

router.post('/projects/:id/documents', upload.single('file'), async (req, res) => {
  try {
    const { uploadedBy } = req.body;
    if (!req.file || !uploadedBy) {
      return res.status(400).json({ error: 'File and uploadedBy are required.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const doc = {
      name: req.file.originalname,
      path: `/uploads/${req.file.filename}`, // relative path to serve
      uploadedBy
    };

    project.documents.push(doc);
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Delete Document
router.delete('/projects/:id/documents/:docId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    project.documents = project.documents.filter(
      doc => doc._id.toString() !== req.params.docId
    );
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- IMPORTANT LINKS & CREDENTIALS ---

// Add Link / Credential
router.post('/projects/:id/links', async (req, res) => {
  try {
    const { title, category, url, username, password, notes, addedBy } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (!addedBy) {
      return res.status(400).json({ error: 'addedBy is required.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const newLink = {
      title: title.trim(),
      category: category || 'Live URL',
      url: url ? url.trim() : '',
      username: username ? username.trim() : '',
      password: password || '',
      notes: notes ? notes.trim() : '',
      addedBy,
      createdAt: new Date()
    };

    if (!project.importantLinks) {
      project.importantLinks = [];
    }

    project.importantLinks.push(newLink);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Link / Credential
router.put('/projects/:id/links/:linkId', async (req, res) => {
  try {
    const { title, category, url, username, password, notes } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const link = project.importantLinks.id(req.params.linkId);
    if (!link) {
      return res.status(404).json({ error: 'Link / Credential entry not found.' });
    }

    if (title !== undefined) link.title = title.trim();
    if (category !== undefined) link.category = category;
    if (url !== undefined) link.url = url.trim();
    if (username !== undefined) link.username = username.trim();
    if (password !== undefined) link.password = password;
    if (notes !== undefined) link.notes = notes.trim();

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Link / Credential
router.delete('/projects/:id/links/:linkId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    project.importantLinks = project.importantLinks.filter(
      l => l._id.toString() !== req.params.linkId
    );
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- CHANGE REQUESTS (CR) ---
// Adding a CR automatically spawns a ticket in "To be started" (or custom columns)
router.post('/projects/:id/change-requests', upload.single('file'), async (req, res) => {
  try {
    const { title, uploadedBy, description, figmaRef, deadline, tags } = req.body;
    if (!title || !uploadedBy) {
      return res.status(400).json({ error: 'Title and uploadedBy are required.' });
    }
    if (title.trim().length > 80) {
      return res.status(400).json({ error: 'Change Request title cannot exceed 80 characters.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const cr = {
      title,
      path: req.file ? `/uploads/${req.file.filename}` : '',
      uploadedBy
    };

    project.changeRequests.push(cr);
    await project.save();

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(',').map(t => t.trim());
      }
    }

    const firstCol = (project.columns && project.columns.length > 0)
      ? [...project.columns].sort((a, b) => a.sequence - b.sequence)[0].title
      : 'To be started';

    // Spawn a ticket dynamically for this change request
    const ticket = new Ticket({
      project: project._id,
      task: `CR: ${title}`,
      description: description || `Change Request raised by PM. Refer to change requests tab for details.`,
      figmaRef: figmaRef || '',
      deadline: deadline ? new Date(deadline) : null,
      tags: parsedTags,
      status: firstCol,
      history: [{
        user: uploadedBy,
        action: 'Created automatically via Change Request'
      }]
    });
    await ticket.save();

    res.status(201).json({ project, ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Update Change Request
router.put('/projects/:id/change-requests/:crId', upload.single('file'), async (req, res) => {
  try {
    const { title } = req.body;
    if (title && title.trim().length > 80) {
      return res.status(400).json({ error: 'Change Request title cannot exceed 80 characters.' });
    }
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const cr = project.changeRequests.id(req.params.crId);
    if (!cr) {
      return res.status(404).json({ error: 'Change request not found.' });
    }

    const oldTitle = cr.title;

    if (title) cr.title = title.trim();
    if (req.file) {
      cr.path = `/uploads/${req.file.filename}`;
    }

    await project.save();

    // Also update the corresponding spawned ticket's title!
    if (title && oldTitle !== title) {
      const ticket = await Ticket.findOne({
        project: project._id,
        $or: [
          { task: `CR: ${oldTitle}` },
          { task: `[CR] ${oldTitle}` },
          { task: { $regex: new RegExp(oldTitle, 'i') } }
        ]
      });
      if (ticket) {
        ticket.task = `CR: ${title}`;
        await ticket.save();
      }
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Delete Change Request
router.delete('/projects/:id/change-requests/:crId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const crIndex = project.changeRequests.findIndex(
      c => c._id.toString() === req.params.crId
    );
    if (crIndex === -1) {
      return res.status(404).json({ error: 'Change request not found.' });
    }

    const crTitle = project.changeRequests[crIndex].title;
    project.changeRequests.splice(crIndex, 1);
    await project.save();

    // Also delete the corresponding spawned ticket!
    await Ticket.findOneAndDelete({
      project: project._id,
      $or: [
        { task: `CR: ${crTitle}` },
        { task: `[CR] ${crTitle}` },
        { task: { $regex: new RegExp(crTitle, 'i') } }
      ]
    });

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- TICKETS ---

// Create Ticket (PM only in concept)
router.post('/projects/:id/tickets', async (req, res) => {
  try {
    const { task, ticketType, priority, description, figmaRef, deadline, tags, images, createdBy, status } = req.body;
    if (!task || !description) {
      return res.status(400).json({ error: 'Task title and description are required.' });
    }
    if (task.trim().length > 80) {
      return res.status(400).json({ error: 'Task title cannot exceed 80 characters.' });
    }

    const ticket = new Ticket({
      project: req.params.id,
      task,
      ticketType: ticketType || 'Task',
      priority: priority || 'Medium',
      description,
      figmaRef,
      deadline,
      tags: tags || [],
      images: images || [],
      status: status || 'To be started',
      history: [{
        user: createdBy || 'System',
        action: 'Ticket Created'
      }]
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Ticket (including shifting columns, updates history)
router.put('/tickets/:id', async (req, res) => {
  try {
    const { status, userName, ticketType, priority } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (status && status !== ticket.status) {
      const oldStatus = ticket.status;
      const oldStatusLower = (oldStatus || '').toLowerCase();

      // Enforce: Only QA, PC, PM, Delivery Head, and CEO can move tickets OUT of Ready for Testing
      if (oldStatusLower.includes('ready') && oldStatusLower.includes('testing')) {
        const userRole = (req.body.userRole || '').toLowerCase();
        const isAuthorized = userRole.includes('qa') || userRole.includes('tester') || userRole.includes('quality') || 
                             userRole.includes('pm') || userRole.includes('project manager') || 
                             userRole.includes('pc') || userRole.includes('project coordinator') || 
                             userRole.includes('delivery head') || userRole.includes('ceo');

        if (userRole && !isAuthorized) {
          return res.status(403).json({ 
            error: 'Permission Denied: Only QA, PC, and PM team members have permission to reopen or move tickets out of "Ready for Testing".' 
          });
        }
      }

      ticket.status = status;
      ticket.history.push({
        user: userName || 'Unknown User',
        action: `Moved from '${oldStatus}' to '${status}'`
      });
    }

    // Allow updating other fields as well if needed
    if (req.body.task) {
      if (req.body.task.trim().length > 80) {
        return res.status(400).json({ error: 'Task title cannot exceed 80 characters.' });
      }
      ticket.task = req.body.task.trim();
    }
    if (ticketType) ticket.ticketType = ticketType;
    if (priority) ticket.priority = priority;
    if (req.body.description) ticket.description = req.body.description;
    if (req.body.figmaRef !== undefined) ticket.figmaRef = req.body.figmaRef;
    if (req.body.deadline !== undefined) ticket.deadline = req.body.deadline;
    if (req.body.images !== undefined) ticket.images = req.body.images;
    if (req.body.tags !== undefined) {
      ticket.tags = req.body.tags;
      if (req.body.tagAction) {
        ticket.history.push({
          user: userName || 'Unknown User',
          action: req.body.tagAction
        });
      }
    }

    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Delete Ticket
router.delete('/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    res.json({ message: 'Ticket deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to ticket
router.post('/tickets/:id/comments', async (req, res) => {
  try {
    const { user, comment, images, parentId } = req.body;
    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
    const commentImages = Array.isArray(images) ? images : [];

    if (!user || (!trimmedComment && commentImages.length === 0)) {
      return res.status(400).json({ error: 'User and comment text or images are required.' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    ticket.comments.push({ 
      user, 
      comment: trimmedComment, 
      images: commentImages,
      parentId: parentId || null 
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React to comment
router.post('/tickets/:id/comments/:commentId/react', async (req, res) => {
  try {
    const { emoji, user } = req.body;
    if (!emoji || !user) {
      return res.status(400).json({ error: 'Emoji and user are required.' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const comment = ticket.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    if (!comment.reactions) {
      comment.reactions = [];
    }

    // Enforce single reaction per user: remove this user from any other emoji reactions first
    comment.reactions.forEach(r => {
      if (r.emoji !== emoji) {
        r.users = r.users.filter(u => u !== user);
      }
    });

    // Find the reaction entry for this emoji
    let reaction = comment.reactions.find(r => r.emoji === emoji);

    if (reaction) {
      const userIndex = reaction.users.indexOf(user);
      if (userIndex > -1) {
        // Toggle off: remove user
        reaction.users.splice(userIndex, 1);
      } else {
        // Toggle on: add user
        reaction.users.push(user);
      }
    } else {
      // Create new entry
      comment.reactions.push({ emoji, users: [user] });
    }

    // Clean up reaction groups with 0 users
    comment.reactions = comment.reactions.filter(r => r.users.length > 0);

    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- USER PERFORMANCE & SCORECARD ---
router.get('/users/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    let user = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ 
        $or: [
          { email: id }, 
          { name: new RegExp(`^${id}$`, 'i') }
        ] 
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userName = user.name || '';
    const userEmail = user.email || '';
    const userRole = user.role || 'Member';

    const matchesUser = (actionUser) => {
      if (!actionUser) return false;
      const au = actionUser.trim().toLowerCase();
      return (
        au === userName.trim().toLowerCase() ||
        au === userEmail.trim().toLowerCase() ||
        au === user._id.toString() ||
        (userName && au.includes(userName.trim().toLowerCase())) ||
        (userName && userName.trim().toLowerCase().includes(au))
      );
    };

    // Fetch all projects & tickets
    const projects = await Project.find().populate('teamMembers', 'name email role');
    const tickets = await Ticket.find().populate('project', 'name status');

    const userProjects = projects.filter(p => 
      p.teamMembers?.some(m => matchesUser(m.name) || matchesUser(m.email) || m._id.toString() === user._id.toString())
    );

    const deliveredTicketIds = new Set();
    let qaVerifiedCount = 0;
    let qaReopenedCount = 0;
    let devReopenedCount = 0;
    let liveEscapedCount = 0;
    let ticketsCreatedCount = 0;
    let commentsCount = 0;
    const activities = [];

    // Derive developer discipline tag from role
    const roleLower = userRole.toLowerCase();
    let devTag = null;
    if (roleLower.includes('android')) devTag = 'android';
    else if (roleLower.includes('ios')) devTag = 'ios';
    else if (roleLower.includes('backend') || roleLower.includes('node') || roleLower.includes('python')) devTag = 'backend';
    else if (roleLower.includes('frontend') || roleLower.includes('react') || roleLower.includes('angular')) devTag = 'frontend';
    else if (roleLower.includes('flutter')) devTag = 'flutter';
    else if (roleLower.includes('design')) devTag = 'design';

    tickets.forEach(ticket => {
      const projName = ticket.project?.name || 'Project';
      const isDevTagged = devTag && ticket.tags?.some(t => t.toLowerCase() === devTag);

      // Comments count
      (ticket.comments || []).forEach(comm => {
        if (matchesUser(comm.user)) {
          commentsCount++;
        }
      });

      // History movements
      (ticket.history || []).forEach(h => {
        const isUserAction = matchesUser(h.user);
        const actionLower = (h.action || '').toLowerCase();

        if (isUserAction) {
          activities.push({
            ticketId: ticket._id,
            ticketTask: ticket.task,
            projectName: projName,
            action: h.action,
            timestamp: h.timestamp
          });

          if (actionLower.includes('ticket created')) {
            ticketsCreatedCount++;
          }

          // Dev: Moved to Ready for testing (Counted uniquely per ticket)
          if (actionLower.includes("to 'ready for testing'") || (actionLower.includes('ready') && actionLower.includes('testing') && !actionLower.includes("from 'ready"))) {
            deliveredTicketIds.add(ticket._id.toString());
          }

          // QA: Verified & Moved to Tested or Live
          if (actionLower.includes("to 'tested'") || actionLower.includes("to 'live'")) {
            qaVerifiedCount++;
          }

          // QA: Reopened from Testing to In Progress
          if (actionLower.includes("from 'ready for testing'") && (actionLower.includes("to 'in progress'") || actionLower.includes("to 'to be started'"))) {
            qaReopenedCount++;
          }

          // Live Leakage: Reopened from Live back to In Progress
          if (actionLower.includes("from 'live'") && actionLower.includes("to 'in progress'")) {
            liveEscapedCount++;
          }
        }

        // Reopened against this dev if the ticket had their tag or they previously delivered it
        if (!isUserAction && isDevTagged && actionLower.includes("from 'ready for testing'") && actionLower.includes("to 'in progress'")) {
          devReopenedCount++;
        }
      });
    });

    const deliveredCount = deliveredTicketIds.size;

    // Sort activities latest first
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate rates
    const devPassRate = deliveredCount > 0 
      ? Math.max(0, Math.round(((deliveredCount - devReopenedCount) / deliveredCount) * 100))
      : 100;

    const qaAccuracy = qaVerifiedCount > 0
      ? Math.max(0, Math.round(((qaVerifiedCount - liveEscapedCount) / qaVerifiedCount) * 100))
      : 100;

    const totalRevenueManaged = userProjects.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
    const liveProjectsManaged = userProjects.filter(p => p.status === 'Live').length;

    const activeTicketsCount = tickets.filter(t => 
      t.status?.toLowerCase() === 'in progress' && (devTag ? t.tags?.some(tag => tag.toLowerCase() === devTag) : true)
    ).length;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      metrics: {
        developer: {
          deliveredCount,
          reopenedCount: devReopenedCount,
          passRatePercent: devPassRate,
          activeTicketsCount
        },
        qa: {
          verifiedCount: qaVerifiedCount,
          bugsCaughtCount: qaReopenedCount,
          productionLeakageCount: liveEscapedCount,
          accuracyPercent: qaAccuracy
        },
        manager: {
          ticketsCreatedCount,
          projectsCount: userProjects.length,
          liveProjectsCount: liveProjectsManaged,
          totalRevenueManaged
        },
        engagement: {
          commentsCount,
          totalMovements: activities.length
        }
      },
      recentActivities: activities.slice(0, 15)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DELIVERY HEAD EXECUTIVE SUMMARY ---
router.get('/delivery-head/summary', async (req, res) => {
  try {
    const projects = await Project.find().populate('teamMembers', 'name email role').sort({ sequence: 1, createdAt: -1 });
    const tickets = await Ticket.find().populate('project', 'name status');
    const users = await User.find({}, 'name email role');

    // Global KPIs
    let totalRevenuePipeline = 0;
    let totalPaymentReceived = 0;
    let totalPendingPayment = 0;
    let liveProjectsCount = 0;
    let inProgressProjectsCount = 0;
    let testingProjectsCount = 0;

    projects.forEach(p => {
      totalRevenuePipeline += (p.totalRevenue || 0);
      totalPaymentReceived += (p.paymentReceived || 0);
      totalPendingPayment += (p.pendingPayment || 0);
      if (p.status === 'Live') liveProjectsCount++;
      else if (p.status === 'Testing') testingProjectsCount++;
      else inProgressProjectsCount++;
    });

    // PM Revenue Attribution (strictly Project Managers, no PC)
    const isPMRole = (role) => {
      if (!role) return false;
      const r = role.toLowerCase();
      return (r === 'pm' || r === 'project manager' || r.includes('project manager (pm)')) && !r.includes('pc') && !r.includes('coordinator');
    };

    const pmUsers = users.filter(u => isPMRole(u.role));
    const pmLeaderboard = pmUsers.map(pm => {
      const assignedProjects = projects.filter(p => 
        p.teamMembers?.some(m => m._id.toString() === pm._id.toString() || m.email === pm.email || m.name === pm.name)
      );

      const totalRevenue = assignedProjects.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
      const paymentReceived = assignedProjects.reduce((sum, p) => sum + (p.paymentReceived || 0), 0);
      const pendingPayment = assignedProjects.reduce((sum, p) => sum + (p.pendingPayment || 0), 0);
      const liveCount = assignedProjects.filter(p => p.status === 'Live').length;

      const projectBreakdown = assignedProjects.map(p => {
        const pTickets = tickets.filter(t => t.project?._id?.toString() === p._id.toString());
        return {
          _id: p._id,
          name: p.name,
          status: p.status,
          deliveryDate: p.deliveryDate,
          totalRevenue: p.totalRevenue || 0,
          paymentReceived: p.paymentReceived || 0,
          pendingPayment: p.pendingPayment || 0,
          ticketsCount: pTickets.length,
          readyForTestingCount: pTickets.filter(t => t.status?.toLowerCase().includes('ready')).length,
          teamMembersCount: p.teamMembers?.length || 0
        };
      });

      return {
        _id: pm._id,
        name: pm.name,
        email: pm.email,
        role: pm.role,
        totalRevenue,
        paymentReceived,
        pendingPayment,
        projectsCount: assignedProjects.length,
        liveCount,
        projects: projectBreakdown
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Enriched Projects with stats, Lead PM, and tech teams
    const enrichedProjects = projects.map(p => {
      const pTickets = tickets.filter(t => t.project?._id?.toString() === p._id.toString());
      const leadPM = p.teamMembers?.find(m => isPMRole(m.role)) || null;

      // Extract unique tech tags from tickets and roles from team members
      const techTagsSet = new Set();
      pTickets.forEach(t => (t.tags || []).forEach(tag => techTagsSet.add(tag)));
      (p.teamMembers || []).forEach(m => {
        const r = (m.role || '').toLowerCase();
        if (r.includes('android')) techTagsSet.add('android');
        if (r.includes('ios')) techTagsSet.add('ios');
        if (r.includes('backend') || r.includes('node') || r.includes('python')) techTagsSet.add('backend');
        if (r.includes('angular') || r.includes('react') || r.includes('frontend')) techTagsSet.add('frontend');
        if (r.includes('qa') || r.includes('tester') || r.includes('quality')) techTagsSet.add('qa');
        if (r.includes('design')) techTagsSet.add('design');
        if (r.includes('flutter')) techTagsSet.add('flutter');
      });

      return {
        _id: p._id,
        name: p.name,
        description: p.description,
        deliveryDate: p.deliveryDate,
        status: p.status,
        totalRevenue: p.totalRevenue || 0,
        paymentReceived: p.paymentReceived || 0,
        pendingPayment: p.pendingPayment || 0,
        sequence: p.sequence || 0,
        leadPM: leadPM ? { _id: leadPM._id, name: leadPM.name, email: leadPM.email, role: leadPM.role } : null,
        teamMembers: p.teamMembers || [],
        techTeams: Array.from(techTagsSet),
        ticketsStats: {
          total: pTickets.length,
          inProgress: pTickets.filter(t => t.status?.toLowerCase() === 'in progress').length,
          readyForTesting: pTickets.filter(t => t.status?.toLowerCase().includes('ready')).length,
          tested: pTickets.filter(t => t.status?.toLowerCase() === 'tested').length,
          live: pTickets.filter(t => t.status?.toLowerCase() === 'live').length
        }
      };
    });

    // Cross-project team member workload
    const teamMembersMatrix = users.map(user => {
      const assigned = projects.filter(p => 
        p.teamMembers?.some(m => m._id.toString() === user._id.toString() || m.email === user.email || m.name === user.name)
      );
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        projectsCount: assigned.length,
        projects: assigned.map(p => ({ _id: p._id, name: p.name, status: p.status }))
      };
    }).sort((a, b) => b.projectsCount - a.projectsCount);

    res.json({
      globalKPIs: {
        totalProjects: projects.length,
        inProgressProjectsCount,
        testingProjectsCount,
        liveProjectsCount,
        totalRevenuePipeline,
        totalPaymentReceived,
        totalPendingPayment,
        totalTickets: tickets.length,
        readyForTestingTickets: tickets.filter(t => t.status?.toLowerCase().includes('ready')).length
      },
      pmLeaderboard,
      projects: enrichedProjects,
      teamMembersMatrix
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
