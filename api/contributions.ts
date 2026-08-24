import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db.js';
import { sendSuccess, sendError, sendNotFound, handleError, createId, parseQueryParam, parseQueryParamArray, parseQueryParamInt, isValidDate } from './utils.js';
import type { Contribution, ContributionType } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method } = req;
    
    if (method === 'GET') {
      return await handleGetContributions(req, res);
    } else if (method === 'POST') {
      return await handleCreateContribution(req, res);
    } else if (method === 'PATCH') {
      return await handleUpdateContribution(req, res);
    } else if (method === 'DELETE') {
      return await handleDeleteContribution(req, res);
    } else {
      sendError(res, 'Method not allowed', 405);
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function handleGetContributions(req: VercelRequest, res: VercelResponse) {
  const contributionType = parseQueryParam(req.query.contribution_type) as ContributionType | undefined;
  const studentId = parseQueryParam(req.query.student_id);
  const dateFrom = parseQueryParam(req.query.date_from);
  const dateTo = parseQueryParam(req.query.date_to);
  const date = parseQueryParam(req.query.date);
  const periodMonth = parseQueryParamInt(req.query.period_month);
  const periodYear = parseQueryParamInt(req.query.period_year);
  
  let sql = `
    SELECT 
      id, 
      student_id as "studentId", 
      contribution_type as "contributionType", 
      date::text as date, 
      nominal, 
      period_month as "periodMonth", 
      period_year as "periodYear", 
      note,
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM contributions
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  if (contributionType) {
    sql += ` AND contribution_type = $${paramIndex}`;
    params.push(contributionType);
    paramIndex++;
  }
  
  if (studentId) {
    sql += ` AND student_id = $${paramIndex}`;
    params.push(studentId);
    paramIndex++;
  }
  
  if (date) {
    sql += ` AND date = $${paramIndex}`;
    params.push(date);
    paramIndex++;
  } else {
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
  }
  
  if (periodMonth !== undefined) {
    sql += ` AND period_month = $${paramIndex}`;
    params.push(periodMonth);
    paramIndex++;
  }
  
  if (periodYear !== undefined) {
    sql += ` AND period_year = $${paramIndex}`;
    params.push(periodYear);
    paramIndex++;
  }
  
  sql += ' ORDER BY date DESC, created_at DESC';
  
  const contributions = await query<Contribution>(sql, params);
  sendSuccess(res, contributions);
}

async function handleCreateContribution(req: VercelRequest, res: VercelResponse) {
  const { studentId, contributionType, date, nominal, periodMonth, periodYear, note } = req.body;
  
  // Validation
  if (!studentId || typeof studentId !== 'string') {
    return sendError(res, 'Student ID is required');
  }
  
  if (!contributionType || !['kas_kelas', 'amal_jumat', 'paguyuban_ngaji', 'tabungan', 'lks'].includes(contributionType)) {
    return sendError(res, 'Valid contribution type is required (kas_kelas, amal_jumat, paguyuban_ngaji, tabungan, lks)');
  }
  
  if (!date || !isValidDate(date)) {
    return sendError(res, 'Valid date is required (YYYY-MM-DD)');
  }
  
  // Validation: nominal must be a number and non-zero
  // For tabungan, allow negative nominal (for withdrawals)
  if (typeof nominal !== 'number' || nominal === 0) {
    return sendError(res, 'Nominal must be a non-zero number');
  }
  
  if (contributionType !== 'tabungan' && nominal <= 0) {
    return sendError(res, 'Nominal must be a positive number');
  }
  
  // Type-specific validation
  if (contributionType === 'paguyuban_ngaji') {
    if (typeof periodMonth !== 'number' || periodMonth < 1 || periodMonth > 12) {
      return sendError(res, 'Paguyuban Ngaji requires period_month (1-12)');
    }
    if (typeof periodYear !== 'number' || periodYear < 2000) {
      return sendError(res, 'Paguyuban Ngaji requires period_year');
    }
    if (nominal !== 12000) {
      return sendError(res, 'Paguyuban Ngaji nominal must be 12000');
    }
  }
  
  if (contributionType === 'lks') {
    if (typeof periodMonth !== 'number' || (periodMonth !== 1 && periodMonth !== 2)) {
      return sendError(res, 'LKS requires period_month (1 = Semester 1, 2 = Semester 2)');
    }
    if (typeof periodYear !== 'number' || periodYear < 2000) {
      return sendError(res, 'LKS requires period_year');
    }
  }
  
  if (contributionType === 'amal_jumat') {
    // Check if date is Friday (DOW = 5 in PostgreSQL)
    const dayCheck = await queryOne<{ dow: number }>(
      'SELECT EXTRACT(DOW FROM $1::date) as dow',
      [date]
    );
    
    if (dayCheck && Number(dayCheck.dow) !== 5) {
      return sendError(res, 'Amal Jumat can only be paid on Fridays');
    }
  }
  
  // note hanya untuk tabungan tarik; kosong = null
  const noteValue = typeof note === 'string' ? note.trim() || null : null;

  const id = createId('contrib');
  const now = new Date().toISOString();
  
  try {
    const contribution = await queryOne<Contribution>(
      `INSERT INTO contributions (
        id, student_id, contribution_type, date, nominal, 
        period_month, period_year, note, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, 
        student_id as "studentId", 
        contribution_type as "contributionType", 
        date::text as date, 
        nominal, 
        period_month as "periodMonth", 
        period_year as "periodYear", 
        note,
        created_at as "createdAt", 
        updated_at as "updatedAt"`,
      [id, studentId, contributionType, date, nominal, periodMonth || null, periodYear || null, noteValue, now, now]
    );
    
    sendSuccess(res, contribution, 'Contribution created successfully');
  } catch (error: any) {
    // Check for unique constraint violation
    if (error.message && error.message.includes('unique')) {
      return sendError(res, 'Duplicate payment: student has already paid for this date/period');
    }
    throw error;
  }
}

async function handleUpdateContribution(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  const { nominal, date, note } = req.body;
  
  if (!id) {
    return sendError(res, 'Contribution ID is required');
  }
  
  // Get existing contribution to check type
  const existing = await queryOne<Contribution>(
    'SELECT contribution_type as "contributionType" FROM contributions WHERE id = $1',
    [id]
  );
  
  if (!existing) {
    return sendNotFound(res, 'Contribution');
  }
  
  // Validate updates
  if (nominal !== undefined && (typeof nominal !== 'number' || nominal === 0)) {
    return sendError(res, 'Nominal must be a non-zero number');
  }

  if (nominal !== undefined && existing.contributionType !== 'tabungan' && nominal <= 0) {
    return sendError(res, 'Nominal must be a positive number');
  }
  
  if (date !== undefined && !isValidDate(date)) {
    return sendError(res, 'Valid date required (YYYY-MM-DD)');
  }

  if (note !== undefined && note !== null && typeof note !== 'string') {
    return sendError(res, 'Note must be a string');
  }
  
  // Check paguyuban constraint
  if (existing.contributionType === 'paguyuban_ngaji' && nominal !== undefined && nominal !== 12000) {
    return sendError(res, 'Paguyuban Ngaji nominal must be 12000');
  }
  
  // Check amal jumat day constraint
  if (existing.contributionType === 'amal_jumat' && date) {
    const dayCheck = await queryOne<{ dow: number }>(
      'SELECT EXTRACT(DOW FROM $1::date) as dow',
      [date]
    );
    
    if (dayCheck && Number(dayCheck.dow) !== 5) {
      return sendError(res, 'Amal Jumat can only be paid on Fridays');
    }
  }
  
  const now = new Date().toISOString();
  const updates: string[] = ['updated_at = $1'];
  const params: any[] = [now];
  let paramIndex = 2;
  
  if (nominal !== undefined) {
    updates.push(`nominal = $${paramIndex}`);
    params.push(nominal);
    paramIndex++;
  }
  
  if (date !== undefined) {
    updates.push(`date = $${paramIndex}`);
    params.push(date);
    paramIndex++;
  }

  if (note !== undefined) {
    updates.push(`note = $${paramIndex}`);
    params.push(note === null ? null : String(note).trim() || null);
    paramIndex++;
  }
  
  params.push(id);
  
  const contribution = await queryOne<Contribution>(
    `UPDATE contributions
     SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, 
        student_id as "studentId", 
        contribution_type as "contributionType", 
        date::text as date, 
        nominal, 
        period_month as "periodMonth", 
        period_year as "periodYear", 
        note,
        created_at as "createdAt", 
        updated_at as "updatedAt"`,
    params
  );
  
  if (!contribution) {
    return sendNotFound(res, 'Contribution');
  }
  
  sendSuccess(res, contribution, 'Contribution updated successfully');
}

async function handleDeleteContribution(req: VercelRequest, res: VercelResponse) {
  const id = parseQueryParam(req.query.id);
  
  if (!id) {
    return sendError(res, 'Contribution ID is required');
  }
  
  const contribution = await queryOne<Contribution>(
    `DELETE FROM contributions
      WHERE id = $1
      RETURNING 
        id, 
        student_id as "studentId", 
        contribution_type as "contributionType", 
        date::text as date, 
        nominal, 
        period_month as "periodMonth", 
        period_year as "periodYear", 
        note,
        created_at as "createdAt", 
        updated_at as "updatedAt"`,
    [id]
  );
  
  if (!contribution) {
    return sendNotFound(res, 'Contribution');
  }
  
  sendSuccess(res, contribution, 'Contribution deleted successfully');
}
