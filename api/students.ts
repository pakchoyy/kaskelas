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
  const category = parseQueryParam(req.query.category) as 'siswa' | 'guru' | undefined;
  const scope = parseQueryParam(req.query.scope) || 'kaskelas';
  
  let sql = includeInactive
    ? 'SELECT id, name, active, category, scope, blok, created_at as "createdAt", updated_at as "updatedAt" FROM students WHERE scope = $1'
    : 'SELECT id, name, active, category, scope, blok, created_at as "createdAt", updated_at as "updatedAt" FROM students WHERE active = true AND scope = $1';
  
  const params: any[] = [scope];
  if (category === 'siswa' || category === 'guru') {
    sql += ` AND category = $${params.length + 1}`;
    params.push(category);
  }
  sql += ' ORDER BY created_at';
  
  const students = await query<Student>(sql, params);
  sendSuccess(res, students);
}

async function handleCreateStudent(req: VercelRequest, res: VercelResponse) {
  const { name, category, scope, blok } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return sendError(res, 'Student name is required and cannot be empty');
  }
  const cat = category === 'guru' ? 'guru' : 'siswa';
  const sc = scope === 'kwaru' ? 'kwaru' : 'kaskelas';
  const bl = blok === 'etan' || blok === 'kulon' || blok === 'lainnya' ? blok : null;
  
  const id = createId('student');
  const now = new Date().toISOString();
  
  const student = await queryOne<Student>(
    `INSERT INTO students (id, name, active, category, scope, blok, created_at, updated_at)
     VALUES ($1, $2, true, $3, $4, $5, $6, $7)
     RETURNING id, name, active, category, scope, blok, created_at as "createdAt", updated_at as "updatedAt"`,
    [id, name.trim(), cat, sc, bl, now, now]
  );
  
  sendSuccess(res, student, 'Student created successfully');
}

async function handleUpdateStudent(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  const { name, blok } = req.body;
  
  if (!id) {
    return sendError(res, 'Student ID is required');
  }
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return sendError(res, 'Student name is required and cannot be empty');
  }
  
  const now = new Date().toISOString();
  const bl = blok === 'etan' || blok === 'kulon' || blok === 'lainnya' ? blok : (blok === null ? null : undefined);
  
  let student;
  if (bl === undefined) {
    student = await queryOne<Student>(
      `UPDATE students
       SET name = $1, updated_at = $2
       WHERE id = $3 AND active = true
       RETURNING id, name, active, category, scope, blok, created_at as "createdAt", updated_at as "updatedAt"`,
      [name.trim(), now, id]
    );
  } else {
    student = await queryOne<Student>(
      `UPDATE students
       SET name = $1, blok = $2, updated_at = $3
       WHERE id = $4 AND active = true
       RETURNING id, name, active, category, scope, blok, created_at as "createdAt", updated_at as "updatedAt"`,
      [name.trim(), bl, now, id]
    );
  }
  
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
     RETURNING id, name, active, category, scope, blok, created_at as "createdAt", updated_at as "updatedAt"`,
    [now, id]
  );
  
  if (!student) {
    return sendNotFound(res, 'Student');
  }
  
  sendSuccess(res, student, 'Student deleted successfully');
}
