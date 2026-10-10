import { Router, Request, Response } from 'express';
import { swaggerSpec } from '../docs/swagger.spec';

const router = Router();

// GET /api-docs/swagger.json hoặc /swagger.json
router.get('/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json(swaggerSpec);
});

// GET /api-docs hoặc /swagger
router.get(['/', ''], (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>ASM Data Manage - Swagger API Documentation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.17.14/favicon-32x32.png" sizes="32x32" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #f59e0b;
      --primary-hover: #d97706;
    }
    body {
      margin: 0;
      padding: 0;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .topbar-header {
      background: #020617;
      border-bottom: 1px solid #1e293b;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .topbar-logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 16px;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
    .topbar-title {
      font-weight: 800;
      font-size: 16px;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    .topbar-badge {
      font-size: 11px;
      font-weight: 700;
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .topbar-links a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      margin-left: 16px;
      transition: color 0.2s;
    }
    .topbar-links a:hover {
      color: #f59e0b;
    }
    /* Swagger UI Custom Overrides */
    .swagger-ui {
      font-family: inherit;
    }
    .swagger-ui .topbar {
      display: none;
    }
    .swagger-ui .info {
      margin: 24px 0;
    }
    .swagger-ui .info .title {
      font-family: inherit;
      color: #ffffff;
      font-weight: 800;
    }
    .swagger-ui .info p, .swagger-ui .info li {
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.6;
    }
    .swagger-ui .scheme-container {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 12px;
      box-shadow: none;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .swagger-ui .btn.authorize {
      background: linear-gradient(135deg, #10b981, #059669);
      border-color: transparent;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .swagger-ui .btn.authorize svg {
      fill: #ffffff;
    }
    .swagger-ui .opblock-tag {
      font-family: inherit;
      color: #f8fafc;
      font-weight: 700;
      border-bottom: 1px solid #1e293b;
    }
    .swagger-ui .opblock {
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      border: 1px solid #1e293b;
      background: #020617;
      margin: 0 0 12px;
    }
    .swagger-ui .opblock .opblock-summary-operation-id, 
    .swagger-ui .opblock .opblock-summary-path, 
    .swagger-ui .opblock .opblock-summary-path__deprecated {
      color: #f1f5f9;
      font-weight: 700;
    }
    .swagger-ui .opblock .opblock-summary-description {
      color: #94a3b8;
      font-size: 12px;
    }
    .swagger-ui .opblock-body {
      background: #0f172a;
    }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: #94a3b8;
      font-weight: 700;
      border-bottom: 1px solid #334155;
    }
    .swagger-ui .parameter__name {
      color: #f8fafc;
      font-weight: 700;
    }
    .swagger-ui .parameter__type {
      color: #f59e0b;
    }
    .swagger-ui input[type=text], .swagger-ui textarea {
      background: #020617;
      border: 1px solid #334155;
      color: #ffffff;
      border-radius: 6px;
    }
    .swagger-ui .dialog-ux .modal-ux {
      background: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .swagger-ui .dialog-ux .modal-ux-header h3 {
      color: #ffffff;
    }
    .swagger-ui .dialog-ux .modal-ux-content h4 {
      color: #cbd5e1;
    }
    .swagger-ui .dialog-ux .modal-ux-content p {
      color: #94a3b8;
    }
    .swagger-ui .auth-btn-wrapper .btn-done {
      background: #3b82f6;
      border-radius: 6px;
      color: white;
    }
  </style>
</head>
<body>
  <div class="topbar-header">
    <div class="topbar-brand">
      <div class="topbar-logo">ASM</div>
      <div class="topbar-title">ASM Data Management API</div>
      <span class="topbar-badge">v1.0.0</span>
    </div>
    <div class="topbar-links">
      <a href="/swagger.json" target="_blank">📄 OpenAPI Spec (JSON)</a>
      <a href="/api/health" target="_blank">⚡ Health Check</a>
      <a href="http://localhost:3000" target="_blank">🖥️ Open Frontend UI</a>
    </div>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const spec = ${JSON.stringify(swaggerSpec)};
      window.ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        filter: true,
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>
  `;
  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
});

export default router;
