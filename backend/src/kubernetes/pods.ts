import { coreApi, metricsApi, NAMESPACE, PodInfo, PodMetrics, ContainerInfo, getAge, parseResource } from './client';
import * as k8s from '@kubernetes/client-node';

/**
 * Liste tous les pods du namespace avec leurs informations détaillées
 */
export async function listPods(namespace: string = NAMESPACE): Promise<PodInfo[]> {
  const response = await coreApi.listNamespacedPod(namespace);

  return response.body.items.map(pod => {
    const containers: ContainerInfo[] = (pod.spec?.containers || []).map(container => ({
      name: container.name,
      image: container.image || '',
      ready: pod.status?.containerStatuses?.find(cs => cs.name === container.name)?.ready || false,
      restarts: pod.status?.containerStatuses?.find(cs => cs.name === container.name)?.restartCount || 0,
      ports: (container.ports || []).map(p => ({
        name: p.name,
        containerPort: p.containerPort,
        protocol: p.protocol || 'TCP'
      })),
      env: (container.env || [])
        .filter(e => e.value) // Exclure les envFrom
        .slice(0, 10) // Limiter à 10
        .map(e => ({ name: e.name, value: e.value || '' }))
    }));

    const totalRestarts = containers.reduce((sum, c) => sum + c.restarts, 0);
    const readyContainers = containers.filter(c => c.ready).length;

    return {
      name: pod.metadata?.name || '',
      namespace: pod.metadata?.namespace || '',
      status: pod.status?.phase || 'Unknown',
      ready: `${readyContainers}/${containers.length}`,
      restarts: totalRestarts,
      age: getAge(pod.metadata?.creationTimestamp || new Date().toISOString()),
      ip: pod.status?.podIP || '',
      node: pod.spec?.nodeName || '',
      containers
    };
  });
}

/**
 * Récupère les détails d'un pod spécifique
 */
export async function getPod(name: string, namespace: string = NAMESPACE): Promise<PodInfo | null> {
  try {
    const response = await coreApi.readNamespacedPod(name, namespace);
    const pod = response.body;

    const containers: ContainerInfo[] = (pod.spec?.containers || []).map(container => ({
      name: container.name,
      image: container.image || '',
      ready: pod.status?.containerStatuses?.find(cs => cs.name === container.name)?.ready || false,
      restarts: pod.status?.containerStatuses?.find(cs => cs.name === container.name)?.restartCount || 0,
      ports: (container.ports || []).map(p => ({
        name: p.name,
        containerPort: p.containerPort,
        protocol: p.protocol || 'TCP'
      })),
      env: (container.env || [])
        .filter(e => e.value)
        .map(e => ({ name: e.name, value: e.value || '' }))
    }));

    const totalRestarts = containers.reduce((sum, c) => sum + c.restarts, 0);
    const readyContainers = containers.filter(c => c.ready).length;

    return {
      name: pod.metadata?.name || '',
      namespace: pod.metadata?.namespace || '',
      status: pod.status?.phase || 'Unknown',
      ready: `${readyContainers}/${containers.length}`,
      restarts: totalRestarts,
      age: getAge(pod.metadata?.creationTimestamp || new Date().toISOString()),
      ip: pod.status?.podIP || '',
      node: pod.spec?.nodeName || '',
      containers
    };
  } catch (error) {
    console.error(`[Pods] Error getting pod ${name}:`, error);
    return null;
  }
}

/**
 * Récupère les métriques d'un pod (CPU/MEM)
 * Nécessite metrics-server dans le cluster
 */
export async function getPodMetrics(name: string, namespace: string = NAMESPACE): Promise<PodMetrics | null> {
  try {
    // Récupérer les métriques via l'API metrics
    const metricsResponse = await metricsApi.getPodMetrics(namespace, name);
    const metrics = metricsResponse.body as any;

    // Récupérer les limites du pod
    const podResponse = await coreApi.readNamespacedPod(name, namespace);
    const pod = podResponse.body;

    let totalCpu = 0;
    let totalMemory = 0;
    let cpuLimit = 0;
    let memoryLimit = 0;

    // Agréger les métriques de tous les containers
    for (const container of (metrics.containers || [])) {
      totalCpu += parseResource(container.usage?.cpu);
      totalMemory += parseResource(container.usage?.memory);
    }

    // Agréger les limites
    for (const container of (pod.spec?.containers || [])) {
      cpuLimit += parseResource(container.resources?.limits?.cpu);
      memoryLimit += parseResource(container.resources?.limits?.memory);
    }

    return {
      name,
      cpu: totalCpu,
      cpuLimit: cpuLimit || 1000, // Default 1 CPU
      memory: totalMemory,
      memoryLimit: memoryLimit || 512 * 1024 * 1024 // Default 512Mi
    };
  } catch (error) {
    // Metrics server n'est peut-être pas installé
    console.warn(`[Pods] Metrics not available for ${name}:`, (error as Error).message);
    return null;
  }
}

/**
 * Récupère les métriques de tous les pods
 */
export async function getAllPodMetrics(namespace: string = NAMESPACE): Promise<PodMetrics[]> {
  const pods = await listPods(namespace);
  const metrics: PodMetrics[] = [];

  for (const pod of pods) {
    const podMetrics = await getPodMetrics(pod.name, namespace);
    if (podMetrics) {
      metrics.push(podMetrics);
    }
  }

  return metrics;
}

/**
 * Récupère les logs d'un pod
 */
export async function getPodLogs(
  name: string,
  container?: string,
  namespace: string = NAMESPACE,
  tailLines: number = 100
): Promise<string> {
  const response = await coreApi.readNamespacedPodLog(
    name,
    namespace,
    container,
    false, // follow
    undefined, // insecureSkipTLSVerifyBackend
    undefined, // limitBytes
    undefined, // pretty
    false, // previous
    undefined, // sinceSeconds
    tailLines,
    true // timestamps
  );

  return response.body;
}

/**
 * Supprime un pod
 */
export async function deletePod(name: string, namespace: string = NAMESPACE): Promise<boolean> {
  try {
    await coreApi.deleteNamespacedPod(name, namespace);
    return true;
  } catch (error) {
    console.error(`[Pods] Error deleting pod ${name}:`, error);
    return false;
  }
}
