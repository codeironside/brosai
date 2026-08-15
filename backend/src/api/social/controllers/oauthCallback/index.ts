import { Request, Response } from 'express';
import { socialAdapterService } from '../../services/socialAdapterService.js';
import { logger } from '../../../../core/logger/index.js';

function callbackPage(payload: {
  success: boolean;
  platform?: string;
  handle?: string;
  error?: string;
  needsPageSelection?: boolean;
  pages?: Array<{ id: string; name: string; avatarUrl?: string }>;
  state?: string;
}): string {
  const origin = socialAdapterService.getFrontendOrigin();
  const safePayload = JSON.stringify({
    type: 'brosai-social-oauth',
    success: payload.success,
    platform: payload.platform || null,
    handle: payload.handle || null,
    error: payload.error || null,
    needsPageSelection: Boolean(payload.needsPageSelection),
    pages: payload.pages || [],
    state: payload.state || null
  }).replace(/</g, '\\u003c');

  const title = payload.needsPageSelection
    ? 'Choose a Facebook Page'
    : payload.success ? 'Account connected' : 'Connection failed';
  const body = payload.needsPageSelection
    ? 'Pick which Facebook Page to connect in the main window.'
    : payload.success
      ? `${payload.platform || 'Account'} is connected${payload.handle ? ` as ${payload.handle}` : ''}. You can close this window.`
      : payload.error || 'Social account connection failed.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0b0b; color: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    main { max-width: 420px; padding: 24px; border: 1px solid #333; border-radius: 12px; }
    p { line-height: 1.5; color: #cfcfcf; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${body.replace(/</g, '&lt;')}</p>
  </main>
  <script>
    (function () {
      var payload = ${safePayload};
      var origin = ${JSON.stringify(origin)};
      if (window.opener) {
        window.opener.postMessage(payload, origin);
        window.opener.postMessage(payload, '*');
        window.close();
      } else {
        var params = new URLSearchParams();
        params.set('oauth', payload.success ? 'success' : 'error');
        if (payload.platform) params.set('platform', payload.platform);
        if (payload.error) params.set('oauth_error', payload.error);
        window.location.replace(origin + '/?' + params.toString());
      }
    })();
  </script>
</body>
</html>`;
}

export const oauthCallbackController = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await socialAdapterService.handleCallback({
      code: typeof req.query.code === 'string' ? req.query.code : undefined,
      state: typeof req.query.state === 'string' ? req.query.state : undefined,
      error: typeof req.query.error === 'string' ? req.query.error : undefined,
      error_description: typeof req.query.error_description === 'string'
        ? req.query.error_description
        : undefined
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(callbackPage({
      success: true,
      platform: result.platform,
      handle: result.handle,
      needsPageSelection: result.needsPageSelection,
      pages: result.pages,
      state: result.state
    }));
  } catch (error: any) {
    logger.error(`OAuth callback failed: ${error.message}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(400).send(callbackPage({
      success: false,
      error: error.message || 'OAuth callback failed'
    }));
  }
};
