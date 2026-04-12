# Instructions pour Claude

## Langue et style

- **Toujours utiliser les accents français** dans tous les fichiers : é, è, ê, ë, à, â, ù, û, ô, î, ï, ç
- Exemples : créer, déployer, opérateur, résumé, terminé, préchargement, vérification, prérequis
- **Pas de diagrammes ASCII** - utiliser Mermaid pour les diagrammes

## Documentation

- Utiliser **Mermaid** pour les diagrammes dans les fichiers Markdown
- Types de diagrammes préférés :
  - `flowchart TD` pour les workflows
  - `sequenceDiagram` pour les flux de données
  - `graph LR` pour les architectures

## Projets liés

Ce projet fait partie d'un écosystème de sécurité WordPress :

| Projet | Description | Repo |
|--------|-------------|------|
| **secureCodeBox** | Configuration K8s et scripts d'installation | `secureCodeBox/` |
| **go-wpscan-wpvuln-enricher** | Enricher Go - Parser + Hook | `go-wpscan-wpvuln-enricher/` |
| **python-wpscan-wpvuln-enricher** | Enricher Python - Version alternative | `python-wpscan-wpvuln-enricher/` |
| **vuejs.secureCodeBox.Dashboard** | Dashboard Vue.js (ce repo) | `vuejs.secureCodeBox.Dashboard/` |

## Ce projet

Dashboard web pour visualiser et gérer les scans secureCodeBox.

### Stack technique

- **Frontend** : Vue 3 + TypeScript + PrimeVue
- **Backend** : Node.js + Express + WebSocket
- **API K8s** : @kubernetes/client-node

### Structure

```
vuejs.secureCodeBox.Dashboard/
├── frontend/           # Application Vue.js
│   └── src/
│       ├── views/      # Pages (Dashboard, Scans, ScanDetail, etc.)
│       ├── components/ # Composants réutilisables
│       └── stores/     # Pinia stores
└── backend/            # API Express
    └── src/
        ├── server.ts   # Point d'entrée
        └── kubernetes/ # Clients K8s
```

### Commandes

```bash
# Frontend (port 5173)
cd frontend && npm run dev

# Backend (port 8081)
cd backend && npm run dev
```

### Accès MinIO

Le backend lit les findings directement depuis MinIO via `mc cat` :
```typescript
kubectl exec -n securecodebox securecodebox-operator-minio-0 -- mc cat local/securecodebox/scan-{uid}/findings.json
```
