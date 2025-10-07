const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- Persistent DB ----------------
const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
    if (!fs.existsSync(DB_FILE)) return { teachers: [], tasks: [], announcements: [] };
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---------------- Teacher Routes ----------------
// Only admins can add teachers
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.json({ error: 'Fill all fields' });

    const database = readDB();
    if (database.teachers.find(t => t.email === email)) return res.json({ error: 'Email already exists' });

    const newTeacher = { id: Date.now().toString(), name, email, password };
    database.teachers.push(newTeacher);
    writeDB(database);

    res.json({ message: 'Teacher registered!' });
});

// Teacher login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const database = readDB();
    const user = database.teachers.find(t => t.email === email && t.password === password);
    if (!user) return res.json({ error: 'Invalid credentials' });

    res.json({ user }); // no token returned
});

// ---------------- Task Routes ----------------
app.post('/task', (req, res) => {
    const { grade, classLetter, subject, description, dueDate, teacher } = req.body;
    if (!grade || !classLetter || !subject || !description || !dueDate || !teacher) return res.json({ error: 'Fill all fields' });

    const database = readDB();
    const newTask = {
        id: Date.now().toString(),
        grade,
        classLetter,
        subject,
        description,
        dueDate,
        done: false,
        teacher,
        createdAt: new Date().toISOString()
    };

    database.tasks.push(newTask);
    writeDB(database);
    res.json({ message: 'Task added!' });
});

app.put('/task/:id/done', (req, res) => {
    const database = readDB();
    const task = database.tasks.find(t => t.id === req.params.id);
    if (!task) return res.json({ error: 'Task not found' });

    task.done = !task.done;
    writeDB(database);
    res.json({ message: 'Task updated!' });
});

app.delete('/task/:id', (req, res) => {
    const database = readDB();
    const index = database.tasks.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.json({ error: 'Task not found' });

    database.tasks.splice(index, 1);
    writeDB(database);
    res.json({ message: 'Task deleted!' });
});

app.get('/tasks', (req, res) => {
    const database = readDB();
    res.json(database.tasks);
});

// ---------------- Announcement Routes ----------------
app.post('/announcement', (req, res) => {
    const { grade, classLetter, message, teacher } = req.body;
    if (!message || !grade || !classLetter || !teacher) return res.json({ error: 'Fill all fields' });

    const database = readDB();
    const newAnnouncement = {
        id: Date.now().toString(),
        grade,
        classLetter,
        message,
        teacher,
        createdAt: new Date().toISOString()
    };

    database.announcements.push(newAnnouncement);
    writeDB(database);
    res.json({ message: 'Announcement added!' });
});

app.get('/announcements', (req, res) => {
    const database = readDB();
    res.json(database.announcements);
});

app.delete('/announcement/:id', (req, res) => {
    const database = readDB();
    const index = database.announcements.findIndex(a => a.id === req.params.id);
    if (index === -1) return res.json({ error: 'Announcement not found' });

    database.announcements.splice(index, 1);
    writeDB(database);
    res.json({ message: 'Announcement deleted!' });
});

// ---------------- Reset Teacher Password ----------------
app.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.json({ error: 'Fill all fields' });

    const database = readDB();
    const teacher = database.teachers.find(t => t.email === email);
    if (!teacher) return res.json({ error: 'Teacher not found' });

    teacher.password = newPassword;
    writeDB(database);
    res.json({ message: 'Password reset successfully!' });
});

// ---------------- Cleanup Old Tasks & Announcements ----------------
function cleanupOldTasksAndAnnouncements() {
    const database = readDB();
    const today = new Date().toISOString().split('T')[0];

    database.tasks = database.tasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return !isNaN(taskDate) && taskDate.toISOString().split('T')[0] >= today;
    });

    database.announcements = database.announcements.filter(a => {
        const annDate = new Date(a.createdAt);
        return !isNaN(annDate) && annDate.toISOString().split('T')[0] >= today;
    });

    writeDB(database);
}

setInterval(cleanupOldTasksAndAnnouncements, 24 * 60 * 60 * 1000);
cleanupOldTasksAndAnnouncements();

// ---------------- Start server ----------------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
