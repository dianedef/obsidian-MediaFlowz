# Structure des Tests

## Organisation des dossiers

```
tests/
├── __mocks__/           # Mocks automatiques des modules externes
│   └── obsidian.ts      # Mock du module Obsidian
│
├── mocks/               # Nos mocks personnalisés
│   ├── api/            # Configuration des APIs mockées
│   │   └── cloudinary.handlers.ts  # Handlers MSW pour Cloudinary
│   │
│   └── services/       # Mocks de nos services internes
│       ├── ErrorService.mock.ts
│       └── EventBusService.mock.ts
│
├── services/           # Tests des services
│   └── CloudinaryService.test.ts
│
├── setup.ts            # Configuration globale des tests
└── vitest.config.ts    # Configuration de Vitest
```

## Technologies utilisées

- **Vitest** : Framework de test
- **MSW** (Mock Service Worker) : Pour mocker les appels HTTP
- **JSDOM** : Pour simuler le DOM dans les tests

## Mocks

### Modules externes (`__mocks__/`)
- Mocks automatiques via le système de mocking de Vitest
- Utilisé pour les dépendances externes comme Obsidian

### Services internes (`mocks/services/`)
- Implémentations mockées de nos services
- Utilisent `vi.fn()` pour créer des spies/stubs

### API (`mocks/api/`)
- Handlers MSW pour intercepter les requêtes HTTP
- Simulent les réponses de l'API Cloudinary

## Configuration

### `setup.ts`
- Configuration globale pour tous les tests
- Mocks des classes DOM (File, DataTransfer, ClipboardEvent)
- Configuration de MSW

### `vitest.config.ts`
- Configuration de Vitest
- Alias de chemins
- Configuration de l'environnement JSDOM 