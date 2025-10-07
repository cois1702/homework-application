const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow inline scripts (fix CSP issue)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  next();
});

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve frontend files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// ✅ File upload setup
const upload = multer({ dest: 'uploads/' });

// ✅ Path to JSON database
const dbPath = path.join(__dirname, 'db.json');

// ✅ Read tasks safely
function readTasks() {
  try {
    if (!fs.existsSync(dbPath)) return [];
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error("Error reading tasks:", err);
    return [];
  }
}

// ✅ Write tasks safely
function writeTasks(tasks) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error("Error writing tasks:", err);
  }
}

// ✅ API Routes

// Get all tasks
app.get('/api/task', (req, res) => {
  const tasks = readTasks();
  res.json(tasks);
});

// Add new task
app.post('/api/task', (req, res) => {
  const tasks = readTasks();
  const newTask = { id: Date.now(), ...req.body };
  tasks.push(newTask);
  writeTasks(tasks);
  res.status(201).json(newTask);
});

// Delete a task
app.delete('/api/task/:id', (req, res) => {
  let tasks = readTasks();
  tasks = tasks.filter(task => task.id !== parseInt(req.params.id));
  writeTasks(tasks);
  res.json({ success: true });
});

// Upload file route (optional)
app.post('/api/upload', upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded successfully', file: req.file });
});

// ✅ Fallback route - serve index.html for all other paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
