# Roadmap complète et détaillée

> Pour développer un moteur de jeux 3D & WebXR en TypeScript avec WebComponents Vue 3, WebAssembly, physique intégrée, clavier / gamepad / contrôleurs VR / hand tracking, et tests Vitest

---

## 1. Définir le périmètre exact du moteur ✅

Avant toute implémentation, il faut verrouiller le périmètre produit.

### 1.1 Objectif du projet ✅

Le projet doit être défini comme :

> un moteur/runtime 3D interactif orienté web, compatible desktop et WebXR, exposé via Web Components, extensible, testable, et conçu pour supporter plusieurs modes de contrôle.

Le moteur doit couvrir :

- rendu 3D
- scène et entités
- moteur physique intégré
- abstraction d’input
- support WebXR
- support hand tracking
- Web Components en Vue 3
- API gameplay
- pipeline de tests
- intégration WebAssembly pour les zones critiques

### 1.2 Modes d’interaction à supporter ✅

Le moteur doit fonctionner dans les modes suivants :

#### Mode desktop

- clavier
- souris
- gamepad

#### Mode XR avec contrôleurs

- contrôleur gauche
- contrôleur droit
- ray interaction
- grip / trigger / thumbstick / boutons

#### Mode XR avec hand tracking

- main gauche
- main droite
- joints
- pinch
- poke
- near interaction
- fallback si certaines capacités manquent

### 1.3 Principe d’abstraction fondamental ✅

Le gameplay ne doit jamais dépendre directement :

- d’un clavier
- d’une manette
- d’un contrôleur XR
- d’une main trackée

Le gameplay doit dépendre d’**intentions** :

- move
- look
- jump
- grab
- use
- teleport
- menu
- pinch
- poke
- select
- confirm
- cancel

---

## 2. Fixer les contraintes non négociables ✅

### 2.1 Stack technique imposée ✅

Tout le projet doit utiliser :

- **TypeScript**
- **Vite**
- **Vitest**
- **Vue 3 Composition API**
- **Web Components**
- **WebAssembly** pour les parties critiques

### 2.2 Contraintes d’architecture ✅

Tu dois imposer les règles suivantes :

- le cœur moteur ne dépend pas de Vue
- l’UI ne contient pas la logique métier centrale
- la physique ne dépend pas de l’UI
- le gameplay dépend d’interfaces stables
- WebAssembly est encapsulé derrière des APIs TypeScript
- toute fonctionnalité importante doit être testée

### 2.3 Exigences de qualité ✅

Le moteur doit être :

- modulaire
- testable
- documenté
- extensible
- capable de dégradation progressive
- indépendant d’un seul périphérique XR
- indépendant d’un seul backend physique

---

## 3. Concevoir l’architecture générale ✅

L’architecture doit être organisée en couches fonctionnelles.

### 3.1 Couche Core Runtime ✅

Responsabilités :

- boucle moteur
- gestion du temps
- lifecycle
- scheduling
- orchestration des systèmes
- événements globaux
- état global du runtime

### 3.2 Couche Math ✅

Responsabilités :

- vecteurs
- matrices
- quaternions
- géométrie
- intersections
- volumes
- helpers pour physique, rendu, XR et hand tracking

### 3.3 Couche Scene ✅

Responsabilités :

- entités
- hiérarchie
- transforms
- caméras
- lights
- layers
- activation/destruction

### 3.4 Couche Renderer ✅

Responsabilités :

- abstraction graphique
- shaders
- materials
- meshes
- textures
- passes de rendu
- pipeline XR

### 3.5 Couche Physics ✅

Responsabilités :

- rigid bodies
- colliders
- raycasts
- overlaps
- triggers
- world stepping
- synchronisation scène ↔ physique

### 3.6 Couche Input ✅

Responsabilités :

- clavier/souris
- gamepad
- contrôleurs XR
- mains XR
- normalisation des signaux
- mapping vers actions

### 3.7 Couche XR ✅

Responsabilités :

- session WebXR
- tracking tête / contrôleurs / mains
- capacités XR
- reference spaces
- mode controllers / hands
- fallback XR

### 3.8 Couche Interaction ✅

Responsabilités :

- ray interaction
- near interaction
- grab
- poke
- pinch
- interaction UI
- teleportation

### 3.9 Couche Audio ✅

Responsabilités :

- sources audio
- listener
- spatialisation
- lecture/arrêt/boucle
- feedback sonore interaction

### 3.10 Couche Assets ✅

Responsabilités :

- chargement d’assets
- cache
- textures
- meshes
- matériaux
- audio
- scènes
- manifests

### 3.11 Couche UI Core ✅

Responsabilités :

- primitives UI moteur
- modèle d’état UI
- focus
- routing UI interne si nécessaire
- bridge entre runtime et composants d’affichage

### 3.12 Couche UI WebComponents ✅

Responsabilités :

- composants Vue 3 custom elements
- encapsulation du moteur
- overlays
- HUD
- outils d’inspection exposés au DOM

### 3.13 Couche Gameplay ✅

Responsabilités :

- scripts de haut niveau
- logique de jeu
- interactions métier
- règles de gameplay
- helpers de spawning
- patterns de gameplay réutilisables

### 3.14 Couche Devtools ✅

Responsabilités :

- inspection runtime
- stats
- profiling léger
- visualisation input/XR/hands
- arbre de scène
- debug physique

### 3.15 Couche Testing ✅

Responsabilités :

- mocks
- fixtures
- helpers de test
- test harness runtime
- simulation d’inputs et d’états XR

### 3.16 Couche WASM ✅

Responsabilités :

- backend natif / wasm
- calculs intensifs
- physique
- collision
- potentiellement pathfinding plus tard
- contrats mémoire / handles

### 3.17 Couche Examples ✅

Responsabilités :

- scènes de démonstration
- cas d’usage minimaux
- validation fonctionnelle
- exemples d’intégration
- exemples de modes d’input

---

## 4. Définir la structure du monorepo ✅

### 4.1 Structure recommandée ✅

```text id="repo-structure"
packages/
  core/
  math/
  scene/
  renderer/
  physics/
  input/
  xr/
  interaction/
  audio/
  assets/
  gameplay/
  ui-core/
  ui-webcomponents/
  devtools/
  testing/
  wasm/
  examples/

apps/
  sandbox/
  playground/
  docs/

configs/
  tsconfig/
  vite/
  vitest/
  eslint/
```

### 4.2 Packages minimaux à démarrer ✅

Les packages MVP doivent être :

- `@engine/core`
- `@engine/math`
- `@engine/scene`
- `@engine/renderer`
- `@engine/physics`
- `@engine/input`
- `@engine/xr`
- `@engine/interaction`
- `@engine/audio`
- `@engine/assets`
- `@engine/gameplay`
- `@engine/ui-core`
- `@engine/ui-webcomponents`
- `@engine/devtools`
- `@engine/testing`
- `@engine/wasm`
- `@engine/examples`

### 4.3 Règles de dépendances ✅

Tu dois fixer une direction stricte :

- `math` est bas niveau
- `core` est très bas niveau
- `scene` dépend de `math` et `core`
- `renderer` dépend de `scene`, `math`, `core`
- `physics` dépend de `math`, `core`, `wasm`
- `input` dépend de `core`
- `xr` dépend de `core`, `scene`, `input`, `math`
- `interaction` dépend de `input`, `xr`, `scene`, `physics`
- `audio` dépend de `scene`, `math`, `core`
- `assets` dépend de `core`
- `gameplay` dépend des APIs publiques moteur
- `ui-core` dépend de `core`
- `ui-webcomponents` dépend de `ui-core` et des APIs publiques moteur
- `devtools` dépend des APIs publiques et d’outils d’inspection
- `testing` dépend de tous les packages testés, sans dépendances inverses
- `examples` dépend des APIs publiques
- `wasm` ne doit pas imposer sa structure interne aux autres packages

---

## 5. Définir les APIs publiques de chaque domaine ✅

Avant de développer, il faut écrire les interfaces publiques.

### 5.1 API `core` ✅

Responsabilités publiques :

- `Engine`
- `EngineConfig`
- `RuntimeContext`
- `LifecycleHook`
- `Engine.start()`
- `Engine.stop()`
- `Engine.pause()`
- `Engine.resume()`
- `Engine.mount()`

### 5.2 API `math` ✅

Responsabilités publiques :

- `Vec2`
- `Vec3`
- `Vec4`
- `Quat`
- `Mat3`
- `Mat4`
- `Ray`
- `Plane`
- `AABB`
- `Sphere`
- `Frustum`
- helpers d’intersections
- helpers de calcul hand tracking

### 5.3 API `scene` ✅

Responsabilités publiques :

- `Scene`
- `Entity`
- `Component`
- `Transform`
- `Camera`
- `Light`
- `SceneNode`
- `SceneGraph`

### 5.4 API `renderer` ✅

Responsabilités publiques :

- `Renderer`
- `RenderTarget`
- `Mesh`
- `Material`
- `Texture`
- `ShaderProgram`
- `RenderPass`

### 5.5 API `physics` ✅

Responsabilités publiques :

- `PhysicsWorld`
- `RigidBody`
- `Collider`
- `CharacterController`
- `RaycastHit`
- `CollisionEvent`
- `TriggerEvent`

### 5.6 API `input` ✅

Responsabilités publiques :

- `InputSystem`
- `InputAction`
- `InputBinding`
- `InputProfile`
- `InputContext`
- `InputDeviceAdapter`

### 5.7 API `xr` ✅

Responsabilités publiques :

- `XRManager`
- `XRSessionState`
- `XRControllerState`
- `XRHandState`
- `XRTrackingCapabilities`
- `XRReferenceSpaceState`

### 5.8 API `interaction` ✅

Responsabilités publiques :

- `Interactor`
- `RayInteractor`
- `GrabInteractor`
- `PokeInteractor`
- `PinchInteractor`
- `TeleportInteractor`
- `UIInteractor`
- `Interactable`

### 5.9 API `audio` ✅

Responsabilités publiques :

- `AudioSystem`
- `AudioListener`
- `AudioSource`
- `SpatialAudioConfig`
- `AudioClip`
- `AudioBus`
- `AudioPlaybackHandle`

### 5.10 API `assets` ✅

Responsabilités publiques :

- `AssetManager`
- `AssetLoader`
- `AssetHandle`
- `AssetManifest`
- `AssetCache`
- `MeshAsset`
- `TextureAsset`
- `AudioAsset`
- `SceneAsset`

### 5.11 API `gameplay` ✅

Responsabilités publiques :

- `GameplaySystem`
- `GameplayContext`
- `SpawnService`
- `GameState`
- `InteractionRule`
- `ScriptBehaviour`
- helpers de logique réutilisable

### 5.12 API `ui-core` ✅

Responsabilités publiques :

- `UIStateStore`
- `UIEventBus`
- `UIFocusManager`
- `UIActionDispatcher`
- `UINodeModel`
- `UIPanelState`

### 5.13 API `ui-webcomponents` ✅

Responsabilités publiques :

- `<xr-engine>`
- `<xr-scene>`
- `<xr-camera>`
- `<xr-entity>`
- `<xr-hud>`
- `<xr-debug-panel>`
- `<xr-hand-debug>`
- `<xr-input-profile-viewer>`

### 5.14 API `devtools` ✅

Responsabilités publiques :

- `EngineInspector`
- `SceneInspector`
- `PhysicsInspector`
- `InputInspector`
- `XRInspector`
- `HandTrackingInspector`
- `PerformancePanel`

### 5.15 API `testing` ✅

Responsabilités publiques :

- `createTestEngine()`
- `createMockScene()`
- `createMockXRSession()`
- `createMockXRHand()`
- `createMockGamepad()`
- `tickEngine()`
- `renderFrame()`
- fixtures de scène et d’input

### 5.16 API `wasm` ✅

Responsabilités publiques :

- `WasmModuleLoader`
- `PhysicsBackendBridge`
- `WasmHandle`
- `WasmMemoryView`
- contrats d’allocation/libération
- adaptateurs TS ↔ WASM

### 5.17 API `examples` ✅

Responsabilités publiques :

- exemples exécutable desktop
- exemples XR controllers
- exemples hand tracking
- exemples UI
- exemples intégration Web Components
- exemples de fallback capability

---

## 6. Concevoir le modèle de capacités et de fallback ✅

Le moteur doit être capability-driven.

### 6.1 Capacités à exposer ✅

Le runtime doit savoir exposer :

- support WebXR
- support immersive VR
- support gamepad
- support contrôleurs XR
- support hand tracking
- support hand joints
- support haptics
- support ray interaction
- support near interaction

### 6.2 Fallbacks ✅

Tu dois prévoir les transitions suivantes :

- hand tracking indisponible → contrôleurs XR
- contrôleurs indisponibles → desktop
- tracking perdu → mode safe/fallback
- interaction lointaine indisponible → UI de proximité ou alternative

### 6.3 Règle de conception ✅

Aucune mécanique principale ne doit dépendre exclusivement d’un seul device.

---

## 7. Mettre en place le repository et l’outillage ✅

### 7.1 Bootstrap ✅

Initialise :

- monorepo
- TypeScript strict
- Vite
- Vitest
- lint
- formatage
- CI
- scripts workspace

### 7.2 Configuration TypeScript ✅

Prévoir :

- project references
- alias de packages
- strict mode fort
- builds incrémentaux
- séparation nette `src` / `tests`

### 7.3 Configuration Vite ✅

Prévoir :

- mode lib pour les packages
- mode app pour sandbox/playground
- résolution workspace
- build examples
- build custom elements

### 7.4 Configuration Vitest ✅

Prévoir :

- unit tests
- integration tests
- browser-like tests
- coverage
- setup files
- mocks XR/canvas/gamepad

### 7.5 CI/CD ✅

Pipeline minimal :

- lint
- typecheck
- tests
- build
- coverage
- publication preview/canary plus tard

---

## 8. Construire le socle mathématique ✅

### 8.1 Types ✅

Implémenter :

- `Vec2`
- `Vec3`
- `Vec4`
- `Quat`
- `Mat3`
- `Mat4`
- `Ray`
- `Plane`
- `Sphere`
- `AABB`
- `Frustum`

### 8.2 Fonctions ✅

- transformations
- projections
- intersections
- bounding volumes
- calculs spatiaux XR
- utilitaires pour joints de mains

### 8.3 Tests ✅

Ce package doit être fortement couvert.

---

## 9. Construire le runtime cœur ✅

### 9.1 Boucle moteur ✅

Le runtime doit séparer :

- update logique
- update input
- update XR
- step physique
- rendu

### 9.2 Temps ✅

- delta time
- fixed time step
- frame count
- pause/resume
- time scaling

### 9.3 Système d’événements ✅

Catégories :

- lifecycle
- input
- XR
- collisions
- interaction
- UI

### 9.4 Gestion des ressources runtime ✅

- enregistrement des systèmes
- accès services
- dépendances internes

---

## 10. Construire la scène et les composants ✅

### 10.1 Modèle ✅

Utiliser un hybride :

- scene graph pour hiérarchie/transforms
- composants/systèmes pour logique

### 10.2 Composants MVP ✅

- `TransformComponent`
- `CameraComponent`
- `MeshComponent`
- `LightComponent`
- `RigidBodyComponent`
- `ColliderComponent`
- `AudioSourceComponent`
- `InteractableComponent`
- `HandInteractableComponent`

### 10.3 Systèmes MVP ✅

- `TransformSystem`
- `RenderSystem`
- `PhysicsSystem`
- `InputSystem`
- `XRSystem`
- `InteractionSystem`
- `AudioSystem`
- `UISystem`

---

## 11. Implémenter le renderer ✅

### 11.1 Milestone 1 ✅

- canvas
- clear color
- triangle
- cube
- caméra perspective

### 11.2 Milestone 2 ✅

- meshes
- materials
- textures
- depth test
- resize

### 11.3 Milestone 3 ✅

- lumière de base
- culling
- instancing

### 11.4 Support XR ✅

- vues stéréoscopiques
- caméras XR
- matrices XR

---

## 12. Intégrer la physique ✅

### 12.1 Stratégie ✅

Créer une abstraction de backend stable.

### 12.2 Fonctionnalités MVP ✅

- rigid bodies
- colliders
- gravity
- raycasts
- triggers
- restitution / friction

### 12.3 Fonctionnalités phase 2 ✅

- character controller
- joints
- CCD
- contraintes avancées

### 12.4 Hand interaction et physique ✅

Prévoir :

- overlaps de proximité
- poke volumes
- cibles de pinch
- proxys kinematic plus tard si nécessaire

---

## 13. Construire le système d’input unifié ✅

### 13.1 Pipeline ✅

Le moteur doit transformer :

```text id="input-pipeline" ✅
Raw device state
→ adapters
→ normalized signals
→ actions
→ interaction intents
→ gameplay
```

### 13.2 Devices à supporter ✅

- keyboard
- mouse
- gamepad
- xr-controller-left
- xr-controller-right
- xr-hand-left
- xr-hand-right

### 13.3 Signaux normalisés ✅

- bouton
- axe
- pose
- ray
- grab state
- pinch state
- poke state
- tracking validity

### 13.4 Actions ✅

- move
- look
- jump
- grab
- release
- use
- teleport
- menu
- select
- cancel
- pinch
- poke
- uiPress

---

## 14. Construire la couche XR ✅

### 14.1 Gestion de session ✅

- détection support
- entrée/sortie session
- reference spaces
- frame loop XR

### 14.2 Tracking state ✅

- head pose
- controller states
- hand states
- validité tracking
- changements de mode

### 14.3 Support hand tracking ✅

- joints runtime
- pinch
- poke
- palm orientation
- near targeting
- ray fallback

### 14.4 Bascule entre modes ✅

Prévoir :

- controllers only
- hands only
- mixed support
- perte temporaire de tracking

---

## 15. Construire la couche interaction ✅

### 15.1 Types d’interaction ✅

- far interaction
- near interaction
- grab
- UI interaction
- locomotion interaction

### 15.2 Contrôleurs XR ✅

- ray pointer
- grip grab
- trigger use

### 15.3 Hand tracking ✅

- pinch select
- poke UI
- near grab
- ray fallback si nécessaire

### 15.4 Règle de gameplay ✅

Une mécanique de jeu ne doit pas connaître le périphérique exact.

---

## 16. Construire la couche audio → On en est là

### 16.1 MVP audio

- listener
- audio source 3D
- play/stop/pause
- loop
- volume
- distance attenuation

### 16.2 Intégration gameplay

- feedback de grab
- feedback de poke
- feedback de menu
- ambiance de scène

### 16.3 Phase 2

- mixers
- buses
- spatialisation avancée
- effets

---

## 17. Construire la couche assets

### 17.1 Types d’assets

- mesh
- texture
- material config
- audio
- scène
- shaders
- manifests
- configs d’input

### 17.2 Pipeline d’assets

- chargement async
- cache
- fallback
- préchargement
- invalidation

### 17.3 Phase 2

- glTF
- compression
- streaming
- manifests avancés

---

## 18. Construire la couche gameplay

### 18.1 Objectif

La couche gameplay sert à écrire la logique métier sans dépendre des détails du moteur.

### 18.2 Contenu

- services de spawn
- game state
- règles de sélection
- scripts de comportement
- interactions métier
- aides à la composition d’objets de jeu

### 18.3 Règles

- dépend des APIs publiques uniquement
- aucune dépendance aux détails WASM
- aucune dépendance au DOM

---

## 19. Construire la couche UI Core

### 19.1 Objectif

Créer une base UI indépendante du framework d’affichage final.

### 19.2 Contenu

- état UI
- focus
- navigation
- dispatch d’actions UI
- modèles de panneaux
- état overlays/debug/menu

### 19.3 Rôle

Cette couche sert de pont entre :

- le runtime moteur
- les composants Vue/Web Components

---

## 20. Construire la couche UI WebComponents

### 20.1 Objectif

Exposer le moteur via des composants Vue 3 custom elements.

### 20.2 Composants principaux

- `<xr-engine>`
- `<xr-scene>`
- `<xr-camera>`
- `<xr-entity>`
- `<xr-hud>`
- `<xr-debug-panel>`
- `<xr-hand-debug>`
- `<xr-input-profile-viewer>`

### 20.3 Contrat

Chaque composant doit exposer :

- props typées
- `CustomEvent`
- méthodes publiques éventuelles
- lifecycle documenté

---

## 21. Construire la couche devtools

### 21.1 Outils minimum

- FPS
- temps frame
- draw calls
- nombre d’entités
- nombre de rigid bodies
- état input
- état XR
- état hand tracking

### 21.2 Inspecteurs

- inspector scène
- inspector physique
- inspector input
- inspector XR
- inspector hands

### 21.3 Objectif

Permettre le debug rapide d’un moteur complexe multi-devices.

---

## 22. Construire la couche testing

### 22.1 Stratégie

Le package `testing` doit centraliser :

- mocks
- fixtures
- harness
- helpers d’assertion runtime

### 22.2 Mocks nécessaires

- `requestAnimationFrame`
- canvas
- `XRSession`
- `XRFrame`
- `XRInputSource`
- `XRHand`
- `XRJointSpace`
- `Gamepad`

### 22.3 Scénarios de test

- input desktop
- input gamepad
- input XR controllers
- input XR hands
- fallback capability
- UI interaction
- physics integration
- engine lifecycle

---

## 23. Construire la couche WASM

### 23.1 Rôle

Le package `wasm` doit encapsuler les briques natives/compilées.

### 23.2 Responsabilités

- chargement module wasm
- initialisation backend
- allocation/libération
- pont TS ↔ WASM
- handles opaques
- sécurité mémoire côté interface

### 23.3 Cas d’usage prioritaires

- backend physique
- collision queries
- calculs intensifs plus tard

---

## 24. Construire la couche examples

### 24.1 Rôle

Les exemples sont une partie produit, pas un bonus.

### 24.2 Exemples minimaux

- cube tournant
- collisions simples
- character controller desktop
- gamepad movement
- session XR controllers
- hand tracking debug
- pinch interaction
- poke interaction
- grab object
- UI interaction
- fallback automatique

### 24.3 Objectif

- démontrer les APIs
- valider les features
- servir de tests vivants
- documenter l’usage réel

---

## 25. Définir les milestones du projet

### Milestone 0 — Vision & architecture

- vision produit
- architecture globale
- contrat d’API
- règles de dépendances
- stratégie capability/fallback

### Milestone 1 — Foundation

- monorepo
- TypeScript
- Vite
- Vitest
- CI
- `core`
- `math`

### Milestone 2 — First runtime

- boucle moteur
- scène
- renderer minimal
- premier exemple desktop

### Milestone 3 — Physics

- abstraction physique
- backend WASM
- rigid bodies
- colliders
- raycasts

### Milestone 4 — Unified input

- keyboard/mouse
- gamepad
- profils
- actions
- rebinding

### Milestone 5 — XR controllers

- session XR
- tracking tête
- contrôleurs
- ray interaction
- locomotion basique

### Milestone 6 — Hand tracking

- états mains
- joints
- pinch/poke
- near interaction
- fallback

### Milestone 7 — Audio + assets

- audio sources
- asset manager
- premiers loaders
- intégration dans exemples

### Milestone 8 — Gameplay + interaction unifiée

- gameplay APIs
- interactables
- grab/use/select
- indépendance vis-à-vis du device

### Milestone 9 — UI layers

- `ui-core`
- `ui-webcomponents`
- host component
- debug components

### Milestone 10 — Devtools + testing

- inspecteurs runtime
- mocks avancés
- harness XR/hands
- stabilisation tests

### Milestone 11 — Examples + docs

- exemples complets
- docs d’API
- guides d’intégration
- guides de capabilities/fallback

### Milestone 12 — Hardening

- optimisation
- profiling
- compatibilité multi-devices
- stabilisation API

---

## 26. Ordre de développement recommandé

### Phase A — Fondation

1. architecture
2. monorepo
3. TypeScript/Vite/Vitest/CI
4. `math`
5. `core`

### Phase B — Runtime 3D desktop

6. `scene`
7. `renderer`
8. boucle moteur complète
9. premier exemple exécutable

### Phase C — Physique

10. `wasm`
11. `physics`
12. raycasts/collisions/triggers

### Phase D — Input hors XR

13. `input`
14. clavier/souris
15. gamepad
16. actions/profiles

### Phase E — XR

17. `xr`
18. contrôleurs XR
19. hand tracking
20. modèle de capabilities

### Phase F — Interaction

21. `interaction`
22. grab/pinch/poke/ray
23. UI interaction universelle

### Phase G — Couches produit

24. `audio`
25. `assets`
26. `gameplay`
27. `ui-core`
28. `ui-webcomponents`

### Phase H — Outils et validation

29. `devtools`
30. `testing`
31. `examples`
32. docs
33. optimisation

---

## 27. Risques majeurs à anticiper

### 27.1 Couplage gameplay/device

Le gameplay ne doit jamais dépendre du périphérique réel.

### 27.2 Couplage moteur/Vue

Vue doit rester une façade d’intégration.

### 27.3 Hand tracking traité trop tard

Le hand tracking doit être intégré dans l’abstraction input/XR dès la conception.

### 27.4 WASM trop exposé

Le backend WASM ne doit jamais contaminer l’API de haut niveau.

### 27.5 Exemples traités comme optionnels

Les exemples sont indispensables à la validation du moteur.

### 27.6 Devtools et testing négligés

Sans eux, un moteur multi-device devient très difficile à stabiliser.

---

## 28. Backlog initial concret

### Epic 1 — Foundation

- monorepo
- configs
- scripts
- CI

### Epic 2 — Math

- types math
- intersections
- helpers XR/hands

### Epic 3 — Core

- engine
- lifecycle
- scheduler
- event system

### Epic 4 — Scene + Renderer

- entités
- transforms
- caméra
- mesh render

### Epic 5 — WASM + Physics

- loader wasm
- backend bridge
- world physique
- rigid bodies/colliders

### Epic 6 — Input

- keyboard
- mouse
- gamepad
- profiles
- actions

### Epic 7 — XR

- session management
- controllers
- hands
- capabilities

### Epic 8 — Interaction

- ray
- near
- pinch
- poke
- grab

### Epic 9 — Audio + Assets

- sources audio
- asset manager
- premiers loaders

### Epic 10 — Gameplay

- game state
- spawn services
- behaviours
- interaction rules

### Epic 11 — UI

- ui-core
- webcomponents Vue
- debug panels

### Epic 12 — Devtools + Testing

- inspectors
- mocks
- fixtures
- harness

### Epic 13 — Examples

- scènes de démonstration
- intégration Web Components
- modes desktop/XR/hands

---

## 29. Documentation à maintenir en continu

Tu dois documenter en permanence :

- vision produit
- architecture
- conventions de packages
- APIs publiques
- stratégie de tests
- modèle d’input
- capacités XR/hands
- fallback matrix
- intégration Web Components
- ajout d’un backend WASM
- ajout d’un nouvel exemple

---

# 30. Stratégie finale recommandée

La stratégie la plus saine est :

1. définir l’architecture et les APIs
2. poser le monorepo et l’outillage
3. construire un runtime 3D desktop testable
4. intégrer la physique via WASM
5. unifier l’input desktop/gamepad
6. ajouter XR contrôleurs puis hands
7. unifier les interactions
8. ajouter audio/assets/gameplay/UI
9. outiller avec devtools/testing/examples
10. stabiliser par docs, tests et optimisation

La ligne directrice finale est :

> un seul moteur, une seule API gameplay, plusieurs modes d’entrée et d’interaction, une architecture modulaire, et une validation continue par tests, exemples et outils de debug.

Je peux maintenant te faire la **version suivante encore plus opérationnelle**, avec :

- l’**arborescence détaillée fichier par fichier**
- les **packages exacts à créer**
- l’**ordre réel d’implémentation**
- et le **contenu initial de chaque package**.

[Continuer avec ChatGPT](https://chatgpt.com/c/69e77438-1674-8396-82d9-8927e6fcb755)
