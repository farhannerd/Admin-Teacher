const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const port = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/teachers", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

// Teacher schema and model
const teacherSchema = new mongoose.Schema({
  name: String,
  joiningDate: String,
  password: String,
  birthDate: String,
  streams: [String],
  subjects: [String],
  registerNumber: String,
  mcaTeacher: { type: Boolean, default: false }, // Changed to Boolean
});

const Teacher = mongoose.model("Teacher", teacherSchema);

const adminSchema = new mongoose.Schema({
  adminId: String,
  password: String,
});

const Admin = mongoose.model("Admin", adminSchema);

// // Prepopulate with 5 admins (run this only once)
const createAdmins = async () => {
  const admins = [
    { adminId: "admin01", password: await bcrypt.hash("password01", 10) },
    { adminId: "admin02", password: await bcrypt.hash("password02", 10) },
    { adminId: "admin03", password: await bcrypt.hash("password03", 10) },
    { adminId: "admin04", password: await bcrypt.hash("password04", 10) },
    { adminId: "admin05", password: await bcrypt.hash("password05", 10) },
  ];

  await Admin.insertMany(admins);
  console.log("Admin accounts created");
};
// Uncomment this line to create the admins (run this once and then comment it back)
// createAdmins();


// Helper function to generate register number
const generateRegisterNumber = async (joiningYear, streamCodes) => {
  const sumStreamCodes = streamCodes.reduce((sum, code) => sum + parseInt(code), 0);
  const sumStr = sumStreamCodes.toString().padStart(2, "0").slice(-2); // Take the last two digits of the sum

  const count = (await Teacher.countDocuments({})) + 1;
  const countStr = count.toString().padStart(4, "0");
  return `${joiningYear}${sumStr}${countStr}`;
};

// Ensure you have this endpoint in your Express server
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find({});
    res.status(200).json({ teachers });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Error fetching teachers data" });
  }
});


// Endpoint to register a teacher
app.post("/api/register-teacher", async (req, res) => {
  const { name, joiningDate, password, birthDate, streams, subjects } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const joiningYear = joiningDate.slice(0, 4);

    const streamCodeMap = {
      BTech: "06",
      MCA: "07",
      MBA: "05",
      BArch: "08",
      BA: "09",
      MTech: "10",
    };

    // Map selected streams to their respective codes
    const selectedStreamCodes = streams.map(stream => streamCodeMap[stream] || "00");

    const registerNumber = await generateRegisterNumber(joiningYear, selectedStreamCodes);

    const newTeacher = new Teacher({
      name,
      joiningDate,
      password: hashedPassword, // Store the hashed password
      birthDate,
      streams,
      subjects,
      registerNumber,
    });

    await newTeacher.save();
    res
      .status(201)
      .json({ message: "Teacher registered successfully", registerNumber });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering teacher" });
  }
});

// Endpoint to sign in a teacher
app.post('/api/signin-teacher', async (req, res) => {
  const { registerNumber, password } = req.body;

  try {
    const teacher = await Teacher.findOne({ registerNumber });
    if (!teacher) {
      return res.status(400).json({ success: false, message: 'Invalid registration number or password.' });
    }

    // Compare provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid registration number or password.' });
    }

    res.status(200).json({ success: true, message: 'Sign-in successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// Endpoint to fetch teacher data by registration number
app.get("/api/teacher/:registerNumber", async (req, res) => {
  const { registerNumber } = req.params;

  try {
    const teacher = await Teacher.findOne({ registerNumber });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.status(200).json(teacher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching teacher data" });
  }
});


// Endpoint to give authentication to the admin
app.post("/api/admin-auth", async (req, res) => {
  const { adminId, adminPassword } = req.body;

  try {
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(400).json({ success: false, message: "Invalid admin ID or password" });
    }

    const isMatch = await bcrypt.compare(adminPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid admin ID or password" });
    }

    const teachers = await Teacher.find({});
    res.status(200).json({ success: true, teachers });
  } catch (error) {
    console.error("Error authenticating admin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Endpoint to edit a teacher
app.put("/api/teacher/:registerNumber", async (req, res) => {
  const { registerNumber } = req.params;
  const updatedData = req.body;

  try {
    const teacher = await Teacher.findOneAndUpdate({ registerNumber }, updatedData, { new: true });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.status(200).json({ message: "Teacher updated successfully", teacher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating teacher" });
  }
});

// Endpoint to delete a teacher
app.delete("/api/teacher/:registerNumber", async (req, res) => {
  const { registerNumber } = req.params;

  try {
    const teacher = await Teacher.findOneAndDelete({ registerNumber });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.status(200).json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting teacher" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
