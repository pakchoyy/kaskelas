import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db.js';
import { sendSuccess, sendError, sendNotFound, handleError, createId, parseQueryParam, parseQueryParamArray, isValidDate } from './utils.js';
import type { FinanceTransaction, TransactionType } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method } = req;
    
    if (method === 'GET') {
      return await handleGetFinance(req, res);
    } else if (method === 'POST') {
      return await handleCreateFinance(req, res);
    } else if (method === 'PATCH') {
      return await handleUpdateFinance(req, res);
    } else if (method === 'DELETE') {
      return await handleDeleteFinance(req, res);
    } else {
      sendError(res, 'Method not allowed', 405);
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function handleGetFinance(req: VercelRequest, res: VercelResponse) {
  const type = parseQueryParam(req.query.type) as TransactionType | undefined;
  const dateFrom = parseQueryParam(req.query.date_from);
  const dateTo = parseQueryParam(req.query.date_to);
  
  let sql = `
    SELECT 
      id, 
      type, 
      date::text as date, 
      nominal, 
      note, 
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM finance_transactions
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  if (type && ['pemasukan', 'pengeluaran'].includes(type)) {
    sql += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }
  
  if (dateFrom) {
    sql += ` AND date >= $${paramIndex}`;
    params.push(dateFrom);
    paramIndex++;
  }
  
  if (dateTo) {
    sql += ` AND date <= $${paramIndex}`;
    params.push(dateTo);
    paramIndex++;
  }
  
  sql += ' ORDER BY date DESC, created_at DESC';
  
  const transactions = await query<FinanceTransaction>(sql, params);
  sendSuccess(res, transactions);
}

async function handleCreateFinance(req: VercelRequest, res: VercelResponse) {
  const { type, date, nominal, note } = req.body;
  
  // Validation
  if (!type || !['pemasukan', 'pengeluaran'].includes(type)) {
    return sendError(res, 'Valid type is required (pemasukan or pengeluaran)');
  }
  
  if (!date || !isValidDate(date)) {
    return sendError(res, 'Valid date is required (YYYY-MM-DD)');
  }
  
  if (typeof nominal !== 'number' || nominal <= 0) {
    return sendError(res, 'Nominal must be a positive number');
  }
  
  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    return sendError(res, 'Note is required and cannot be empty');
  }
  
  const id = createId('finance');
  const now = new Date().toISOString();
  
  const transaction = await queryOne<FinanceTransaction>(
    `INSERT INTO finance_transactions (id, type, date, nominal, note, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING 
       id, 
       type, 
       date, 
       nominal, 
       note, 
       created_at as "createdAt", 
       updated_at as "updatedAt"`,
    [id, type, date, nominal, note.trim(), now, now]
  );
  
  sendSuccess(res, transaction, 'Finance transaction created successfully');
}

async function handleUpdateFinance(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  const { type, date, nominal, note } = req.body;
  
  if (!id) {
    return sendError(res, 'Transaction ID is required');
  }
  
  // Validation
  if (type !== undefined && !['pemasukan', 'pengeluaran'].includes(type)) {
    return sendError(res, 'Valid type is required (pemasukan or pengeluaran)');
  }
  
  if (date !== undefined && !isValidDate(date)) {
    return sendError(res, 'Valid date required (YYYY-MM-DD)');
  }
  
  if (nominal !== undefined && (typeof nominal !== 'number' || nominal <= 0)) {
    return sendError(res, 'Nominal must be a positive number');
  }
  
  if (note !== undefined && (typeof note !== 'string' || note.trim().length === 0)) {
    return sendError(res, 'Note cannot be empty');
  }
  
  const now = new Date().toISOString();
  const updates: string[] = ['updated_at = $1'];
  const params: any[] = [now];
  let paramIndex = 2;
  
  if (type !== undefined) {
    updates.push(`type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }
  
  if (date !== undefined) {
    updates.push(`date = $${paramIndex}`);
    params.push(date);
    paramIndex++;
  }
  
  if (nominal !== undefined) {
    updates.push(`nominal = $${paramIndex}`);
    params.push(nominal);
    paramIndex++;
  }
  
  if (note !== undefined) {
    updates.push(`note = $${paramIndex}`);
    params.push(note.trim());
    paramIndex++;
  }
  
  params.push(id);
  
  const transaction = await queryOne<FinanceTransaction>(
    `UPDATE finance_transactions
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING 
       id, 
       type, 
       date, 
       nominal, 
       note, 
       created_at as "createdAt", 
       updated_at as "updatedAt"`,
    params
  );
  
  if (!transaction) {
    return sendNotFound(res, 'Finance transaction');
  }
  
  sendSuccess(res, transaction, 'Finance transaction updated successfully');
}

async function handleDeleteFinance(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  
  if (!id) {
    return sendError(res, 'Transaction ID is required');
  }
  
  const transaction = await queryOne<FinanceTransaction>(
    `DELETE FROM finance_transactions
     WHERE id = $1
     RETURNING 
       id, 
       type, 
       date, 
       nominal, 
       note, 
       created_at as "createdAt", 
       updated_at as "updatedAt"`,
    [id]
  );
  
  if (!transaction) {
    return sendNotFound(res, 'Finance transaction');
  }
  
  sendSuccess(res, transaction, 'Finance transaction deleted successfully');
}
