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
    isActive: user.isActive !== false,
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

// Signup (Restricted: Only Amrinder PM can create users)
router.post('/users/signup', async (req, res) => {
  try {
    const { name, email, role, password, adminEmail } = req.body;
    
    // Check authorization: Only amrinderpm@apptunix.com can create users
    const callerAdminEmail = (adminEmail || '').trim().toLowerCase();
    if (callerAdminEmail !== 'amrinderpm@apptunix.com') {
      return res.status(403).json({ 
        error: 'Public registration is disabled. Only amrinderpm@apptunix.com is authorized to create user accounts.' 
      });
    }

    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, role, and password are required.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }
    // Check if user already exists
    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
    });
    if (user) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }
    // Securely hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ 
      name: name.trim(), 
      email: cleanEmail, 
      role, 
      password: hashedPassword,
      plainPassword: password 
    });
    await user.save();

    res.status(201).json({ message: 'User created successfully', user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Create User Endpoint (Strictly amrinderpm@apptunix.com)
router.post('/users/admin-create', async (req, res) => {
  try {
    const { name, email, role, password, adminEmail } = req.body;
    const callerAdminEmail = (adminEmail || '').trim().toLowerCase();
    if (callerAdminEmail !== 'amrinderpm@apptunix.com') {
      return res.status(403).json({ 
        error: 'Permission Denied: Only amrinderpm@apptunix.com has permission to create and provision new accounts.' 
      });
    }

    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, role, and password are required.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
    });
    if (user) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ 
      name: name.trim(), 
      email: cleanEmail, 
      role, 
      password: hashedPassword,
      plainPassword: password 
    });
    await user.save();

    res.status(201).json({ message: 'User provisioned successfully', user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Reset User Password
router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword, adminEmail } = req.body;
    const callerAdminEmail = (adminEmail || '').trim().toLowerCase();
    if (callerAdminEmail !== 'amrinderpm@apptunix.com') {
      return res.status(403).json({ 
        error: 'Permission Denied: Only amrinderpm@apptunix.com can reset user credentials.' 
      });
    }

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.plainPassword = newPassword;
    await user.save();

    res.json({ message: `Password for ${user.name} (${user.email}) updated successfully.`, plainPassword: newPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Toggle User Status (Enable / Disable)
router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const { adminEmail, isActive } = req.body;
    const callerAdminEmail = (adminEmail || '').trim().toLowerCase();
    if (callerAdminEmail !== 'amrinderpm@apptunix.com') {
      return res.status(403).json({ 
        error: 'Permission Denied: Only amrinderpm@apptunix.com can toggle user account status.' 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.email.toLowerCase() === 'amrinderpm@apptunix.com') {
      return res.status(400).json({ error: 'Cannot deactivate the master admin account.' });
    }

    user.isActive = (isActive !== undefined) ? Boolean(isActive) : !user.isActive;
    await user.save();

    res.json({ 
      message: `User ${user.name} (${user.email}) is now ${user.isActive ? 'Active' : 'Disabled'}.`, 
      user: sanitizeUser(user) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Delete User
router.delete('/users/:id', async (req, res) => {
  try {
    const adminEmail = (req.body?.adminEmail || req.query?.adminEmail || '').trim().toLowerCase();
    if (adminEmail !== 'amrinderpm@apptunix.com') {
      return res.status(403).json({ 
        error: 'Permission Denied: Only amrinderpm@apptunix.com can delete accounts.' 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.email.toLowerCase() === 'amrinderpm@apptunix.com') {
      return res.status(400).json({ error: 'Cannot delete the master admin account.' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `User ${user.name} (${user.email}) deleted successfully.` });
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
    const cleanEmail = email.trim();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (!user) {
      return res.status(404).json({ error: 'User account not found. Please contact administrator (amrinderpm@apptunix.com) for access.' });
    }

    // Check if account has been disabled by admin
    if (user.isActive === false) {
      return res.status(403).json({ 
        error: 'Your account has been deactivated by administrator. Please contact amrinderpm@apptunix.com for access.' 
      });
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

// Get all users (useful for PM assigning team members, with passwords for amrinderpm@apptunix.com)
router.get('/users', async (req, res) => {
  try {
    const adminEmail = (req.query.adminEmail || '').trim().toLowerCase();
    const isMasterAdmin = adminEmail === 'amrinderpm@apptunix.com';

    const users = await User.find({}).sort({ createdAt: -1 });
    const formatted = users.map(u => {
      const sanitized = sanitizeUser(u);
      if (isMasterAdmin) {
        sanitized.plainPassword = u.plainPassword || (u.password && !u.password.startsWith('$') ? u.password : 'Tunix@5494');
      }
      return sanitized;
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- PROJECTS ---

// Helper to process client user creation or linking
async function processClientUser(clientName, clientEmail, clientPassword, existingClientUsers = []) {
  if (!clientEmail || !clientEmail.trim()) {
    return existingClientUsers || [];
  }
  const cleanEmail = clientEmail.trim().toLowerCase();
  const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let clientUser = await User.findOne({ 
    email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } 
  });

  if (!clientUser) {
    const defaultPassword = clientPassword && clientPassword.trim() ? clientPassword.trim() : 'Tunix@5494';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    clientUser = new User({
      name: clientName && clientName.trim() ? clientName.trim() : cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'Client',
      password: hashedPassword
    });
    await clientUser.save();
    console.log(`[processClientUser] Created new Client user: ${cleanEmail}`);
  } else {
    // If password or name update provided
    const passwordUpdated = Boolean(clientPassword && clientPassword.trim());
    if (passwordUpdated) {
      clientUser.password = await bcrypt.hash(clientPassword.trim(), 10);
    }
    if (clientName && clientName.trim()) {
      clientUser.name = clientName.trim();
    }
    clientUser.role = 'Client';
    await clientUser.save();
    console.log(`[processClientUser] Updated Client user: ${clientUser.email}, password updated: ${passwordUpdated}`);
  }

  const clientIds = (existingClientUsers || []).map(id => id._id ? id._id.toString() : id.toString());
  if (!clientIds.includes(clientUser._id.toString())) {
    clientIds.push(clientUser._id.toString());
  }
  return clientIds;
}

// Create Project (PM only in concept)
router.post('/projects', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      deliveryDate, 
      status, 
      totalRevenue, 
      paymentReceived, 
      pendingPayment, 
      teamMembers,
      clientName,
      clientEmail,
      clientPassword,
      clientUsers
    } = req.body;

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

    let finalClientUsers = clientUsers || [];
    if (clientEmail) {
      finalClientUsers = await processClientUser(clientName, clientEmail, clientPassword, finalClientUsers);
    }

    const project = new Project({
      name: trimmedName,
      description,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      status: status || 'In Progress',
      totalRevenue: Number(totalRevenue) || 0,
      paymentReceived: Number(paymentReceived) || 0,
      pendingPayment: Number(pendingPayment) || 0,
      teamMembers: teamMembers || [],
      clientUsers: finalClientUsers
    });
    await project.save();
    
    const populated = await Project.findById(project._id)
      .populate('teamMembers', 'name email role')
      .populate('clientUsers', 'name email role');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Projects (CEO gets all, others get assigned projects, Client gets only their project)
router.get('/projects', async (req, res) => {
  try {
    const { userId, role } = req.query;
    let query = {};
    const isClient = role === 'Client';
    
    if (isClient && userId) {
      query.$or = [
        { clientUsers: userId },
        { teamMembers: userId }
      ];
    } else {
      // Managers (CEO, Delivery Head, PM, PC) get all projects; others get assigned projects
      const isManager = ['CEO', 'Delivery Head', 'PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)'].includes(role);
      if (!isManager && userId) {
        query.teamMembers = userId;
      }
    }
    
    const projects = await Project.find(query)
      .populate('teamMembers', 'name email role')
      .populate('clientUsers', 'name email role')
      .sort({ sequence: 1, createdAt: 1 });
    
    const projectIds = projects.map(p => p._id);
    
    // Single aggregation query for all ticket counts across all projects (Ultra Fast)
    const countMatch = { project: { $in: projectIds } };
    if (isClient) {
      countMatch.$or = [{ isClientTicket: true }, { reportedByRole: 'Client' }];
    }
    const ticketCounts = await Ticket.aggregate([
      { $match: countMatch },
      {
        $group: {
          _id: { project: '$project', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a fast lookup map: `${projectId}_${status}` -> count
    const countMap = new Map();
    ticketCounts.forEach(tc => {
      if (tc._id && tc._id.project && tc._id.status) {
        countMap.set(`${tc._id.project.toString()}_${tc._id.status}`, tc.count);
      }
    });

    const projectsWithCount = projects.map((project) => {
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

      const pIdStr = project._id.toString();
      const readyCount = countMap.get(`${pIdStr}_${testingStageTitle}`) || 0;
      const devCount = (countMap.get(`${pIdStr}_${todoTitle}`) || 0) + (countMap.get(`${pIdStr}_${inProgressTitle}`) || 0);
      
      const pObj = project.toObject();
      if (!['In Progress', 'Live', 'On Hold'].includes(pObj.status)) {
        pObj.status = 'In Progress';
      }

      // If client, hide financial details
      if (isClient) {
        pObj.totalRevenue = undefined;
        pObj.paymentReceived = undefined;
        pObj.pendingPayment = undefined;
      }

      return {
        ...pObj,
        readyForTestingCount: readyCount,
        developerPendingCount: devCount
      };
    });

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
    const { role } = req.query;
    const isClient = role === 'Client';

    const project = await Project.findById(req.params.id)
      .populate('teamMembers', 'name email role')
      .populate('clientUsers', 'name email role');
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // If client, only fetch tickets reported by client
    let ticketQuery = { project: req.params.id };
    if (isClient) {
      ticketQuery.$or = [
        { isClientTicket: true },
        { reportedByRole: 'Client' }
      ];
    }

    const tickets = await Ticket.find(ticketQuery);

    const pObj = project.toObject();
    if (isClient) {
      pObj.totalRevenue = undefined;
      pObj.paymentReceived = undefined;
      pObj.pendingPayment = undefined;
    }

    res.json({ project: pObj, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      deliveryDate, 
      status, 
      totalRevenue, 
      paymentReceived, 
      pendingPayment, 
      teamMembers, 
      columns,
      clientName,
      clientEmail,
      clientPassword,
      clientUsers
    } = req.body;

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

    if (clientUsers !== undefined) {
      project.clientUsers = clientUsers;
    }

    if (clientEmail && clientEmail.trim()) {
      project.clientUsers = await processClientUser(clientName, clientEmail, clientPassword, project.clientUsers);
    }

    await project.save();
    
    // Return populated project
    const populated = await Project.findById(project._id)
      .populate('teamMembers', 'name email role')
      .populate('clientUsers', 'name email role');
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


// Helper to format date-time for logs
const formatDateTimeLog = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Create Ticket
router.post('/projects/:id/tickets', async (req, res) => {
  try {
    const { 
      task, 
      ticketType, 
      priority, 
      description, 
      figmaRef, 
      deadline, 
      tags, 
      images, 
      createdBy, 
      status,
      isClientTicket,
      reportedBy,
      reportedByEmail,
      reportedByRole
    } = req.body;

    if (!task || !description) {
      return res.status(400).json({ error: 'Task title and description are required.' });
    }
    if (task.trim().length > 80) {
      return res.status(400).json({ error: 'Task title cannot exceed 80 characters.' });
    }

    const isClient = Boolean(isClientTicket || reportedByRole === 'Client');

    const historyLogs = [{
      user: createdBy || (isClient ? 'Client' : 'System'),
      action: isClient ? 'Ticket Reported by Client' : 'Ticket Created'
    }];

    if (deadline) {
      const deadlineTime = new Date(deadline).getTime();
      if (!isNaN(deadlineTime) && deadlineTime < Date.now() - 60000) {
        return res.status(400).json({ error: 'Deadline cannot be set in the past. Please select a future date and time.' });
      }
      const formattedD = formatDateTimeLog(deadline);
      if (formattedD) {
        historyLogs.push({
          user: createdBy || (isClient ? 'Client' : 'System'),
          action: `Deadline set to ${formattedD}`
        });
      }
    }

    const ticket = new Ticket({
      project: req.params.id,
      task,
      ticketType: ticketType || 'Task',
      priority: priority || 'Medium',
      description,
      figmaRef,
      deadline: deadline || null,
      tags: tags || [],
      images: images || [],
      status: status || 'To be started',
      isClientTicket: isClient,
      reportedBy: isClient ? (reportedBy || createdBy || 'Client') : (reportedBy || null),
      reportedByEmail: isClient ? (reportedByEmail || null) : (reportedByEmail || null),
      reportedByRole: isClient ? 'Client' : (reportedByRole || null),
      history: historyLogs,
      timeTracking: []
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- STEALTH SESSION TELEMETRY & APP VIEW REGISTRATION ---
router.post('/telemetry/heartbeat', async (req, res) => {
  try {
    let payload = req.body || {};
    
    // Decode base64 obfuscated telemetry ctx if present
    if (payload.ctx && typeof payload.ctx === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(payload.ctx, 'base64').toString('utf8'));
        payload = { ...payload, ...decoded };
      } catch (e) {}
    }

    const ticketId = payload.t || payload.ticketId;
    const elapsedSeconds = parseInt(payload.s || payload.seconds || 0, 10);
    const user = payload.n || payload.user;
    const userEmail = payload.e || payload.userEmail;
    const userId = payload.u || payload.userId;

    if (!ticketId) {
      return res.json({ status: 'ok' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.json({ status: 'ok' });
    }

    const now = new Date();
    // Record first view timestamp for lifecycle resolution calculation if not set
    if (!ticket.firstViewedAt) {
      ticket.firstViewedAt = now;
    }

    if (!ticket.timeTracking) {
      ticket.timeTracking = [];
    }

    if (user) {
      const userTrim = user.trim().toLowerCase();
      const emailTrim = userEmail ? userEmail.trim().toLowerCase() : '';

      let trackingEntry = ticket.timeTracking.find(tt => 
        (userId && tt.userId && tt.userId.toString() === userId.toString()) ||
        (emailTrim && tt.userEmail && tt.userEmail.trim().toLowerCase() === emailTrim) ||
        (tt.user && tt.user.trim().toLowerCase() === userTrim)
      );

      if (trackingEntry) {
        if (elapsedSeconds > 0) {
          trackingEntry.totalSeconds = (trackingEntry.totalSeconds || 0) + elapsedSeconds;
        }
        trackingEntry.lastActiveAt = now;
      } else {
        ticket.timeTracking.push({
          user: user.trim(),
          userEmail: emailTrim || null,
          userId: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
          totalSeconds: elapsedSeconds > 0 ? elapsedSeconds : 0,
          lastActiveAt: now,
          sessionsCount: 1
        });
      }
    }

    await ticket.save();
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.json({ status: 'ok' });
  }
});

// Backward-compatible Record Silent Active Time on Ticket
router.post('/tickets/:id/time-log', async (req, res) => {
  try {
    const { user, userEmail, userId, seconds } = req.body;
    const elapsedSeconds = parseInt(seconds, 10) || 0;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.json({ status: 'ok' });
    }

    const now = new Date();
    if (!ticket.firstViewedAt) {
      ticket.firstViewedAt = now;
    }

    if (!ticket.timeTracking) {
      ticket.timeTracking = [];
    }

    if (user) {
      const userTrim = user.trim().toLowerCase();
      const emailTrim = userEmail ? userEmail.trim().toLowerCase() : '';

      let trackingEntry = ticket.timeTracking.find(tt => 
        (userId && tt.userId && tt.userId.toString() === userId.toString()) ||
        (emailTrim && tt.userEmail && tt.userEmail.trim().toLowerCase() === emailTrim) ||
        (tt.user && tt.user.trim().toLowerCase() === userTrim)
      );

      if (trackingEntry) {
        if (elapsedSeconds > 0) {
          trackingEntry.totalSeconds = (trackingEntry.totalSeconds || 0) + elapsedSeconds;
        }
        trackingEntry.lastActiveAt = now;
      } else {
        ticket.timeTracking.push({
          user: user.trim(),
          userEmail: emailTrim || null,
          userId: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
          totalSeconds: elapsedSeconds,
          lastActiveAt: now,
          sessionsCount: 1
        });
      }
    }

    await ticket.save();
    res.json({ status: 'ok' });
  } catch (error) {
    res.json({ status: 'ok' });
  }
});

// Update Ticket (including shifting columns, updates history & smart resolution cycle time)
router.put('/tickets/:id', async (req, res) => {
  try {
    const { status, userName, userEmail, userId, ticketType, priority } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (status && status !== ticket.status) {
      const oldStatus = ticket.status;
      const oldStatusLower = (oldStatus || '').toLowerCase();
      const newStatusLower = (status || '').toLowerCase();
      const now = new Date();

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

      // Track startedAt when moving to 'In progress'
      if (newStatusLower.includes('in progress')) {
        if (!ticket.startedAt) {
          ticket.startedAt = now;
        }
      }

      // Smart Lifecycle Resolution Time Engine:
      // When moving to 'Ready for Testing' or directly to 'Tested' / 'Live':
      const isDelivering = (newStatusLower.includes('ready') && newStatusLower.includes('testing')) ||
                           newStatusLower === 'tested' || newStatusLower === 'live';

      if (isDelivering && !oldStatusLower.includes('ready') && oldStatusLower !== 'tested' && oldStatusLower !== 'live') {
        let startTime = null;

        // 1. Look back in history for most recent reopen action from QA/PM
        if (ticket.history && ticket.history.length > 0) {
          for (let i = ticket.history.length - 1; i >= 0; i--) {
            const act = (ticket.history[i].action || '').toLowerCase();
            if (act.includes("from 'ready for testing'") && (act.includes("to 'in progress'") || act.includes("to 'to be started'"))) {
              startTime = new Date(ticket.history[i].timestamp);
              break;
            }
          }
        }

        // 2. If not reopened, look for most recent move to 'In progress'
        if (!startTime && ticket.history && ticket.history.length > 0) {
          for (let i = ticket.history.length - 1; i >= 0; i--) {
            const act = (ticket.history[i].action || '').toLowerCase();
            if (act.includes("to 'in progress'")) {
              startTime = new Date(ticket.history[i].timestamp);
              break;
            }
          }
        }

        // 3. If developer moved directly from 'To be started', check startedAt or firstViewedAt
        if (!startTime && ticket.startedAt) {
          startTime = new Date(ticket.startedAt);
        }
        if (!startTime && ticket.firstViewedAt) {
          startTime = new Date(ticket.firstViewedAt);
        }

        // 4. Fallback to ticket assignment in history or createdAt
        if (!startTime && ticket.history && ticket.history.length > 0) {
          for (let i = ticket.history.length - 1; i >= 0; i--) {
            const act = (ticket.history[i].action || '').toLowerCase();
            if (act.includes('tag') || act.includes('assigned')) {
              startTime = new Date(ticket.history[i].timestamp);
              break;
            }
          }
        }
        if (!startTime) {
          startTime = new Date(ticket.createdAt || (now.getTime() - 25 * 60 * 1000));
        }

        const durationMs = Math.max(60000, now.getTime() - startTime.getTime());
        const cycleSeconds = Math.round(durationMs / 1000);

        ticket.lastDeliveredAt = now;
        ticket.resolutionSeconds = (ticket.resolutionSeconds || 0) + cycleSeconds;

        if (!ticket.timeTracking) {
          ticket.timeTracking = [];
        }

        const actorName = (userName || '').trim();
        const actorEmail = (userEmail || '').trim();
        const actorId = userId;

        let devEntry = null;
        if (actorName) {
          devEntry = ticket.timeTracking.find(tt => 
            (actorId && tt.userId && tt.userId.toString() === actorId.toString()) ||
            (actorEmail && tt.userEmail && tt.userEmail.toLowerCase() === actorEmail.toLowerCase()) ||
            (tt.user && tt.user.toLowerCase() === actorName.toLowerCase())
          );
        }

        if (!devEntry && ticket.tags && ticket.tags.length > 0) {
          devEntry = ticket.timeTracking.find(tt => 
            ticket.tags.some(tg => tg.toLowerCase() === (tt.user || '').toLowerCase())
          );
        }

        if (devEntry) {
          devEntry.totalSeconds = (devEntry.totalSeconds || 0) + cycleSeconds;
          devEntry.lastActiveAt = now;
          devEntry.sessionsCount = (devEntry.sessionsCount || 1) + 1;
        } else if (actorName) {
          ticket.timeTracking.push({
            user: actorName,
            userEmail: actorEmail || null,
            userId: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : null,
            totalSeconds: cycleSeconds,
            lastActiveAt: now,
            sessionsCount: 1
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
    if (req.body.deadline !== undefined) {
      if (req.body.deadline) {
        const newDeadlineTime = new Date(req.body.deadline).getTime();
        if (!isNaN(newDeadlineTime) && newDeadlineTime < Date.now() - 60000) {
          return res.status(400).json({ error: 'Deadline cannot be set in the past. Please select a future date and time.' });
        }
      }
      const oldDeadline = ticket.deadline ? new Date(ticket.deadline).getTime() : null;
      const newDeadline = req.body.deadline ? new Date(req.body.deadline).getTime() : null;
      if (oldDeadline !== newDeadline) {
        ticket.deadline = req.body.deadline || null;
        const formattedD = req.body.deadline ? formatDateTimeLog(req.body.deadline) : 'None';
        ticket.history.push({
          user: userName || 'Unknown User',
          action: `Deadline updated to ${formattedD}`
        });
      }
    }
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


// Delete Ticket (Clients not authorized to delete)
router.delete('/tickets/:id', async (req, res) => {
  try {
    const userRole = (req.query.role || req.body.role || '').toLowerCase();
    if (userRole === 'client') {
      return res.status(403).json({ error: 'Permission Denied: Clients are not authorized to delete tickets.' });
    }

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

    // Verify whether the requester is Delivery Head or CEO
    let isDeliveryOrCeo = false;

    // 1. Check Authorization Bearer JWT if present
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) {
          const reqUser = await User.findById(decoded.id);
          if (reqUser && reqUser.role) {
            const r = reqUser.role.toLowerCase();
            if (r.includes('delivery') || r.includes('ceo')) {
              isDeliveryOrCeo = true;
            }
          }
        }
      } catch (e) {}
    }

    // 2. Check requesterEmail from header or query param
    const requesterEmail = req.headers['x-requester-email'] || req.query.requesterEmail;
    if (!isDeliveryOrCeo && requesterEmail) {
      const reqUser = await User.findOne({ email: new RegExp(`^${String(requesterEmail).trim()}$`, 'i') });
      if (reqUser && reqUser.role) {
        const r = reqUser.role.toLowerCase();
        if (r.includes('delivery') || r.includes('ceo')) {
          isDeliveryOrCeo = true;
        }
      }
    }

    // 3. Fallback check for requesterRole header or query
    const requesterRole = req.headers['x-requester-role'] || req.query.requesterRole;
    if (!isDeliveryOrCeo && requesterRole) {
      const r = String(requesterRole).trim().toLowerCase();
      if (r.includes('delivery') || r.includes('ceo')) {
        isDeliveryOrCeo = true;
      }
    }

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

    // Scorecard Metric Accumulators & Drilldown Detail Lists
    const userAllocatedTicketIds = new Set();
    const userResolvedTicketIds = new Set();
    const userReopenedTicketIds = new Set();
    const userMissedDeadlineTicketIds = new Set();
    let totalDeadlinesCount = 0;

    const allocatedTicketsList = [];
    const resolvedTicketsList = [];
    const reopenedTicketsList = [];
    const missedDeadlineTicketsList = [];

    tickets.forEach(ticket => {
      const isDevTagged = devTag && ticket.tags?.some(t => t.toLowerCase() === devTag);
      const isUserProject = userProjects.some(p => p._id.toString() === ticket.project?._id?.toString());
      const hasUserTimeTrack = (ticket.timeTracking || []).some(tt => 
        (user._id && tt.userId && tt.userId.toString() === user._id.toString()) ||
        matchesUser(tt.user) || 
        matchesUser(tt.userEmail)
      );
      const hasUserHistory = (ticket.history || []).some(h => matchesUser(h.user));

      // Is allocated to this employee
      const isAllocated = (isDevTagged && isUserProject) || hasUserTimeTrack || hasUserHistory;

      if (isAllocated) {
        userAllocatedTicketIds.add(ticket._id.toString());
        const projName = ticket.project?.name || 'Project';

        allocatedTicketsList.push({
          ticketId: ticket._id,
          task: ticket.task,
          projectName: projName,
          status: ticket.status || 'To be started',
          deadline: ticket.deadline,
          tags: ticket.tags || []
        });

        const statusLower = (ticket.status || '').toLowerCase();

        // 2. Resolved (Approved by QA and pushed to Tested or Live)
        let resolvedAction = null;
        (ticket.history || []).forEach(h => {
          const actLower = (h.action || '').toLowerCase();
          if (actLower.includes("to 'tested'") || actLower.includes("to 'live'")) {
            resolvedAction = h;
          }
        });

        const hasReachedTestedOrLive = Boolean(resolvedAction) || statusLower === 'tested' || statusLower === 'live';

        if (hasReachedTestedOrLive) {
          userResolvedTicketIds.add(ticket._id.toString());
          resolvedTicketsList.push({
            ticketId: ticket._id,
            task: ticket.task,
            projectName: projName,
            status: ticket.status,
            resolvedAt: resolvedAction?.timestamp || ticket.updatedAt,
            approvedBy: resolvedAction?.user || 'QA'
          });
        }

        // 3. Reopened by QA/PM/PC/Delivery Head back to In Progress / To Be Started
        let lastReopenAction = null;
        (ticket.history || []).forEach(h => {
          const actLower = (h.action || '').toLowerCase();
          if (actLower.includes("from 'ready for testing'") && 
             (actLower.includes("to 'in progress'") || actLower.includes("to 'to be started'"))) {
            lastReopenAction = h;
          }
        });

        if (lastReopenAction) {
          userReopenedTicketIds.add(ticket._id.toString());
          reopenedTicketsList.push({
            ticketId: ticket._id,
            task: ticket.task,
            projectName: projName,
            status: ticket.status,
            reopenedBy: lastReopenAction.user || 'QA/PM',
            reopenedAction: lastReopenAction.action || 'Reopened back to In Progress',
            reopenedAt: lastReopenAction.timestamp
          });
        }

        // 5. Missed Deadline Check
        if (ticket.deadline) {
          totalDeadlinesCount++;
          const deadlineTime = new Date(ticket.deadline).getTime();
          const now = Date.now();

          // Check if deadline was extended/changed
          let extendAction = null;
          (ticket.history || []).forEach(h => {
            const actLower = (h.action || '').toLowerCase();
            if (actLower.includes('deadline updated to') || actLower.includes('deadline changed')) {
              extendAction = h;
            }
          });

          const isCurrentlyResolved = statusLower === 'tested' || statusLower === 'live';

          let isMissed = false;
          let missedReason = '';

          if (extendAction) {
            isMissed = true;
            missedReason = `Deadline extended (${extendAction.action})`;
          } else if (!isCurrentlyResolved) {
            // Currently active on the board (To be started, In Progress, Ready for testing, etc.)
            if (now > deadlineTime) {
              isMissed = true;
              const overdueMins = Math.max(1, Math.round((now - deadlineTime) / 60000));
              missedReason = `Overdue by ${overdueMins >= 60 ? Math.round(overdueMins/60) + 'h' : overdueMins + 'm'} (currently in ${ticket.status})`;
            }
          } else {
            // Currently resolved (Tested / Live) - check when it was resolved
            let resolvedTime = null;
            (ticket.history || []).forEach(h => {
              const actLower = (h.action || '').toLowerCase();
              if (actLower.includes("to 'tested'") || actLower.includes("to 'live'")) {
                resolvedTime = new Date(h.timestamp).getTime();
              }
            });
            if (!resolvedTime && ticket.lastDeliveredAt) {
              resolvedTime = new Date(ticket.lastDeliveredAt).getTime();
            }
            if (resolvedTime && resolvedTime > deadlineTime) {
              isMissed = true;
              const delayMins = Math.max(1, Math.round((resolvedTime - deadlineTime) / 60000));
              missedReason = `Resolved ${delayMins >= 60 ? Math.round(delayMins/60) + 'h' : delayMins + 'm'} after deadline`;
            }
          }

          if (isMissed) {
            userMissedDeadlineTicketIds.add(ticket._id.toString());
            missedDeadlineTicketsList.push({
              ticketId: ticket._id,
              task: ticket.task,
              projectName: projName,
              status: ticket.status,
              deadline: ticket.deadline,
              missedReason
            });
          }
        }
      }
    });

    const totalAllocated = userAllocatedTicketIds.size;
    const totalResolved = userResolvedTicketIds.size;
    const totalReopened = Math.max(userReopenedTicketIds.size, devReopenedCount);
    const totalMissedDeadlines = userMissedDeadlineTicketIds.size;

    // 6. Performance Percentages
    const onTimePercentage = totalDeadlinesCount > 0
      ? Math.max(0, Math.min(100, Math.round(((totalDeadlinesCount - totalMissedDeadlines) / totalDeadlinesCount) * 100)))
      : 100;

    const baseDeliveredCount = Math.max(deliveredCount, totalResolved, 1);
    const reopenedPercentage = totalAllocated > 0
      ? Math.min(100, Math.round((totalReopened / baseDeliveredCount) * 100))
      : 0;

    const devPassRate = totalAllocated > 0
      ? Math.max(0, Math.min(100, Math.round(((totalAllocated - totalReopened) / totalAllocated) * 100)))
      : 100;

    const qaTotalActions = qaVerifiedCount + qaReopenedCount;
    const qaAccuracy = qaTotalActions > 0
      ? Math.max(0, Math.min(100, Math.round(((qaTotalActions - liveEscapedCount) / qaTotalActions) * 100)))
      : 100;

    // Calculate time tracking metrics
    const formatDuration = (seconds) => {
      if (!seconds || seconds <= 0) return '0m';
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      if (hrs > 0) {
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
      }
      if (mins > 0) {
        return secs > 0 && mins < 5 ? `${mins}m ${secs}s` : `${mins}m`;
      }
      return `${secs}s`;
    };

    let totalTimeSpentSeconds = 0;
    let trackedTicketsCount = 0;
    const ticketsTimeBreakdown = [];

    tickets.forEach(ticket => {
      const isDevTagged = devTag && ticket.tags?.some(t => t.toLowerCase() === devTag);
      const isUserProject = userProjects.some(p => p._id.toString() === ticket.project?._id?.toString());
      const matchingTrack = (ticket.timeTracking || []).find(tt => 
        (user._id && tt.userId && tt.userId.toString() === user._id.toString()) ||
        matchesUser(tt.user) || 
        matchesUser(tt.userEmail)
      );
      const hasUserHistory = (ticket.history || []).some(h => matchesUser(h.user));
      const isAllocated = (isDevTagged && isUserProject) || Boolean(matchingTrack) || hasUserHistory;

      if (isAllocated) {
        let ticketSeconds = 0;
        let lastActive = null;

        if (matchingTrack && matchingTrack.totalSeconds > 0) {
          ticketSeconds = matchingTrack.totalSeconds;
          lastActive = matchingTrack.lastActiveAt;
        } else if (ticket.resolutionSeconds > 0) {
          ticketSeconds = ticket.resolutionSeconds;
          lastActive = ticket.lastDeliveredAt || ticket.updatedAt;
        } else {
          // If ticket has lifecycle history of resolution / delivery, calculate duration
          let startT = null;
          let endT = null;
          (ticket.history || []).forEach(h => {
            const act = (h.action || '').toLowerCase();
            if (act.includes("to 'in progress'")) {
              if (!startT) startT = new Date(h.timestamp).getTime();
            }
            if (act.includes("to 'ready for testing'") || act.includes("to 'tested'") || act.includes("to 'live'")) {
              endT = new Date(h.timestamp).getTime();
            }
          });
          if (!startT) {
            startT = ticket.startedAt ? new Date(ticket.startedAt).getTime() : 
                     ticket.firstViewedAt ? new Date(ticket.firstViewedAt).getTime() : 
                     new Date(ticket.createdAt).getTime();
          }
          if (endT && endT > startT) {
            ticketSeconds = Math.max(60, Math.round((endT - startT) / 1000));
            lastActive = new Date(endT);
          }
        }

        if (ticketSeconds > 0) {
          totalTimeSpentSeconds += ticketSeconds;
          trackedTicketsCount++;
          ticketsTimeBreakdown.push({
            ticketId: ticket._id,
            task: ticket.task,
            ticketType: ticket.ticketType || 'Task',
            priority: ticket.priority || 'Medium',
            projectName: ticket.project?.name || 'Project',
            status: ticket.status,
            deadline: ticket.deadline,
            totalSeconds: ticketSeconds,
            formattedTime: formatDuration(ticketSeconds),
            lastActiveAt: lastActive || ticket.updatedAt || new Date()
          });
        }
      }
    });

    // Sort ticket breakdown by most recent activity
    ticketsTimeBreakdown.sort((a, b) => new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0));

    const avgTimePerTicketSeconds = trackedTicketsCount > 0 
      ? Math.round(totalTimeSpentSeconds / trackedTicketsCount) 
      : 0;
    const formattedAvgTime = trackedTicketsCount > 0 ? formatDuration(avgTimePerTicketSeconds) : '0m';
    const formattedTotalTime = trackedTicketsCount > 0 ? formatDuration(totalTimeSpentSeconds) : '0m';

    // Manager / PM Specific Calculations
    const pmCreatedTicketsList = [];
    tickets.forEach(ticket => {
      const isCreatedByPM = 
        matchesUser(ticket.reportedBy) ||
        matchesUser(ticket.reportedByEmail) ||
        (ticket.history || []).some(h => matchesUser(h.user) && (
          (h.action || '').toLowerCase().includes('created') ||
          (h.action || '').toLowerCase().includes('cr:')
        )) ||
        (userProjects.some(p => p._id.toString() === ticket.project?._id?.toString()) && matchesUser(ticket.history?.[0]?.user));

      if (isCreatedByPM) {
        pmCreatedTicketsList.push({
          ticketId: ticket._id,
          task: ticket.task,
          ticketType: ticket.ticketType || 'Task',
          priority: ticket.priority || 'Medium',
          projectName: ticket.project?.name || 'Project',
          status: ticket.status || 'To be started',
          deadline: ticket.deadline,
          createdAt: ticket.createdAt
        });
      }
    });

    pmCreatedTicketsList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const totalRevenueGenerated = userProjects.reduce((sum, p) => sum + (Number(p.totalRevenue) || 0), 0);
    const totalPaymentReceived = userProjects.reduce((sum, p) => sum + (Number(p.paymentReceived) || 0), 0);
    const totalPendingRevenue = userProjects.reduce((sum, p) => {
      if (p.pendingPayment !== undefined && p.pendingPayment !== null) {
        return sum + Number(p.pendingPayment);
      }
      return sum + Math.max(0, (Number(p.totalRevenue) || 0) - (Number(p.paymentReceived) || 0));
    }, 0);

    const pmProjectsList = userProjects.map(p => {
      const projTickets = tickets.filter(t => t.project?._id?.toString() === p._id.toString());
      const projCreatedTickets = pmCreatedTicketsList.filter(t => t.projectName === p.name);
      return {
        projectId: p._id,
        name: p.name,
        status: p.status,
        totalRevenue: p.totalRevenue || 0,
        paymentReceived: p.paymentReceived || 0,
        pendingPayment: p.pendingPayment !== undefined ? p.pendingPayment : Math.max(0, (p.totalRevenue || 0) - (p.paymentReceived || 0)),
        totalTickets: projTickets.length,
        pmTicketsCreated: projCreatedTickets.length,
        deliveryDate: p.deliveryDate
      };
    });

    // --- QA / TESTER SPECIFIC CALCULATIONS ---
    const qaTestedTicketsList = [];
    const qaBugsCaughtList = [];
    const qaSentBackList = [];
    const qaLeakedBugsList = [];
    const qaPostReleaseReopensList = [];
    const userProjectIds = new Set(userProjects.map(p => p._id.toString()));

    tickets.forEach(ticket => {
      const projName = ticket.project?.name || 'Project';
      const isUserProj = ticket.project?._id && userProjectIds.has(ticket.project._id.toString());
      const history = ticket.history || [];

      // 1. Tested & Verified by this QA (Moved to 'Tested' or 'Live')
      let testedAction = null;
      history.forEach(h => {
        const actLower = (h.action || '').toLowerCase();
        if (matchesUser(h.user) && (actLower.includes("to 'tested'") || actLower.includes("to 'live'"))) {
          testedAction = h;
        }
      });
      if (testedAction) {
        qaTestedTicketsList.push({
          ticketId: ticket._id,
          task: ticket.task,
          projectName: projName,
          status: ticket.status,
          priority: ticket.priority || 'Medium',
          action: testedAction.action,
          testedAt: testedAction.timestamp
        });
      }

      // 2. Bugs caught & reported by this QA
      const isBug = (ticket.ticketType || '').toLowerCase() === 'bug';
      const isCreatedByThisQA = 
        matchesUser(ticket.reportedBy) ||
        matchesUser(ticket.reportedByEmail) ||
        (history.some(h => matchesUser(h.user) && (
          (h.action || '').toLowerCase().includes('created') ||
          (h.action || '').toLowerCase().includes('cr:')
        )));

      if (isBug && isCreatedByThisQA) {
        qaBugsCaughtList.push({
          ticketId: ticket._id,
          task: ticket.task,
          projectName: projName,
          priority: ticket.priority || 'Medium',
          status: ticket.status,
          createdAt: ticket.createdAt,
          reportedBy: ticket.reportedBy || userName
        });
      }

      // 3. Sent back to Devs (Reopened from Ready for testing back to In progress / To be started by this QA)
      let sentBackAction = null;
      history.forEach(h => {
        const actLower = (h.action || '').toLowerCase();
        if (matchesUser(h.user) && actLower.includes("from 'ready for testing'") && 
           (actLower.includes("to 'in progress'") || actLower.includes("to 'to be started'"))) {
          sentBackAction = h;
        }
      });
      if (sentBackAction) {
        qaSentBackList.push({
          ticketId: ticket._id,
          task: ticket.task,
          projectName: projName,
          status: ticket.status,
          priority: ticket.priority || 'Medium',
          action: sentBackAction.action,
          reopenedAt: sentBackAction.timestamp
        });
      }

      // 4. Leaked Defect / Missed by QA (Bug logged by Non-QA on a project assigned to this QA)
      if (isBug && isUserProj && !isCreatedByThisQA) {
        const reportedRole = (ticket.reportedByRole || '').toLowerCase();
        const isReportedByQA = reportedRole.includes('qa') || reportedRole.includes('tester') || reportedRole.includes('quality');
        
        if (!isReportedByQA) {
          qaLeakedBugsList.push({
            ticketId: ticket._id,
            task: ticket.task,
            projectName: projName,
            priority: ticket.priority || 'Medium',
            status: ticket.status,
            reportedBy: ticket.reportedBy || 'PM / Client',
            reportedByRole: ticket.reportedByRole || 'Management / Client',
            createdAt: ticket.createdAt
          });
        }
      }

      // 5. Post-Release Reopens / Escaped Defect
      // QA previously moved to Tested/Live, but subsequently reopened by someone else
      if (testedAction) {
        let subsequentReopen = null;
        const testedTime = new Date(testedAction.timestamp).getTime();
        history.forEach(h => {
          const actLower = (h.action || '').toLowerCase();
          const hTime = new Date(h.timestamp).getTime();
          if (hTime > testedTime && (actLower.includes("from 'tested'") || actLower.includes("from 'live'")) &&
             (actLower.includes("to 'in progress'") || actLower.includes("to 'to be started'"))) {
            subsequentReopen = h;
          }
        });
        if (subsequentReopen) {
          qaPostReleaseReopensList.push({
            ticketId: ticket._id,
            task: ticket.task,
            projectName: projName,
            status: ticket.status,
            priority: ticket.priority || 'Medium',
            approvedAt: testedAction.timestamp,
            reopenedBy: subsequentReopen.user || 'PM / Client',
            reopenedAction: subsequentReopen.action,
            reopenedAt: subsequentReopen.timestamp
          });
        }
      }
    });

    const qaTestedCount = qaTestedTicketsList.length;
    const qaBugsCaughtCount = qaBugsCaughtList.length;
    const qaSentBackCount = qaSentBackList.length;
    const qaLeakedBugsCount = qaLeakedBugsList.length;
    const qaPostReleaseReopensCount = qaPostReleaseReopensList.length;

    // QA 3-Pillar Formula calculations
    const totalQABugs = qaBugsCaughtCount + qaLeakedBugsCount;
    const qaDefectCatchingRate = totalQABugs > 0 
      ? Math.round((qaBugsCaughtCount / totalQABugs) * 100) 
      : 100;

    const qaSignOffAccuracy = qaTestedCount > 0 
      ? Math.max(0, Math.round((1 - (qaPostReleaseReopensCount / qaTestedCount)) * 100)) 
      : 100;

    const qaReadyQueueCount = tickets.filter(t => 
      t.status?.toLowerCase() === 'ready for testing' && userProjectIds.has(t.project?._id?.toString())
    ).length;

    const totalQATestingDemand = qaTestedCount + qaReadyQueueCount;
    const qaTestingVelocity = totalQATestingDemand > 0 
      ? Math.round((qaTestedCount / totalQATestingDemand) * 100) 
      : 100;

    const qaPerformanceScore = Math.round(
      (0.40 * qaDefectCatchingRate) + 
      (0.35 * qaSignOffAccuracy) + 
      (0.25 * qaTestingVelocity)
    );

    const liveProjectsManaged = userProjects.filter(p => p.status === 'Live').length;
    const activeTicketsCount = tickets.filter(t => 
      t.status?.toLowerCase() === 'in progress' && (devTag ? t.tags?.some(tag => tag.toLowerCase() === devTag) : true)
    ).length;

    // --- QA Testing Turnaround Time Tracking ---
    const isQAPerson = (userRole || '').toLowerCase().includes('qa') || 
                       (userRole || '').toLowerCase().includes('quality') || 
                       (userRole || '').toLowerCase().includes('tester');

    let qaTotalTimeSpentSeconds = 0;
    let qaTrackedCount = 0;
    const qaTicketsTimeBreakdown = [];

    qaTestedTicketsList.forEach(item => {
      const ticket = tickets.find(t => t._id.toString() === item.ticketId.toString());
      if (ticket) {
        let qaSeconds = 0;
        const matchingTrack = (ticket.timeTracking || []).find(tt => 
          (user._id && tt.userId && tt.userId.toString() === user._id.toString()) ||
          matchesUser(tt.user) || 
          matchesUser(tt.userEmail)
        );
        if (matchingTrack && matchingTrack.totalSeconds > 0) {
          qaSeconds = matchingTrack.totalSeconds;
        } else {
          // Lifecycle duration: From when ticket entered 'Ready for testing' until QA tested it
          const history = ticket.history || [];
          let readyForTestingTime = null;
          const testedTime = new Date(item.testedAt).getTime();
          for (let i = history.length - 1; i >= 0; i--) {
            const h = history[i];
            const act = (h.action || '').toLowerCase();
            const hTime = new Date(h.timestamp).getTime();
            if (hTime <= testedTime && act.includes("to 'ready for testing'")) {
              readyForTestingTime = hTime;
              break;
            }
          }
          if (readyForTestingTime && testedTime > readyForTestingTime) {
            qaSeconds = Math.max(60, Math.round((testedTime - readyForTestingTime) / 1000));
          } else {
            qaSeconds = 600; // 10 min standard testing cycle
          }
        }

        if (qaSeconds > 0) {
          qaTotalTimeSpentSeconds += qaSeconds;
          qaTrackedCount++;
          qaTicketsTimeBreakdown.push({
            ticketId: ticket._id,
            task: ticket.task,
            ticketType: ticket.ticketType || 'Task',
            priority: ticket.priority || 'Medium',
            projectName: ticket.project?.name || 'Project',
            status: ticket.status,
            deadline: ticket.deadline,
            totalSeconds: qaSeconds,
            formattedTime: formatDuration(qaSeconds),
            lastActiveAt: item.testedAt || new Date()
          });
        }
      }
    });

    qaTicketsTimeBreakdown.sort((a, b) => (b.totalSeconds || 0) - (a.totalSeconds || 0));

    const qaAvgTimePerTicketSeconds = qaTrackedCount > 0 
      ? Math.round(qaTotalTimeSpentSeconds / qaTrackedCount) 
      : 0;
    const qaFormattedAvgTime = qaTrackedCount > 0 ? formatDuration(qaAvgTimePerTicketSeconds) : '0m';
    const qaFormattedTotalTime = qaTrackedCount > 0 ? formatDuration(qaTotalTimeSpentSeconds) : '0m';

    // Construct Scorecard Object (Sanitize Time Fields for Non-Executives)
    const scorecardDetails = {
      allocated: allocatedTicketsList,
      resolved: resolvedTicketsList,
      reopened: reopenedTicketsList,
      missedDeadlines: missedDeadlineTicketsList
    };
    if (isDeliveryOrCeo) {
      scorecardDetails.timeSpent = isQAPerson ? qaTicketsTimeBreakdown : ticketsTimeBreakdown;
    }

    const scorecardObj = {
      totalAllocated,
      totalResolved,
      totalReopened,
      totalMissedDeadlines,
      totalDeadlinesCount,
      onTimePercentage,
      reopenedPercentage,
      details: scorecardDetails
    };

    if (isDeliveryOrCeo) {
      if (isQAPerson) {
        scorecardObj.totalTimeSpentSeconds = qaTotalTimeSpentSeconds;
        scorecardObj.formattedTotalTime = qaFormattedTotalTime;
        scorecardObj.avgTimePerTicketSeconds = qaAvgTimePerTicketSeconds;
        scorecardObj.formattedAvgTime = qaFormattedAvgTime;
      } else {
        scorecardObj.totalTimeSpentSeconds = totalTimeSpentSeconds;
        scorecardObj.formattedTotalTime = formattedTotalTime;
        scorecardObj.avgTimePerTicketSeconds = avgTimePerTicketSeconds;
        scorecardObj.formattedAvgTime = formattedAvgTime;
      }
    }

    // Construct Developer Metrics Object
    const developerObj = {
      deliveredCount,
      reopenedCount: totalReopened,
      passRatePercent: devPassRate,
      activeTicketsCount
    };

    if (isDeliveryOrCeo) {
      developerObj.totalTimeSpentSeconds = totalTimeSpentSeconds;
      developerObj.formattedTotalTime = formattedTotalTime;
      developerObj.avgTimePerTicketSeconds = avgTimePerTicketSeconds;
      developerObj.formattedAvgTime = formattedAvgTime;
      developerObj.trackedTicketsCount = trackedTicketsCount;
      developerObj.ticketsTimeBreakdown = ticketsTimeBreakdown;
    }

    // Construct QA Metrics Object
    const qaObj = {
      score: qaPerformanceScore,
      defectCatchingRate: qaDefectCatchingRate,
      signOffAccuracy: qaSignOffAccuracy,
      testingVelocity: qaTestingVelocity,
      testedCount: qaTestedCount,
      bugsCaughtCount: qaBugsCaughtCount,
      sentBackCount: qaSentBackCount,
      leakedBugsCount: qaLeakedBugsCount,
      postReleaseReopensCount: qaPostReleaseReopensCount,
      readyQueueCount: qaReadyQueueCount,
      details: {
        tested: qaTestedTicketsList,
        bugsCaught: qaBugsCaughtList,
        sentBack: qaSentBackList,
        leakedBugs: qaLeakedBugsList,
        postReleaseReopens: qaPostReleaseReopensList
      }
    };

    if (isDeliveryOrCeo) {
      qaObj.formattedAvgTime = qaFormattedAvgTime;
      qaObj.avgTimePerTicketSeconds = qaAvgTimePerTicketSeconds;
      qaObj.totalTimeSpentSeconds = qaTotalTimeSpentSeconds;
      qaObj.formattedTotalTime = qaFormattedTotalTime;
      qaObj.ticketsTimeBreakdown = qaTicketsTimeBreakdown;
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      metrics: {
        scorecard: scorecardObj,
        developer: developerObj,
        qa: qaObj,
        manager: {
          ticketsCreatedCount: pmCreatedTicketsList.length,
          totalRevenueGenerated,
          paymentReceived: totalPaymentReceived,
          pendingRevenue: totalPendingRevenue,
          projectsCount: userProjects.length,
          liveProjectsCount: liveProjectsManaged,
          createdTickets: pmCreatedTicketsList,
          projects: pmProjectsList
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
