import { customApi, NAMESPACE } from './client';

export interface ScanSpec {
  scanType: string;
  parameters: string[];
}

export interface ScanStatus {
  state: string;
  errorDescription?: string;
  findings?: {
    count: number;
    severities: {
      informational?: number;
      low?: number;
      medium?: number;
      high?: number;
      critical?: number;
    };
  };
  rawResultDownloadLink?: string;
  findingsDownloadLink?: string;
}

export interface ScanInfo {
  name: string;
  namespace: string;
  scanType: string;
  status: string;
  parameters: string[];
  findings: number;
  startTime: string;
  finishedTime?: string;
  duration: string;
  rawResultDownloadLink?: string;
  findingsDownloadLink?: string;
}

const GROUP = 'execution.securecodebox.io';
const VERSION = 'v1';

function formatDuration(startTime: Date, endTime?: Date): string {
  const end = endTime || new Date();
  const diff = Math.floor((end.getTime() - startTime.getTime()) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

export async function listScans(namespace: string = NAMESPACE): Promise<ScanInfo[]> {
  try {
    const response = await customApi.listNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: 'scans'
    });

    const items = (response as any).items || [];

    return items.map((item: any) => {
      const startTime = item.metadata?.creationTimestamp ? new Date(item.metadata.creationTimestamp) : new Date();
      const finishedTime = item.status?.finishedAt ? new Date(item.status.finishedAt) : undefined;

      return {
        name: item.metadata?.name || 'unknown',
        namespace: item.metadata?.namespace || namespace,
        scanType: item.spec?.scanType || 'unknown',
        status: item.status?.state || 'Pending',
        parameters: item.spec?.parameters || [],
        findings: item.status?.findings?.count || 0,
        startTime: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        finishedTime: finishedTime?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: formatDuration(startTime, finishedTime),
        rawResultDownloadLink: item.status?.rawResultDownloadLink,
        findingsDownloadLink: item.status?.findingDownloadLink
      };
    });
  } catch (error) {
    console.error('[K8s] Error listing scans:', error);
    return [];
  }
}

export async function getScan(name: string, namespace: string = NAMESPACE): Promise<ScanInfo | null> {
  try {
    const response = await customApi.getNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: 'scans',
      name
    });

    const item = response as any;
    const startTime = item.metadata?.creationTimestamp ? new Date(item.metadata.creationTimestamp) : new Date();
    const finishedTime = item.status?.finishedAt ? new Date(item.status.finishedAt) : undefined;

    return {
      name: item.metadata?.name || 'unknown',
      namespace: item.metadata?.namespace || namespace,
      scanType: item.spec?.scanType || 'unknown',
      status: item.status?.state || 'Pending',
      parameters: item.spec?.parameters || [],
      findings: item.status?.findings?.count || 0,
      startTime: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      finishedTime: finishedTime?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      duration: formatDuration(startTime, finishedTime),
      rawResultDownloadLink: item.status?.rawResultDownloadLink,
      findingsDownloadLink: item.status?.findingDownloadLink
    };
  } catch (error) {
    console.error('[K8s] Error getting scan:', error);
    return null;
  }
}

export async function createScan(
  name: string,
  scanType: string,
  parameters: string[],
  namespace: string = NAMESPACE
): Promise<boolean> {
  try {
    const scan = {
      apiVersion: `${GROUP}/v1`,
      kind: 'Scan',
      metadata: {
        name,
        namespace
      },
      spec: {
        scanType,
        parameters
      }
    };

    await customApi.createNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: 'scans',
      body: scan
    });

    return true;
  } catch (error) {
    console.error('[K8s] Error creating scan:', error);
    return false;
  }
}

export async function deleteScan(name: string, namespace: string = NAMESPACE): Promise<boolean> {
  try {
    await customApi.deleteNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: 'scans',
      name
    });
    return true;
  } catch (error) {
    console.error('[K8s] Error deleting scan:', error);
    return false;
  }
}

export async function listScanTypes(namespace: string = NAMESPACE): Promise<string[]> {
  try {
    const response = await customApi.listNamespacedCustomObject({
      group: GROUP,
      version: VERSION,
      namespace,
      plural: 'scantypes'
    });

    const items = (response as any).items || [];
    return items.map((item: any) => item.metadata?.name || 'unknown');
  } catch (error) {
    console.error('[K8s] Error listing scan types:', error);
    return [];
  }
}
