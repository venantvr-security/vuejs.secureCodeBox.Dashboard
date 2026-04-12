import * as k8s from '@kubernetes/client-node';

// Charger la configuration Kubernetes
const kc = new k8s.KubeConfig();

// En développement: utiliser ~/.kube/config
// En production (dans le cluster): utiliser le service account
try {
  kc.loadFromCluster();
  console.log('[K8s] Loaded in-cluster configuration');
} catch {
  kc.loadFromDefault();
  console.log('[K8s] Loaded default kubeconfig');
}

// Clients API
export const coreApi = kc.makeApiClient(k8s.CoreV1Api);
export const appsApi = kc.makeApiClient(k8s.AppsV1Api);
export const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
export const metricsApi = kc.makeApiClient(k8s.Metrics);

// Configuration
export const NAMESPACE = process.env.NAMESPACE || 'securecodebox';
export const SECURECODEBOX_GROUP = 'execution.securecodebox.io';
export const SECURECODEBOX_VERSION = 'v1';

// Types
export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  ip: string;
  node: string;
  containers: ContainerInfo[];
}

export interface ContainerInfo {
  name: string;
  image: string;
  ready: boolean;
  restarts: number;
  ports: PortInfo[];
  env: { name: string; value: string }[];
}

export interface PortInfo {
  name?: string;
  containerPort: number;
  protocol: string;
}

export interface PodMetrics {
  name: string;
  cpu: number;       // millicores
  cpuLimit: number;
  memory: number;    // bytes
  memoryLimit: number;
}

export interface ScanInfo {
  name: string;
  namespace: string;
  status: string;
  scanType: string;
  parameters: string[];
  startTime?: string;
  endTime?: string;
  findingsCount?: number;
}

// Helper: calculer l'âge
export function getAge(creationTimestamp: string): string {
  const created = new Date(creationTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

// Helper: parser les ressources (ex: "100m" -> 100, "256Mi" -> 268435456)
export function parseResource(value: string | undefined): number {
  if (!value) return 0;

  if (value.endsWith('m')) {
    return parseInt(value.slice(0, -1));
  }
  if (value.endsWith('Mi')) {
    return parseInt(value.slice(0, -2)) * 1024 * 1024;
  }
  if (value.endsWith('Gi')) {
    return parseInt(value.slice(0, -2)) * 1024 * 1024 * 1024;
  }
  if (value.endsWith('Ki')) {
    return parseInt(value.slice(0, -2)) * 1024;
  }
  if (value.endsWith('n')) {
    return parseInt(value.slice(0, -1)) / 1000000;
  }
  return parseInt(value) || 0;
}

export { kc };
