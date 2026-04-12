import { coreApi, NAMESPACE, PodInfo, PodMetrics, ContainerInfo, getAge, parseResource } from './client';

/**
 * Liste tous les pods du namespace avec leurs informations détaillées
 */
export async function listPods(namespace: string = NAMESPACE): Promise<PodInfo[]> {
  const response = await coreApi.listNamespacedPod({ namespace });
  const items = (response as any).items || (response as any).body?.items || [];

  return items.map((pod: any) => {
    const containers: ContainerInfo[] = (pod.spec?.containers || []).map((container: any) => ({
      name: container.name,
      image: container.image || '',
      ready: pod.status?.containerStatuses?.find((cs: any) => cs.name === container.name)?.ready || false,
      restarts: pod.status?.containerStatuses?.find((cs: any) => cs.name === container.name)?.restartCount || 0,
      ports: (container.ports || []).map((p: any) => ({
        name: p.name,
        containerPort: p.containerPort,
        protocol: p.protocol || 'TCP'
      })),
      env: (container.env || [])
        .filter((e: any) => e.value) // Exclure les envFrom
        .slice(0, 10) // Limiter à 10
        .map((e: any) => ({ name: e.name, value: e.value || '' }))
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
    const response = await coreApi.readNamespacedPod({ name, namespace });
    const pod = (response as any).body || response;

    const containers: ContainerInfo[] = (pod.spec?.containers || []).map((container: any) => ({
      name: container.name,
      image: container.image || '',
      ready: pod.status?.containerStatuses?.find((cs: any) => cs.name === container.name)?.ready || false,
      restarts: pod.status?.containerStatuses?.find((cs: any) => cs.name === container.name)?.restartCount || 0,
      ports: (container.ports || []).map((p: any) => ({
        name: p.name,
        containerPort: p.containerPort,
        protocol: p.protocol || 'TCP'
      })),
      env: (container.env || [])
        .filter((e: any) => e.value)
        .map((e: any) => ({ name: e.name, value: e.value || '' }))
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
 * Note: Sans metrics-server, retourne des valeurs simulées basées sur l'état du pod
 */
export async function getPodMetrics(name: string, namespace: string = NAMESPACE): Promise<PodMetrics | null> {
  try {
    // Récupérer les infos du pod pour les limites
    const podResponse = await coreApi.readNamespacedPod({ name, namespace });
    const pod = (podResponse as any).body || podResponse;

    let cpuLimit = 0;
    let memoryLimit = 0;

    // Agréger les limites
    for (const container of (pod.spec?.containers || [])) {
      cpuLimit += parseResource(container.resources?.limits?.cpu);
      memoryLimit += parseResource(container.resources?.limits?.memory);
    }

    // Valeurs par défaut si pas de limites définies
    cpuLimit = cpuLimit || 1000; // 1 CPU
    memoryLimit = memoryLimit || 512 * 1024 * 1024; // 512Mi

    // Simuler des métriques basées sur l'état du pod
    const isRunning = pod.status?.phase === 'Running';
    const baseUsage = isRunning ? 0.1 + Math.random() * 0.3 : 0;

    return {
      name,
      cpu: Math.round(cpuLimit * baseUsage),
      cpuLimit,
      memory: Math.round(memoryLimit * baseUsage),
      memoryLimit
    };
  } catch (error) {
    console.warn(`[Pods] Error getting metrics for ${name}:`, (error as Error).message);
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
  const response = await coreApi.readNamespacedPodLog({
    name,
    namespace,
    container,
    follow: false,
    tailLines,
    timestamps: true
  });

  return (response as any).body || response;
}

/**
 * Supprime un pod
 */
export async function deletePod(name: string, namespace: string = NAMESPACE): Promise<boolean> {
  try {
    await coreApi.deleteNamespacedPod({ name, namespace });
    return true;
  } catch (error) {
    console.error(`[Pods] Error deleting pod ${name}:`, error);
    return false;
  }
}
