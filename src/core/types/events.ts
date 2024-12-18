import { IPluginSettings } from './settings';
import { Editor } from 'obsidian';

/**
 * Énumération de tous les événements possibles dans l'application.
 * Utilisé comme clé typée pour l'EventBus.
 * 
 * @enum {string}
 */
export enum EventName {
    /** Événement de test pour les tests unitaires */
    TEST_EVENT = 'test:event',

    /** Émis quand les paramètres sont mis à jour */
    SETTINGS_UPDATED = 'settings:updated',
    
    /** Émis quand un média est collé dans l'éditeur */
    MEDIA_PASTED = 'media:pasted',
    /** Émis quand un média est uploadé avec succès */
    MEDIA_UPLOADED = 'media:uploaded',
    /** Émis en cas d'erreur lors de l'upload */
    MEDIA_UPLOAD_ERROR = 'media:upload:error',
    
    /** Émis quand la vue est redimensionnée */
    VIEW_RESIZE = 'view:resize',
    /** Émis quand le mode de vue change */
    VIEW_MODE_CHANGED = 'view:mode:changed',

    /** Demande d'insertion d'un média dans l'éditeur */
    EDITOR_INSERT_MEDIA = 'editor:insert:media',
    /** Confirmation de l'insertion d'un média */
    EDITOR_MEDIA_INSERTED = 'editor:media:inserted',

    /** Émis quand les paramètres sont sauvegardés */
    SETTINGS_SAVED = 'settings:saved',

    MEDIA_URL_PASTED = 'media:url:pasted',
    MEDIA_DROPPED = 'media:dropped',

    FRONTMATTER_UPDATED = 'frontmatter:updated'
}

/**
 * Interface définissant le type de données pour chaque événement.
 * Utilise un type mapped pour associer chaque événement à son type de données.
 * 
 * @interface
 */
export interface EventMap {
    /** Données pour l'événement de test */
    [EventName.TEST_EVENT]: {
        /** Donnée optionnelle pour les tests */
        data?: string;
    };

    /** Données émises lors de la mise à jour des paramètres */
    [EventName.SETTINGS_UPDATED]: {
        /** Les nouveaux paramètres */
        settings: IPluginSettings;
    };
    
    /** Données émises lors du collage d'un média */
    [EventName.MEDIA_PASTED]: {
        /** Liste des fichiers collés */
        files: globalThis.FileList;
    };
    
    /** Données émises après un upload réussi */
    [EventName.MEDIA_UPLOADED]: {
        /** URL du média uploadé */
        url: string;
        /** Nom original du fichier */
        fileName: string;
    };
    
    /** Données émises en cas d'erreur d'upload */
    [EventName.MEDIA_UPLOAD_ERROR]: {
        /** L'erreur survenue */
        error: Error;
        /** Nom du fichier concerné */
        fileName: string;
    };
    
    /** Données émises lors du redimensionnement */
    [EventName.VIEW_RESIZE]: {
        /** Nouvelle largeur */
        width: number;
        /** Nouvelle hauteur */
        height: number;
    };
    
    /** Données émises lors du changement de mode */
    [EventName.VIEW_MODE_CHANGED]: {
        /** Nouveau mode */
        mode: 'edit' | 'preview';
    };

    /** Données pour la demande d'insertion de média */
    [EventName.EDITOR_INSERT_MEDIA]: {
        /** L'éditeur cible */
        editor: Editor;
        /** URL du média à insérer */
        url: string;
        /** Nom du fichier pour l'alt text */
        fileName: string;
    };

    /** Données émises après l'insertion d'un média */
    [EventName.EDITOR_MEDIA_INSERTED]: {
        /** L'éditeur où le média a été inséré */
        editor: Editor;
        /** Nom du fichier inséré */
        fileName: string;
    };

    /** Données émises lors de la sauvegarde des paramètres */
    [EventName.SETTINGS_SAVED]: {
        /** Les nouveaux paramètres */
        settings: IPluginSettings;
    };

    [EventName.MEDIA_URL_PASTED]: {
        url: string;
    };
    
    [EventName.MEDIA_DROPPED]: {
        files: File[];
    };

    [EventName.FRONTMATTER_UPDATED]: {
        file: TFile;
        oldPrefix?: string;
        newPrefix: string;
    };
}

/**
 * Type générique pour les callbacks d'événements.
 * Assure que le callback reçoit les bonnes données pour chaque type d'événement.
 * 
 * @template T - Type d'événement (doit être une clé de EventName)
 * @callback EventCallback
 * @param {EventMap[T]} data - Les données associées à l'événement
 * 
 * @example
 * const callback: EventCallback<EventName.MEDIA_UPLOADED> = ({ url, fileName }) => {
 *     console.log(`File ${fileName} uploaded to ${url}`);
 * };
 */
export type EventCallback<T extends EventName> = (data: EventMap[T]) => void;