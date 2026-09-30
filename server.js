import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const employees = new Map([
  ["1001", { id: 1, code: "1001", name: "Иванов Иван" }],
  ["1002", { id: 2, code: "1002", name: "Петров Петр" }],
  ["1003", { id: 3, code: "1003", name: "Сидорова Анна" }]
]);

const shifts = [
  { id: 1, date: "2026-10-01", start: "10:00", end: "14:00", capacity: 3 },
  { id: 2, date: "2026-10-01", start: "14:00", end: "18:00", capacity: 2 },
  { id: 3, date: "2026-10-02", start: "09:00", end: "13:00", capacity: 4 }
];

const bookings = [];

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/login", (req, res) => {
  const employee = employees.get(String(req.body?.code || "").trim());
  if (!employee) return res.status(401).json({ ok: false, error: "Код не найден." });
  res.json({ ok: true, employee });
});

app.get("/api/shifts", (req, res) => {
  res.json({
    ok: true,
    shifts: shifts.map(s => {
      const booked = bookings.filter(b => b.shiftId === s.id && b.status === "active").length;
      return { ...s, booked, remaining: Math.max(0, s.capacity - booked), available: booked < s.capacity };
    })
  });
});

app.post("/api/book", (req, res) => {
  const employeeId = Number(req.body?.employeeId);
  const shiftId = Number(req.body?.shiftId);
  const employee = [...employees.values()].find(e => e.id === employeeId);
  const shift = shifts.find(s => s.id === shiftId);

  if (!employee || !shift) return res.status(400).json({ ok: false, error: "Сотрудник или смена не найдены." });

  if (bookings.some(b => b.employeeId === employeeId && b.shiftId === shiftId && b.status === "active")) {
    return res.status(409).json({ ok: false, error: "Вы уже записаны на эту смену." });
  }

  const booked = bookings.filter(b => b.shiftId === shiftId && b.status === "active").length;
  if (booked >= shift.capacity) {
    return res.status(409).json({ ok: false, error: "Свободных мест больше нет." });
  }

  bookings.push({ id: bookings.length + 1, employeeId, shiftId, status: "active", createdAt: new Date().toISOString() });
  res.json({ ok: true, message: "Вы успешно записались на смену." });
});

app.get("/api/my-bookings", (req, res) => {
  const employeeId = Number(req.query.employeeId);
  const result = bookings
    .filter(b => b.employeeId === employeeId && b.status === "active")
    .map(b => ({ ...b, shift: shifts.find(s => s.id === b.shiftId) }));
  res.json({ ok: true, bookings: result });
});

const port = process.env.PORT || 3000;
if (process.env.VERCEL !== "1") app.listen(port, () => console.log("Listening on " + port));

export default app;
