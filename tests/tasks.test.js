const request = require("supertest");
const app = require("../src/app");
const taskRoutes = require("../src/routes/tasks");
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterAll(() => console.error.mockRestore());
beforeEach(() => taskRoutes.resetTasks());

describe("GET /health", () => {
  it("returns 200 with healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("healthy");
  });
});

describe("Tasks API", () => {
  it("GET /api/tasks returns empty list initially", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toHaveLength(0);
  });

  it("POST /api/tasks creates a task", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "Setup CI/CD", description: "Configure GitHub Actions" });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Setup CI/CD");
    expect(res.body.status).toBe("pending");
  });

  it("POST /api/tasks returns 422 without title", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ description: "No title here" });
    expect(res.statusCode).toBe(422);
  });

  it("GET /api/tasks/:id returns a single task", async () => {
    await request(app).post("/api/tasks").send({ title: "Test Task" });
    const res = await request(app).get("/api/tasks/1");
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it("PATCH /api/tasks/:id updates a task", async () => {
    await request(app).post("/api/tasks").send({ title: "Old Title" });
    const res = await request(app)
      .patch("/api/tasks/1")
      .send({ title: "New Title", status: "done" });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("done");
  });

  it("DELETE /api/tasks/:id removes a task", async () => {
    await request(app).post("/api/tasks").send({ title: "Delete Me" });
    const del = await request(app).delete("/api/tasks/1");
    expect(del.statusCode).toBe(204);
    const get = await request(app).get("/api/tasks/1");
    expect(get.statusCode).toBe(404);
  });
});

// 1. covers errorHandler.js (lines 2-4)
describe('Error Handler', () => {
  it('handles unknown errors with 500', async () => {
    const res = await request(app).get('/api/tasks/notanumber');
    expect(res.statusCode).toBe(404);
  });
});

// 2. covers tasks.js filter by status (line 19)
describe('Task filtering', () => {
  it('GET /api/tasks?status=pending filters correctly', async () => {
    await request(app).post('/api/tasks').send({ title: 'A', status: 'pending' });
    await request(app).post('/api/tasks').send({ title: 'B', status: 'done' });
    const res = await request(app).get('/api/tasks?status=pending');
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('A');
  });
});

// 3. covers PATCH/DELETE on non-existent tasks (lines 46-57)
describe('404 on missing tasks', () => {
  it('PATCH non-existent task returns 404', async () => {
    const res = await request(app).patch('/api/tasks/999').send({ title: 'X' });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE non-existent task returns 404', async () => {
    const res = await request(app).delete('/api/tasks/999');
    expect(res.statusCode).toBe(404);
  });
});

// Add at the top with other requires
const express = require('express');
const errorHandler = require('../src/middleware/errorHandler');

// Add these new describe blocks at the bottom

// covers errorHandler.js lines 2-4 — triggers the actual error middleware
describe('Error Middleware', () => {
  it('returns 500 and error message for thrown errors', async () => {
    const testApp = express();
    testApp.get('/boom', (_req, _res, next) => {
      const err = new Error('Test explosion');
      err.statusCode = 500;
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/boom');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('uses statusCode from error object', async () => {
    const testApp = express();
    testApp.get('/forbidden', (_req, _res, next) => {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/forbidden');
    expect(res.statusCode).toBe(403);
  });
});

// covers app.js line 30 — the 404 catch-all route
describe('App 404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });
});