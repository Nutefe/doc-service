# Doc-service

## Run

```bash
cp .env.example .env
docker compose up --build
```

API: http://localhost:3000

## Endpoints

- POST `/api/documents/batch` (body: `{ userIds: string[1000] }`) -> `202 { batchId }`
- GET `/api/documents/batch/:batchId` -> status + documents
- GET `/api/documents/:documentId` -> PDF
- GET `/health`
- GET `/metrics`
- GET `/api/openapi.json`

## Batch sequence

```mermaid
sequence diagram
  autonumber
  participant Client
  participant API as API (Express)
  participant Mongo as MongoDB (batches/documents)
  participant Queue as Redis + BullMQ (Queue)
  participant Worker as Worker (BullMQ)
  participant GridFS as MongoDB GridFS (PDF)

  Client->>API: POST /api/documents/batch (1000 userIds)
  API->>Mongo: Crée le batch (status=processing) + 1000 documents (status=pending)
  API->>Queue: Enfile 1000 jobs (batchId, documentId, userId)
  API-->>Client: 202 Accepted + batchId

  loop Pour chaque job (en parallèle, concurrency=N)
    Worker->>Queue: Récupère un job
    Worker->>Worker: Appel externe DocuSign (simulé) via circuit breaker
    Worker->>Worker: Génère le PDF (worker_threads, timeout 5s)
    Worker->>GridFS: Stream du PDF dans GridFS (sans tout charger en RAM)
    Worker->>Mongo: Update document (completed + gridFsFileId) + incrémente le compteur du batch
  end

  Client->>API: GET /api/documents/batch/:batchId
  API->>Mongo: Lit le batch + la liste des documents
  API-->>Client: Statut + progression + documents

  Client->>API: GET /api/documents/:documentId
  API->>GridFS: Stream du PDF
  API-->>Client: PDF (application/pdf)
```

## Pourquoi BullMQ?

- Gestion solide pour exécuter des jobs lourds en arrière-plan, tout en restant simple à déployer.

## Pourquoi GridFS?

- stocker des documents PDF générés, et pouvoir les streamer sans charger en mémoire, avec un stockage fiable.

## Benchmark

```bash
node benchmark/test.js
```
