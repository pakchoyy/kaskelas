import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryOne } from './db.js';
import { sendSuccess, sendError, handleError, createId, parseQueryParam } from './utils.js';
import type { AmalJumatMarker } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method } = req;
    
    if (method === 'GET') {
      return await handleGetMarker(req, res);
    } else if (method === 'PATCH') {
      return await handleUpsertMarker(req, res);
    } else {
      sendError(res, 'Method not allowed', 405);
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function handleGetMarker(req: VercelRequest, res: VercelResponse) {
  const fridayDate = parseQueryParam(req.query.friday_date);
  
  if (!fridayDate) {
    return sendError(res, 'friday_date query parameter is required');
  }
  
  const marker = await queryOne<AmalJumatMarker>(
    `SELECT 
      id, 
      friday_date as "fridayDate", 
      handed_over as "handedOver", 
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM amal_jumat_markers
    WHERE friday_date = $1`,
    [fridayDate]
  );
  
  sendSuccess(res, marker);
}

async function handleUpsertMarker(req: VercelRequest, res: VercelResponse) {
  const { fridayDate, handedOver } = req.body;
  
  if (!fridayDate || typeof fridayDate !== 'string' || fridayDate.trim().length === 0) {
    return sendError(res, 'fridayDate is required');
  }
  
  if (typeof handedOver !== 'boolean') {
    return sendError(res, 'handedOver must be a boolean');
  }
  
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM amal_jumat_markers WHERE friday_date = $1',
    [fridayDate]
  );
  
  const now = new Date().toISOString();
  let marker: AmalJumatMarker | null = null;
  
  if (existing) {
    marker = await queryOne<AmalJumatMarker>(
      `UPDATE amal_jumat_markers
       SET handed_over = $1, updated_at = $2
       WHERE friday_date = $3
       RETURNING 
         id, 
         friday_date as "fridayDate", 
         handed_over as "handedOver", 
         created_at as "createdAt", 
         updated_at as "updatedAt"`,
      [handedOver, now, fridayDate]
    );
  } else {
    const id = createId('amal');
    marker = await queryOne<AmalJumatMarker>(
      `INSERT INTO amal_jumat_markers (id, friday_date, handed_over, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING 
         id, 
         friday_date as "fridayDate", 
         handed_over as "handedOver", 
         created_at as "createdAt", 
         updated_at as "updatedAt"`,
      [id, fridayDate, handedOver, now, now]
    );
  }
  
  sendSuccess(res, marker, 'Marker saved successfully');
}