# =============================================================================
# Makefile - vuejs.secureCodeBox.Dashboard
# Pilotage du projet : développement, build, déploiement, nettoyage
# =============================================================================

.PHONY: help install dev build up down restart logs clean purge status \
        backend-dev frontend-dev backend-install frontend-install \
        docker-build docker-up docker-down docker-logs docker-clean

# Couleurs pour l'affichage
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m

# Variables
DOCKER_COMPOSE := docker-compose
BACKEND_DIR := backend
FRONTEND_DIR := frontend

# =============================================================================
# AIDE
# =============================================================================

help: ## Affiche cette aide
	@echo ""
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║     vuejs.secureCodeBox.Dashboard - Commandes disponibles     ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Développement :$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(dev|install)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Docker :$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(docker|build|up|down|logs|restart)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Maintenance :$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(clean|purge|status)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# DÉVELOPPEMENT
# =============================================================================

install: backend-install frontend-install ## Installe toutes les dépendances
	@echo "$(GREEN)✓ Dépendances installées$(NC)"

backend-install: ## Installe les dépendances backend
	@echo "$(CYAN)→ Installation des dépendances backend...$(NC)"
	cd $(BACKEND_DIR) && npm install

frontend-install: ## Installe les dépendances frontend
	@echo "$(CYAN)→ Installation des dépendances frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm install

dev: ## Lance le développement (backend + frontend en parallèle)
	@echo "$(CYAN)→ Démarrage en mode développement...$(NC)"
	@echo "$(YELLOW)  Backend:  http://localhost:8080$(NC)"
	@echo "$(YELLOW)  Frontend: http://localhost:3000$(NC)"
	@echo ""
	@$(MAKE) -j2 backend-dev frontend-dev

backend-dev: ## Lance le backend en mode développement
	@echo "$(CYAN)→ Backend (port 8080)...$(NC)"
	cd $(BACKEND_DIR) && npm run dev

frontend-dev: ## Lance le frontend en mode développement
	@echo "$(CYAN)→ Frontend (port 3000)...$(NC)"
	cd $(FRONTEND_DIR) && npm run dev

# =============================================================================
# DOCKER - BUILD
# =============================================================================

build: docker-build ## Construit les images Docker

docker-build: ## Construit les images Docker
	@echo "$(CYAN)→ Construction des images Docker...$(NC)"
	$(DOCKER_COMPOSE) build
	@echo "$(GREEN)✓ Images construites$(NC)"

docker-build-no-cache: ## Construit les images sans cache
	@echo "$(CYAN)→ Construction des images (sans cache)...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache
	@echo "$(GREEN)✓ Images construites$(NC)"

# =============================================================================
# DOCKER - EXÉCUTION
# =============================================================================

up: docker-up ## Démarre les conteneurs

docker-up: ## Démarre les conteneurs Docker
	@echo "$(CYAN)→ Démarrage des conteneurs...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "$(GREEN)✓ Dashboard disponible sur http://localhost:3000$(NC)"
	@echo "$(GREEN)✓ API disponible sur http://localhost:8080$(NC)"

down: docker-down ## Arrête les conteneurs

docker-down: ## Arrête les conteneurs Docker
	@echo "$(CYAN)→ Arrêt des conteneurs...$(NC)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Conteneurs arrêtés$(NC)"

restart: ## Redémarre les conteneurs
	@echo "$(CYAN)→ Redémarrage des conteneurs...$(NC)"
	$(DOCKER_COMPOSE) restart
	@echo "$(GREEN)✓ Conteneurs redémarrés$(NC)"

logs: docker-logs ## Affiche les logs des conteneurs

docker-logs: ## Affiche les logs Docker (follow)
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## Affiche les logs du backend
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## Affiche les logs du frontend
	$(DOCKER_COMPOSE) logs -f frontend

# =============================================================================
# STATUS
# =============================================================================

status: ## Affiche l'état des conteneurs
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║                    État des conteneurs                        ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@$(DOCKER_COMPOSE) ps
	@echo ""

ps: status ## Alias pour status

# =============================================================================
# NETTOYAGE
# =============================================================================

clean: ## Nettoie les fichiers temporaires et node_modules
	@echo "$(CYAN)→ Nettoyage des fichiers temporaires...$(NC)"
	rm -rf $(BACKEND_DIR)/node_modules
	rm -rf $(BACKEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules
	rm -rf $(FRONTEND_DIR)/dist
	@echo "$(GREEN)✓ Nettoyage terminé$(NC)"

docker-clean: ## Supprime les conteneurs et images du projet
	@echo "$(CYAN)→ Suppression des conteneurs...$(NC)"
	$(DOCKER_COMPOSE) down --rmi local --volumes --remove-orphans
	@echo "$(GREEN)✓ Conteneurs et images supprimés$(NC)"

purge: clean docker-clean ## Supprime tout (node_modules, dist, conteneurs, images)
	@echo "$(YELLOW)⚠ Nettoyage complet effectué$(NC)"

docker-prune: ## Nettoie les ressources Docker inutilisées
	@echo "$(CYAN)→ Nettoyage des ressources Docker inutilisées...$(NC)"
	docker system prune -f
	@echo "$(GREEN)✓ Ressources Docker nettoyées$(NC)"

# =============================================================================
# PRODUCTION
# =============================================================================

prod: docker-build docker-up ## Build et démarre en production
	@echo "$(GREEN)✓ Application démarrée en mode production$(NC)"

prod-restart: docker-down docker-build docker-up ## Rebuild et redémarre
	@echo "$(GREEN)✓ Application redémarrée$(NC)"

# =============================================================================
# UTILITAIRES
# =============================================================================

shell-backend: ## Ouvre un shell dans le conteneur backend
	$(DOCKER_COMPOSE) exec backend sh

shell-frontend: ## Ouvre un shell dans le conteneur frontend
	$(DOCKER_COMPOSE) exec frontend sh

check: ## Vérifie les prérequis
	@echo "$(CYAN)→ Vérification des prérequis...$(NC)"
	@command -v node >/dev/null 2>&1 && echo "$(GREEN)✓ Node.js$(NC): $$(node --version)" || echo "$(RED)✗ Node.js non installé$(NC)"
	@command -v npm >/dev/null 2>&1 && echo "$(GREEN)✓ npm$(NC): $$(npm --version)" || echo "$(RED)✗ npm non installé$(NC)"
	@command -v docker >/dev/null 2>&1 && echo "$(GREEN)✓ Docker$(NC): $$(docker --version | cut -d' ' -f3)" || echo "$(RED)✗ Docker non installé$(NC)"
	@command -v docker-compose >/dev/null 2>&1 && echo "$(GREEN)✓ Docker Compose$(NC): $$(docker-compose --version | cut -d' ' -f4)" || echo "$(RED)✗ Docker Compose non installé$(NC)"
	@command -v kubectl >/dev/null 2>&1 && echo "$(GREEN)✓ kubectl$(NC): $$(kubectl version --client -o json 2>/dev/null | grep -o '"gitVersion": "[^"]*"' | cut -d'"' -f4)" || echo "$(YELLOW)⚠ kubectl non installé$(NC)"
	@echo ""
