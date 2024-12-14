import { EventBusService } from './EventBusService';
import { ErrorService } from './ErrorService';

/**
 * Service de base pour le plugin.
 * Fournit un accès aux services communs et implémente le pattern singleton.
 */
export abstract class BaseService {
    protected eventBus: EventBusService;
    protected errorService: ErrorService;

    protected constructor() {
        this.eventBus = EventBusService.getInstance();
        this.errorService = ErrorService.getInstance();
    }

    /**
     * Méthode à implémenter par les services enfants pour leur initialisation.
     */
    protected abstract init(): void;
} 