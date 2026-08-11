import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db';
import { sendSuccess, sendError, sendNotFound, handleError } from './utils';
import type { ContributionSetting, ContributionType } from './types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method } = req;
    
    if (method === 'GET') {
      return await handleGetSettings(req, res);
    } else if (method === 'PATCH') {
      return await handleUpdateSetting(req, res);
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    handleError(res, error);
  }
}

async function handleGetSettings(req: VercelRequest, res: VercelResponse) {
  const settings = await query<ContributionSetting>(
    `SELECT 
      id, 
      contribution_type as "contributionType", 
      default_nominal as "defaultNominal", 
      is_fixed as "isFixed", 
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM contribution_settings
    ORDER BY contribution_type`
  );
  
  sendSuccess(res, settings);
}

async function handleUpdateSetting(req: VercelRequest, res: VercelResponse) {
  const { contributionType, defaultNominal } = req.body;
  
  if (!contributionType || !['kas_kelas', 'amal_jumat', 'paguyuban_ngaji'].includes(contributionType)) {
    return sendError(res, 'Valid contribution type is required (kas_kelas, amal_jumat, paguyuban_ngaji)');
  }
  
  const existing = await queryOne<{ isFixed: boolean }>(
    'SELECT is_fixed as "isFixed" FROM contribution_settings WHERE contribution_type = $1',
    [contributionType]
  );
  
  if (!existing) {
    return sendNotFound(res, 'Setting');
  }
  
  if (existing.isFixed) {
    return sendError(res, 'This contribution type has a fixed nominal and cannot be changed');
  }
  
  const newNominal = defaultNominal === null || defaultNominal === undefined
    ? null
    : Number(defaultNominal);
  
  if (newNominal !== null && (!Number.isFinite(newNominal) || newNominal <= 0)) {
    return sendError(res, 'Default nominal must be a positive number or null');
  }
  
  const now = new Date().toISOString();
  
  const setting = await queryOne<ContributionSetting>(
    `UPDATE contribution_settings
     SET default_nominal = $1, updated_at = $2
     WHERE contribution_type = $3
     RETURNING 
       id, 
       contribution_type as "contributionType", 
       default_nominal as "defaultNominal", 
       is_fixed as "isFixed", 
       created_at as "createdAt", 
       updated_at as "updatedAt"`,
    [newNominal, now, contributionType]
  );
  
  if (!setting) {
    return sendNotFound(res, 'Setting');
  }
  
  sendSuccess(res, setting, 'Setting updated successfully');
}
