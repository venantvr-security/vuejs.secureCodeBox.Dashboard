import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { listPods, getPod, getPodMetrics, getAllPodMetrics, getPodLogs, deletePod } from './kubernetes/pods';
import { listScans, getScan, createScan, deleteScan, listScanTypes } from './kubernetes/scans';
import { listEvents } from './kubernetes/events';
import { runDiagnostic, getNetworkInfo } from './system/diagnostic';
import { NAMESPACE, reconnectCluster } from './kubernetes/client';

const app = express();
const PORT = process.env.PORT || 8080;

// Répertoire des templates de scan (dans le projet dashboard)
const SCAN_TEMPLATES_DIR = path.join(__dirname, '..', 'scan-templates');

// Créer le répertoire s'il n'existe pas
if (!fs.existsSync(SCAN_TEMPLATES_DIR)) {
  fs.mkdirSync(SCAN_TEMPLATES_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limite pour upload YAML

// ============================================================================
// REST API - PODS
// ============================================================================

app.get('/api/pods', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const pods = await listPods(namespace);
    res.json(pods);
  } catch (error) {
    console.error('[API] Error listing pods:', error);
    res.status(500).json({ error: 'Failed to list pods' });
  }
});

app.get('/api/pods/:name', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const pod = await getPod(req.params.name, namespace);
    if (pod) {
      res.json(pod);
    } else {
      res.status(404).json({ error: 'Pod not found' });
    }
  } catch (error) {
    console.error('[API] Error getting pod:', error);
    res.status(500).json({ error: 'Failed to get pod' });
  }
});

app.get('/api/pods/:name/metrics', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const metrics = await getPodMetrics(req.params.name, namespace);
    if (metrics) {
      res.json(metrics);
    } else {
      res.status(404).json({ error: 'Metrics not available' });
    }
  } catch (error) {
    console.error('[API] Error getting pod metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

app.get('/api/pods/:name/logs', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const container = req.query.container as string | undefined;
    const tailLines = parseInt(req.query.tailLines as string) || 100;
    const logs = await getPodLogs(req.params.name, container, namespace, tailLines);
    res.json({ logs });
  } catch (error) {
    console.error('[API] Error getting pod logs:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

app.delete('/api/pods/:name', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const success = await deletePod(req.params.name, namespace);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete pod' });
    }
  } catch (error) {
    console.error('[API] Error deleting pod:', error);
    res.status(500).json({ error: 'Failed to delete pod' });
  }
});

// ============================================================================
// REST API - METRICS
// ============================================================================

app.get('/api/metrics/pods', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const metrics = await getAllPodMetrics(namespace);
    res.json(metrics);
  } catch (error) {
    console.error('[API] Error getting all metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// ============================================================================
// REST API - CLUSTER STATUS
// ============================================================================

app.get('/api/cluster/status', async (req, res) => {
  try {
    const pods = await listPods(NAMESPACE);

    const status = {
      operator: pods.some(p => p.name.includes('controller-manager') && p.status === 'Running'),
      minio: pods.some(p => p.name.includes('minio') && p.status === 'Running'),
      wpscan: true, // ScanType toujours disponible après install
      hook: pods.some(p => p.name.includes('hook')),
      totalPods: pods.length,
      runningPods: pods.filter(p => p.status === 'Running').length,
      completedPods: pods.filter(p => p.status === 'Succeeded').length,
      failedPods: pods.filter(p => p.status === 'Failed').length
    };

    res.json(status);
  } catch (error) {
    console.error('[API] Error getting cluster status:', error);
    res.status(500).json({ error: 'Failed to get cluster status' });
  }
});

// Reconnexion au cluster K8s (recharge kubeconfig)
app.post('/api/cluster/reconnect', (req, res) => {
  console.log('[API] Cluster reconnect requested');
  const result = reconnectCluster();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// ============================================================================
// REST API - HEALTH
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// REST API - SCANS
// ============================================================================

app.get('/api/scans', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const scans = await listScans(namespace);
    res.json(scans);
  } catch (error) {
    console.error('[API] Error listing scans:', error);
    res.status(500).json({ error: 'Failed to list scans' });
  }
});

app.get('/api/scans/:name', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const scan = await getScan(req.params.name, namespace);
    if (scan) {
      res.json(scan);
    } else {
      res.status(404).json({ error: 'Scan not found' });
    }
  } catch (error) {
    console.error('[API] Error getting scan:', error);
    res.status(500).json({ error: 'Failed to get scan' });
  }
});

app.post('/api/scans', async (req, res) => {
  try {
    const { name, scanType, parameters } = req.body;
    const namespace = (req.query.namespace as string) || NAMESPACE;

    if (!name || !scanType) {
      res.status(400).json({ error: 'name and scanType are required' });
      return;
    }

    const success = await createScan(name, scanType, parameters || [], namespace);
    if (success) {
      res.status(201).json({ success: true, name });
    } else {
      res.status(500).json({ error: 'Failed to create scan' });
    }
  } catch (error) {
    console.error('[API] Error creating scan:', error);
    res.status(500).json({ error: 'Failed to create scan' });
  }
});

app.delete('/api/scans/:name', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const success = await deleteScan(req.params.name, namespace);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete scan' });
    }
  } catch (error) {
    console.error('[API] Error deleting scan:', error);
    res.status(500).json({ error: 'Failed to delete scan' });
  }
});

app.get('/api/scantypes', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const scanTypes = await listScanTypes(namespace);
    res.json(scanTypes);
  } catch (error) {
    console.error('[API] Error listing scan types:', error);
    res.status(500).json({ error: 'Failed to list scan types' });
  }
});

// Endpoint pour récupérer les findings depuis MinIO
app.get('/api/scans/:name/findings', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const scanName = req.params.name;

    // Récupérer le scan UID
    const scanUid = await new Promise<string>((resolve, reject) => {
      exec(`kubectl get scan ${scanName} -n ${namespace} -o jsonpath='{.metadata.uid}'`,
        { timeout: 10000 },
        (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout.trim().replace(/'/g, ''));
        }
      );
    });

    // Lire les findings directement depuis MinIO via mc (MinIO Client)
    const findingsCmd = `kubectl exec -n ${namespace} securecodebox-operator-minio-0 -- mc cat local/securecodebox/scan-${scanUid}/findings.json 2>/dev/null`;

    exec(findingsCmd, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error || !stdout.trim() || stdout.includes('<Error>')) {
        console.error('[API] Could not read findings from MinIO:', error?.message || 'empty response');
        res.json({ total: 0, findings: [], message: 'Findings not accessible - mc alias may need setup' });
        return;
      }

      try {
        const findings = JSON.parse(stdout.trim());
        const total = Array.isArray(findings) ? findings.length : 0;

        // Calculer les statistiques
        const severities: Record<string, number> = {};
        const categories: Record<string, number> = {};

        if (Array.isArray(findings)) {
          findings.forEach((f: any) => {
            const sev = f.severity || 'informational';
            const cat = f.category || 'Other';
            severities[sev] = (severities[sev] || 0) + 1;
            categories[cat] = (categories[cat] || 0) + 1;
          });
        }

        res.json({ total, severities, categories, findings });
      } catch (e) {
        console.error('[API] Error parsing findings:', e);
        res.json({ total: 0, findings: [], message: 'Failed to parse findings' });
      }
    });
  } catch (error) {
    console.error('[API] Error getting findings:', error);
    res.status(500).json({ error: 'Failed to get findings' });
  }
});

// ============================================================================
// REST API - SCAN TEMPLATES (upload uniquement, pas de couplage externe)
// ============================================================================

interface ScanTemplate {
  name: string;
  filename: string;
  scanType: string;
  uploadedAt: string;
  content: string;
}

// Lister les templates uploadés
app.get('/api/scan-templates', (req, res) => {
  try {
    const files = fs.readdirSync(SCAN_TEMPLATES_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    const templates: ScanTemplate[] = files.map(filename => {
      const filepath = path.join(SCAN_TEMPLATES_DIR, filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      const stats = fs.statSync(filepath);

      // Extraire le nom et scanType du YAML
      const nameMatch = content.match(/^\s*name:\s*["']?([^"'\n]+)["']?/m);
      const typeMatch = content.match(/^\s*scanType:\s*["']?([^"'\n]+)["']?/m);

      return {
        name: nameMatch?.[1] || filename.replace(/\.ya?ml$/, ''),
        filename,
        scanType: typeMatch?.[1] || 'unknown',
        uploadedAt: stats.mtime.toISOString(),
        content
      };
    });

    res.json(templates);
  } catch (error) {
    console.error('[API] Error listing scan templates:', error);
    res.status(500).json({ error: 'Failed to list scan templates' });
  }
});

// Récupérer un template
app.get('/api/scan-templates/:name', (req, res) => {
  try {
    const filename = req.params.name.endsWith('.yaml') ? req.params.name : `${req.params.name}.yaml`;
    const filepath = path.join(SCAN_TEMPLATES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    res.json({ filename, content });
  } catch (error) {
    console.error('[API] Error getting scan template:', error);
    res.status(500).json({ error: 'Failed to get scan template' });
  }
});

// Uploader un template
app.post('/api/scan-templates', (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      res.status(400).json({ error: 'filename and content are required' });
      return;
    }

    // Vérifier que c'est un YAML valide (basique)
    if (!content.includes('apiVersion:') || !content.includes('kind:')) {
      res.status(400).json({ error: 'Invalid Kubernetes YAML format' });
      return;
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '-');
    const finalFilename = safeFilename.endsWith('.yaml') || safeFilename.endsWith('.yml')
      ? safeFilename
      : `${safeFilename}.yaml`;

    const filepath = path.join(SCAN_TEMPLATES_DIR, finalFilename);
    fs.writeFileSync(filepath, content, 'utf-8');

    console.log(`[API] Template uploaded: ${finalFilename}`);
    res.status(201).json({ success: true, filename: finalFilename });
  } catch (error) {
    console.error('[API] Error uploading scan template:', error);
    res.status(500).json({ error: 'Failed to upload scan template' });
  }
});

// Appliquer un template (kubectl apply)
app.post('/api/scan-templates/:name/apply', (req, res) => {
  try {
    const filename = req.params.name.endsWith('.yaml') ? req.params.name : `${req.params.name}.yaml`;
    const filepath = path.join(SCAN_TEMPLATES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    exec(`kubectl apply -f "${filepath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[API] kubectl apply failed:', stderr);
        res.status(500).json({ error: `Failed to apply template: ${stderr}` });
        return;
      }

      console.log(`[API] Template applied: ${filename}`);
      res.json({ success: true, output: stdout.trim() });
    });
  } catch (error) {
    console.error('[API] Error applying scan template:', error);
    res.status(500).json({ error: 'Failed to apply scan template' });
  }
});

// Supprimer un template
app.delete('/api/scan-templates/:name', (req, res) => {
  try {
    const filename = req.params.name.endsWith('.yaml') ? req.params.name : `${req.params.name}.yaml`;
    const filepath = path.join(SCAN_TEMPLATES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    fs.unlinkSync(filepath);
    console.log(`[API] Template deleted: ${filename}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting scan template:', error);
    res.status(500).json({ error: 'Failed to delete scan template' });
  }
});

// ============================================================================
// REST API - EVENTS
// ============================================================================

app.get('/api/events', async (req, res) => {
  try {
    const namespace = (req.query.namespace as string) || NAMESPACE;
    const limit = parseInt(req.query.limit as string) || 50;
    const events = await listEvents(namespace, limit);
    res.json(events);
  } catch (error) {
    console.error('[API] Error listing events:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

// ============================================================================
// REST API - SYSTEM DIAGNOSTIC
// ============================================================================

app.get('/api/system/diagnostic', async (req, res) => {
  try {
    const result = await runDiagnostic();
    res.json(result);
  } catch (error) {
    console.error('[API] Error running diagnostic:', error);
    res.status(500).json({ error: 'Failed to run diagnostic' });
  }
});

app.get('/api/system/network', async (req, res) => {
  try {
    const result = await getNetworkInfo();
    res.json(result);
  } catch (error) {
    console.error('[API] Error getting network info:', error);
    res.status(500).json({ error: 'Failed to get network info' });
  }
});

// ============================================================================
// HTTP + WEBSOCKET SERVER
// ============================================================================

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Stockage des subscriptions
const subscriptions = new Map<WebSocket, Set<string>>();

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  subscriptions.set(ws, new Set());

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'subscribe') {
        subscriptions.get(ws)?.add(data.resource);
        console.log(`[WS] Subscribed to: ${data.resource}`);

        // Envoyer les données initiales
        if (data.resource === 'pods') {
          const pods = await listPods(NAMESPACE);
          ws.send(JSON.stringify({ type: 'pods_initial', data: pods }));
        } else if (data.resource === 'metrics') {
          const metrics = await getAllPodMetrics(NAMESPACE);
          ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
        } else if (data.resource === 'scans') {
          const scans = await listScans(NAMESPACE);
          ws.send(JSON.stringify({ type: 'scans_initial', data: scans }));
        } else if (data.resource === 'events') {
          const events = await listEvents(NAMESPACE, 20);
          ws.send(JSON.stringify({ type: 'events_initial', data: events }));
        }
      } else if (data.type === 'unsubscribe') {
        subscriptions.get(ws)?.delete(data.resource);
        console.log(`[WS] Unsubscribed from: ${data.resource}`);
      }
    } catch (error) {
      console.error('[WS] Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    subscriptions.delete(ws);
  });
});

// Broadcast metrics toutes les 5 secondes
setInterval(async () => {
  try {
    const metrics = await getAllPodMetrics(NAMESPACE);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && subscriptions.get(client)?.has('metrics')) {
        client.send(JSON.stringify({ type: 'metrics', data: metrics }));
      }
    });
  } catch (error) {
    // Ignorer les erreurs de metrics (peut ne pas être disponible)
  }
}, 5000);

// Broadcast scans toutes les 3 secondes
setInterval(async () => {
  try {
    const scans = await listScans(NAMESPACE);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && subscriptions.get(client)?.has('scans')) {
        client.send(JSON.stringify({ type: 'scans', data: scans }));
      }
    });
  } catch (error) {
    // Ignorer les erreurs
  }
}, 3000);

// Broadcast events toutes les 2 secondes
setInterval(async () => {
  try {
    const events = await listEvents(NAMESPACE, 20);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && subscriptions.get(client)?.has('events')) {
        client.send(JSON.stringify({ type: 'events', data: events }));
      }
    });
  } catch (error) {
    // Ignorer les erreurs
  }
}, 2000);

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     secureCodeBox Dashboard - Backend API                     ║
╠═══════════════════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}/api                        ║
║  WebSocket:   ws://localhost:${PORT}/ws                           ║
║  Health:      http://localhost:${PORT}/api/health                 ║
║  Namespace:   ${NAMESPACE.padEnd(44)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
