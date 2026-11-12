import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from '../server/db.js';
import { sendSuccess, sendError, sendNotFound, handleError, createId, parseQueryParam, requireKey } from '../server/utils.js';
import type { Note } from '../server/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireKey(req, res)) return;
  try {
    const { method } = req;
    
    if (method === 'GET') {
      return await handleGetNotes(req, res);
    } else if (method === 'POST') {
      return await handleCreateNote(req, res);
    } else if (method === 'PATCH') {
      return await handleUpdateNote(req, res);
    } else if (method === 'DELETE') {
      return await handleDeleteNote(req, res);
    } else {
      sendError(res, 'Method not allowed', 405);
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function handleGetNotes(req: VercelRequest, res: VercelResponse) {
  const scope = parseQueryParam(req.query.scope);
  const periodKey = parseQueryParam(req.query.period_key);
  
  let sql = `
    SELECT 
      id, 
      scope, 
      period_key as "periodKey", 
      text, 
      details,
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM notes
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  if (scope) {
    sql += ` AND scope = $${paramIndex}`;
    params.push(scope);
    paramIndex++;
  }
  
  if (periodKey) {
    sql += ` AND period_key = $${paramIndex}`;
    params.push(periodKey);
    paramIndex++;
  }
  
  sql += ' ORDER BY created_at ASC, id ASC';
  
  const notes = await query<Note>(sql, params);
  sendSuccess(res, notes);
}

async function handleCreateNote(req: VercelRequest, res: VercelResponse) {
  const { scope, periodKey, text, details } = req.body;
  
  if (!scope || typeof scope !== 'string' || scope.trim().length === 0) {
    return sendError(res, 'Scope is required');
  }
  
  if (!periodKey || typeof periodKey !== 'string' || periodKey.trim().length === 0) {
    return sendError(res, 'Period key is required');
  }
  
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return sendError(res, 'Note text is required and cannot be empty');
  }
  
  const id = createId('note');
  const now = new Date().toISOString();
  
  const note = await queryOne<Note>(
    `INSERT INTO notes (id, scope, period_key, text, details, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     RETURNING 
       id, 
       scope, 
       period_key as "periodKey", 
 
       text, 
       details,
       created_at as "createdAt", 
       updated_at as "updatedAt"`,
    [id, scope.trim(), periodKey.trim(), text.trim(), details ? JSON.stringify(details) : null, now, now]
  );
  
  sendSuccess(res, note, 'Note created successfully');
}

async function handleUpdateNote(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  const { text, details } = req.body;
  
  if (!id) {
    return sendError(res, 'Note ID is required');
  }
  
  if (text === undefined || typeof text !== 'string' || text.trim().length === 0) {
    return sendError(res, 'Note text is required and cannot be empty');
  }
  
  const now = new Date().toISOString();
  
  const note = await queryOne<Note>(
    `UPDATE notes
     SET text = $1, details = COALESCE($2::jsonb, details), updated_at = $3
     WHERE id = $4
     RETURNING 
       id, 
       scope, 
       period_key as "periodKey", 
 
       text, 
       details,
       created_at as "createdAt", 
       updated_at as "updatedAt"`,
    [text.trim(), details ? JSON.stringify(details) : null, now, id]
  );
  
  if (!note) {
    return sendNotFound(res, 'Note');
  }
  
  sendSuccess(res, note, 'Note updated successfully');
}

async function handleDeleteNote(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  
  if (!id) {
    return sendError(res, 'Note ID is required');
  }
  
  const note = await queryOne<Note>(
    `DELETE FROM notes
     WHERE id = $1
     RETURNING 
       id, 
       scope, 
       period_key as "periodKey", 
 
       text, 
       details,
       created_at as "createdAt", 
       updated_at as "updatedAt"`,
    [id]
  );
  
  if (!note) {
    return sendNotFound(res, 'Note');
  }
  
  sendSuccess(res, note, 'Note deleted successfully');
}