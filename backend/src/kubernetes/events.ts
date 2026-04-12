import { coreApi, NAMESPACE } from './client';

export interface K8sEvent {
  time: string;
  type: string;
  reason: string;
  object: string;
  message: string;
  count: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
}

export async function listEvents(namespace: string = NAMESPACE, limit: number = 50): Promise<K8sEvent[]> {
  try {
    const response = await coreApi.listNamespacedEvent(namespace);
    const items = response.body.items || [];

    // Trier par timestamp décroissant
    const sortedItems = items.sort((a, b) => {
      const timeA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const timeB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return timeB - timeA;
    });

    // Limiter le nombre de résultats
    const limitedItems = sortedItems.slice(0, limit);

    return limitedItems.map(event => {
      const timestamp = event.lastTimestamp
        ? new Date(event.lastTimestamp)
        : event.eventTime
          ? new Date(event.eventTime)
          : new Date();

      return {
        time: timestamp.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        type: event.type || 'Normal',
        reason: event.reason || 'Unknown',
        object: `${event.involvedObject?.kind || 'Unknown'}/${event.involvedObject?.name || 'unknown'}`,
        message: event.message || '',
        count: event.count || 1,
        firstTimestamp: event.firstTimestamp?.toISOString(),
        lastTimestamp: event.lastTimestamp?.toISOString()
      };
    });
  } catch (error) {
    console.error('[K8s] Error listing events:', error);
    return [];
  }
}

export async function watchEvents(
  namespace: string = NAMESPACE,
  callback: (event: K8sEvent) => void
): Promise<() => void> {
  let aborted = false;

  const poll = async () => {
    let lastSeen = '';

    while (!aborted) {
      try {
        const events = await listEvents(namespace, 10);

        for (const event of events) {
          const eventKey = `${event.time}-${event.object}-${event.reason}`;
          if (eventKey !== lastSeen) {
            callback(event);
            lastSeen = eventKey;
            break; // Envoyer un event à la fois
          }
        }
      } catch (error) {
        console.error('[K8s] Error watching events:', error);
      }

      // Attendre 2 secondes avant le prochain polling
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  poll();

  return () => {
    aborted = true;
  };
}
