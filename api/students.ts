import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db.js';
import { sendSuccess, sendError, sendNotFound, handleError, createId, parseQueryParam } from './utils.js';
import type { Student } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method } = req;
    
    if (method === 'GET') {
      return await handleGetStudents(req, res);
    } else if (method === 'POST') {
      return await handleCreateStudent(req, res);
    } else if (method === 'PATCH') {
      return await handleUpdateStudent(req, res);
    } else if (method === 'DELETE') {
      return await handleDeleteStudent(req, res);
    } else {
      sendError(res, 'Method not allowed', 405);
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function handleGetStudents(req: VercelRequest, res: VercelResponse) {
  const includeInactive = parseQueryParam(req.query.includeInactive) === 'true';
  
  const sql = includeInactive
    ? 'SELECT id, name, active, created_at as "createdAt", updated_at as "updatedAt" FROM students ORDER BY created_at'
    : 'SELECT id, name, active, created_at as "createdAt", updated_at as "updatedAt" FROM students WHERE active = true ORDER BY created_at';
  
  const students = await query<Student>(sql);
  sendSuccess(res, students);
}

async function handleCreateStudent(req: VercelRequest, res: VercelResponse) {
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return sendError(res, 'Student name is required and cannot be empty');
  }
  
  const id = createId('student');
  const now = new Date().toISOString();
  
  const student = await queryOne<Student>(
    `INSERT INTO students (id, name, active, created_at, updated_at)
     VALUES ($1, $2, true, $3, $4)
     RETURNING id, name, active, created_at as "createdAt", updated_at as "updatedAt"`,
    [id, name.trim(), now, now]
  );
  
  sendSuccess(res, student, 'Student created successfully');
}

async function handleUpdateStudent(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  const { name } = req.body;
  
  if (!id) {
    return sendError(res, 'Student ID is required');
  }
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return sendError(res, 'Student name is required and cannot be empty');
  }
  
  const now = new Date().toISOString();
  
  const student = await queryOne<Student>(
    `UPDATE students
     SET name = $1, updated_at = $2
     WHERE id = $3 AND active = true
     RETURNING id, name, active, created_at as "createdAt", updated_at as "updatedAt"`,
    [name.trim(), now, id]
  );
  
  if (!student) {
    return sendNotFound(res, 'Student');
  }
  
  sendSuccess(res, student, 'Student updated successfully');
}

async function handleDeleteStudent(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  
  if (!id) {
    return sendError(res, 'Student ID is required');
  }
  
  // Soft delete: set active = false
  const now = new Date().toISOString();
  
  const student = await queryOne<Student>(
    `UPDATE students
     SET active = false, updated_at = $1
     WHERE id = $2 AND active = true
     RETURNING id, name, active, created_at as "createdAt", updated_at as "updatedAt"`,
    [now, id]
  );
  
  if (!student) {
    return sendNotFound(res, 'Student');
  }
  
  sendSuccess(res, student, 'Student deleted successfully');
}
