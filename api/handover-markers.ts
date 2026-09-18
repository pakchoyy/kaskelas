import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryOne } from '../server/db.js';
import { sendSuccess, sendError, handleError, createId, parseQueryParam } from '../server/utils.js';

type HandoverMarker = {
  id: string;
  scope: string;
  markerKey: string;
  handedOver: boolean;
  createdAt: string;
  updatedAt: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return await handleGetMarker(req, res);
    }
    if (req.method === 'PATCH') {
      return await handleUpsertMarker(req, res);
    }
    return sendError(res, 'Method not allowed', 405);
  } catch (error) {
    handleError(res, error);
  }
}

function cleanScope(value: unknown): string {
  return value === 'kwaru' ? 'kwaru' : 'kaskelas';
}

async function handleGetMarker(req: VercelRequest, res: VercelResponse) {
  const scope = cleanScope(parseQueryParam(req.query.scope));
  const markerKey = parseQueryParam(req.query.marker_key);

  if (!markerKey) {
    return sendError(res, 'marker_key query parameter is required');
  }

  const marker = await queryOne<HandoverMarker>(
    `SELECT
      id,
      scope,
      marker_key as "markerKey",
      handed_over as "handedOver",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM handover_markers
    WHERE scope = $1 AND marker_key = $2`,
    [scope, markerKey]
  );

  sendSuccess(res, marker);
}

async function handleUpsertMarker(req: VercelRequest, res: VercelResponse) {
  const { scope, markerKey, handedOver } = req.body;
  const sc = cleanScope(scope);

  if (!markerKey || typeof markerKey !== 'string' || markerKey.trim().length === 0) {
    return sendError(res, 'markerKey is required');
  }
  if (typeof handedOver !== 'boolean') {
    return sendError(res, 'handedOver must be a boolean');
  }

  const key = markerKey.trim();
  const now = new Date().toISOString();
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM handover_markers WHERE scope = $1 AND marker_key = $2',
    [sc, key]
  );

  const marker = existing
    ? await queryOne<HandoverMarker>(
        `UPDATE handover_markers
         SET handed_over = $1, updated_at = $2
         WHERE scope = $3 AND marker_key = $4
         RETURNING id, scope, marker_key as "markerKey", handed_over as "handedOver", created_at as "createdAt", updated_at as "updatedAt"`,
        [handedOver, now, sc, key]
      )
    : await queryOne<HandoverMarker>(
        `INSERT INTO handover_markers (id, scope, marker_key, handed_over, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, scope, marker_key as "markerKey", handed_over as "handedOver", created_at as "createdAt", updated_at as "updatedAt"`,
        [createId('handover'), sc, key, handedOver, now, now]
      );

  sendSuccess(res, marker, 'Handover marker saved successfully');
}
