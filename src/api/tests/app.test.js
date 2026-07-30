const request = require('supertest');
const app = require('../app');
const db = require('../db');

jest.mock('../db', () => ({
  query: jest.fn(),
}));

beforeEach(() => {
  db.query.mockReset();
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
describe('GET /health', () => {
  it('returns { status: "ok" } with HTTP 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// GET /tasks
// ---------------------------------------------------------------------------
describe('GET /tasks', () => {
  it('returns an array of tasks from the database', async () => {
    const mockTasks = [
      { id: 1, title: 'Buy milk', completed: false, created_at: '2024-01-01' },
      { id: 2, title: 'Walk dog', completed: true,  created_at: '2024-01-02' },
    ];
    db.query.mockResolvedValueOnce({ rows: mockTasks });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTasks);
    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM tasks ORDER BY created_at ASC'
    );
  });

  it('returns an empty array when there are no tasks', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /tasks
// ---------------------------------------------------------------------------
describe('POST /tasks', () => {
  it('creates a task and returns 201 with the new row', async () => {
    const newTask = { id: 3, title: 'Read book', completed: false, created_at: '2024-01-03' };
    db.query.mockResolvedValueOnce({ rows: [newTask] });

    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Read book' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newTask);
    expect(db.query).toHaveBeenCalledWith(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      ['Read book']
    );
  });

  it('trims whitespace from the title before inserting', async () => {
    const newTask = { id: 4, title: 'Trimmed', completed: false, created_at: '2024-01-04' };
    db.query.mockResolvedValueOnce({ rows: [newTask] });

    const res = await request(app)
      .post('/tasks')
      .send({ title: '  Trimmed  ' });

    expect(res.status).toBe(201);
    expect(db.query).toHaveBeenCalledWith(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      ['Trimmed']
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('returns 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });

  it('returns 400 when title is only whitespace', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });

  it('returns 400 when title is not a string', async () => {
    const res = await request(app).post('/tasks').send({ title: 42 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });
});

// ---------------------------------------------------------------------------
// PATCH /tasks/:id
// ---------------------------------------------------------------------------
describe('PATCH /tasks/:id', () => {
  const existingTask = { id: 1, title: 'Buy milk', completed: false, created_at: '2024-01-01' };

  it('marks a task as completed', async () => {
    const updatedTask = { ...existingTask, completed: true };
    db.query
      .mockResolvedValueOnce({ rows: [existingTask] })   // SELECT
      .mockResolvedValueOnce({ rows: [updatedTask] });    // UPDATE

    const res = await request(app)
      .patch('/tasks/1')
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedTask);
  });

  it('renames a task', async () => {
    const updatedTask = { ...existingTask, title: 'Buy oat milk' };
    db.query
      .mockResolvedValueOnce({ rows: [existingTask] })
      .mockResolvedValueOnce({ rows: [updatedTask] });

    const res = await request(app)
      .patch('/tasks/1')
      .send({ title: 'Buy oat milk' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedTask);
  });

  it('updates both title and completed in one request', async () => {
    const updatedTask = { ...existingTask, title: 'Buy oat milk', completed: true };
    db.query
      .mockResolvedValueOnce({ rows: [existingTask] })
      .mockResolvedValueOnce({ rows: [updatedTask] });

    const res = await request(app)
      .patch('/tasks/1')
      .send({ title: 'Buy oat milk', completed: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedTask);
  });

  it('returns 404 when the task does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch('/tasks/999')
      .send({ completed: true });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('preserves existing values when no fields are sent', async () => {
    const updatedTask = { ...existingTask };
    db.query
      .mockResolvedValueOnce({ rows: [existingTask] })
      .mockResolvedValueOnce({ rows: [updatedTask] });

    const res = await request(app)
      .patch('/tasks/1')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedTask);
    // Verify the UPDATE was called with the original values
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE tasks SET completed = $1, title = $2 WHERE id = $3 RETURNING *',
      [existingTask.completed, existingTask.title, 1]
    );
  });
});
