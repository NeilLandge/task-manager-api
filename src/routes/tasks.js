const express = require("express");
const { body, param, validationResult } = require("express-validator");
const router = express.Router();

let tasks = [];
let nextId = 1;

const validateTask = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").optional().trim(),
  body("status")
    .optional()
    .isIn(["pending", "in-progress", "done"])
    .withMessage("Status must be pending, in-progress, or done")
];

router.get("/", (req, res) => {
  const { status } = req.query;
  const result = status ? tasks.filter(t => t.status === status) : tasks;
  res.json({ tasks: result, total: result.length });
});

router.get("/:id", param("id").isInt(), (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

router.post("/", validateTask, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const task = {
    id: nextId++,
    title: req.body.title,
    description: req.body.description || "",
    status: req.body.status || "pending",
    createdAt: new Date().toISOString()
  };
  tasks.push(task);
  res.status(201).json(task);
});

router.patch("/:id", validateTask, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Task not found" });

  tasks[index] = { ...tasks[index], ...req.body, updatedAt: new Date().toISOString() };
  res.json(tasks[index]);
});

router.delete("/:id", (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Task not found" });

  tasks.splice(index, 1);
  res.status(204).send();
});

router.resetTasks = () => { tasks = []; nextId = 1; };

module.exports = router;
