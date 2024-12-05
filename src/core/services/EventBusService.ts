import { EventName, EventMap, EventCallback } from '../types/events';

/**
 * Service de gestion des événements de l'application.
 * Implémente le pattern Singleton et permet la communication entre les composants.
 * Utilise un système de typage fort pour garantir la cohérence des événements.
 * 
 * @example
 * const eventBus = EventBusService.getInstance();
 * eventBus.on(EventName.MEDIA_UPLOADED, ({ url, fileName }) => {
 *     console.log(`File ${fileName} uploaded to ${url}`);
 * });
 */
export class EventBusService {
    private static instance: EventBusService;
    private listeners: Map<EventName, Set<EventCallback<any>>>;

    private constructor() {
        this.listeners = new Map();
    }

    /**
     * Retourne l'instance unique du service.
     * Crée l'instance si elle n'existe pas encore.
     * 
     * @returns {EventBusService} L'instance unique du service
     */
    static getInstance(): EventBusService {
        if (!EventBusService.instance) {
            EventBusService.instance = new EventBusService();
        }
        return EventBusService.instance;
    }

    /**
     * Enregistre un écouteur pour un type d'événement spécifique.
     * Utilise les génériques pour assurer le typage correct des données.
     * 
     * @template T - Type d'événement (doit être une clé de EventName)
     * @param {T} event - L'événement à écouter
     * @param {EventCallback<T>} callback - La fonction à appeler quand l'événement est émis
     * @example
     * eventBus.on(EventName.SETTINGS_UPDATED, ({ settings }) => {
     *     updateConfiguration(settings);
     * });
     */
    on<T extends EventName>(event: T, callback: EventCallback<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
    }

    /**
     * Émet un événement avec ses données associées.
     * Vérifie le type des données au moment de la compilation.
     * 
     * @template T - Type d'événement (doit être une clé de EventName)
     * @param {T} event - L'événement à émettre
     * @param {EventMap[T]} data - Les données associées à l'événement
     * @example
     * eventBus.emit(EventName.MEDIA_UPLOADED, {
     *     url: 'https://example.com/image.jpg',
     *     fileName: 'image.jpg'
     * });
     */
    emit<T extends EventName>(event: T, data: EventMap[T]): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Supprime un écouteur spécifique pour un type d'événement.
     * Si c'était le dernier écouteur, supprime aussi l'entrée dans la Map.
     * 
     * @template T - Type d'événement (doit être une clé de EventName)
     * @param {T} event - L'événement dont on veut retirer l'écouteur
     * @param {EventCallback<T>} callback - L'écouteur à retirer
     */
    off<T extends EventName>(event: T, callback: EventCallback<T>): void {
        this.listeners.get(event)?.delete(callback);
        // Nettoyage si plus aucun listener
        if (this.listeners.get(event)?.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Enregistre un écouteur qui ne sera appelé qu'une seule fois.
     * Se désenregistre automatiquement après la première exécution.
     * 
     * @template T - Type d'événement (doit être une clé de EventName)
     * @param {T} event - L'événement à écouter une fois
     * @param {EventCallback<T>} callback - La fonction à appeler une fois
     * @example
     * eventBus.once(EventName.MEDIA_UPLOADED, ({ url }) => {
     *     showUploadConfirmation(url);
     * });
     */
    once<T extends EventName>(event: T, callback: EventCallback<T>): void {
        const onceCallback = (data: EventMap[T]) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }

    /**
     * Retourne le nombre d'écouteurs pour un événement donné.
     * Utile pour le debugging et les tests.
     * 
     * @param {EventName} event - L'événement à vérifier
     * @returns {number} Le nombre d'écouteurs
     */
    getListenerCount(event: EventName): number {
        return this.listeners.get(event)?.size ?? 0;
    }
} 