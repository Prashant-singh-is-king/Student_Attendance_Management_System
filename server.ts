import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

// Initialize Database
const db = new Database("attendance.db");

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'teacher')) NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    teacher_id INTEGER,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    roll_number TEXT UNIQUE NOT NULL,
    email TEXT,
    photo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    student_id INTEGER,
    class_id INTEGER,
    PRIMARY KEY (student_id, class_id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    class_id INTEGER,
    date TEXT NOT NULL,
    status TEXT CHECK(status IN ('present', 'absent')) NOT NULL,
    UNIQUE(student_id, class_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run(
    "admin",
    hashedPassword,
    "admin",
    "System Administrator"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Students
  app.get("/api/students", (req, res) => {
    const students = db.prepare("SELECT * FROM students").all();
    res.json(students);
  });

  app.post("/api/students", (req, res) => {
    const { name, roll_number, email, photo_url } = req.body;
    try {
      const result = db.prepare("INSERT INTO students (name, roll_number, email, photo_url) VALUES (?, ?, ?, ?)").run(name, roll_number, email, photo_url);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Roll number already exists" });
    }
  });

  app.put("/api/students/:id", (req, res) => {
    const { name, roll_number, email, photo_url } = req.body;
    db.prepare("UPDATE students SET name = ?, roll_number = ?, email = ?, photo_url = ? WHERE id = ?").run(name, roll_number, email, photo_url, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/students/:id", (req, res) => {
    db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM enrollments WHERE student_id = ?").run(req.params.id);
    db.prepare("DELETE FROM attendance WHERE student_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Classes
  app.get("/api/classes", (req, res) => {
    const classes = db.prepare(`
      SELECT classes.*, users.name as teacher_name 
      FROM classes 
      LEFT JOIN users ON classes.teacher_id = users.id
    `).all();
    res.json(classes);
  });

  app.post("/api/classes", (req, res) => {
    const { name, teacher_id } = req.body;
    const result = db.prepare("INSERT INTO classes (name, teacher_id) VALUES (?, ?)").run(name, teacher_id);
    res.json({ id: result.lastInsertRowid });
  });

  // Enrollments
  app.get("/api/classes/:id/students", (req, res) => {
    const students = db.prepare(`
      SELECT students.* 
      FROM students 
      JOIN enrollments ON students.id = enrollments.student_id 
      WHERE enrollments.class_id = ?
    `).all(req.params.id);
    res.json(students);
  });

  app.post("/api/classes/:id/enroll", (req, res) => {
    const { student_id } = req.body;
    try {
      db.prepare("INSERT INTO enrollments (student_id, class_id) VALUES (?, ?)").run(student_id, req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Student already enrolled" });
    }
  });

  app.post("/api/classes/:id/enroll-bulk", (req, res) => {
    const { student_ids } = req.body;
    const class_id = req.params.id;
    const insert = db.prepare("INSERT OR IGNORE INTO enrollments (student_id, class_id) VALUES (?, ?)");
    const transaction = db.transaction((ids) => {
      for (const id of ids) insert.run(id, class_id);
    });
    transaction(student_ids);
    res.json({ success: true });
  });

  // Attendance
  app.get("/api/attendance", (req, res) => {
    const { class_id, date } = req.query;
    let query = "SELECT * FROM attendance";
    let params = [];
    if (class_id && date) {
      query += " WHERE class_id = ? AND date = ?";
      params = [class_id, date];
    } else if (class_id) {
      query += " WHERE class_id = ?";
      params = [class_id];
    }
    const attendance = db.prepare(query).all(...params);
    res.json(attendance);
  });

  app.post("/api/attendance", (req, res) => {
    const { class_id, date, records } = req.body; // records: [{student_id, status}]
    const insert = db.prepare("INSERT OR REPLACE INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?)");
    const transaction = db.transaction((recs) => {
      for (const rec of recs) insert.run(rec.student_id, class_id, date, rec.status);
    });
    transaction(records);
    res.json({ success: true });
  });

  // Analytics
  app.get("/api/stats", (req, res) => {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get().count;
    const totalClasses = db.prepare("SELECT COUNT(*) as count FROM classes").get().count;
    const today = new Date().toISOString().split('T')[0];
    const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'present'").get(today).count;
    
    // Overall attendance percentage
    const totalAttendanceRecords = db.prepare("SELECT COUNT(*) as count FROM attendance").get().count;
    const totalPresentRecords = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE status = 'present'").get().count;
    const overallPercentage = totalAttendanceRecords > 0 ? ((totalPresentRecords / totalAttendanceRecords) * 100).toFixed(1) : 0;

    res.json({ totalStudents, totalClasses, presentToday, overallPercentage });
  });

  app.get("/api/teachers", (req, res) => {
    const teachers = db.prepare("SELECT id, name FROM users WHERE role = 'teacher'").all();
    res.json(teachers);
  });

  app.post("/api/teachers", (req, res) => {
    const { username, password, name } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, 'teacher', ?)").run(username, hashedPassword, name);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.delete("/api/teachers/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ? AND role = 'teacher'").run(req.params.id);
    db.prepare("UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
