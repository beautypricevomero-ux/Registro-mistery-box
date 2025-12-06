import { openDB, DBSchema, IDBPDatabase } from 'idb';
export type Shipment = {
  id: string;
  orderId: string;
  carrier: 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI';
  createdAt: string;
  date: string;
  labelImageId?: string;
  boxPhotoIds: string[];
};

export type Photo = {
  id: string;
  createdAt: string;
  mimeType: string;
  blob: Blob;
  kind: 'LDV' | 'BOX';
};

interface RegistryDB extends DBSchema {
  shipments: {
    key: string;
    value: Shipment;
    indexes: {
      by_date: string;
      by_orderId: string;
    };
  };
  photos: {
    key: string;
    value: Photo;
    indexes: {
      by_kind: string;
    };
  };
}

const DB_NAME = 'registroSpedizioniDB';
const DB_VERSION = 4;
let dbPromise: Promise<IDBPDatabase<RegistryDB>> | null = null;

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<RegistryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (db.objectStoreNames.contains('shipments') && oldVersion < DB_VERSION) {
          db.deleteObjectStore('shipments');
        }
        if (db.objectStoreNames.contains('photos') && oldVersion < DB_VERSION) {
          db.deleteObjectStore('photos');
        }
        const shipments = db.createObjectStore('shipments', { keyPath: 'id' });
        shipments.createIndex('by_date', 'date');
        shipments.createIndex('by_orderId', 'orderId');

        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('by_kind', 'kind');
      }
    });
  }
  return dbPromise;
}

export async function saveLabelImage(blob: Blob): Promise<string> {
  const db = await initDB();
  const id = generateId();
  const createdAt = new Date().toISOString();
  const photo: Photo = {
    id,
    createdAt,
    mimeType: blob.type || 'image/jpeg',
    blob,
    kind: 'LDV'
  };
  await db.add('photos', photo);
  return id;
}

export async function saveBoxPhotos(blobs: Blob[]): Promise<string[]> {
  const db = await initDB();
  const ids: string[] = [];
  const tx = db.transaction('photos', 'readwrite');
  const createdAt = new Date().toISOString();
  for (const blob of blobs) {
    const id = generateId();
    ids.push(id);
    const photo: Photo = {
      id,
      createdAt,
      mimeType: blob.type || 'image/jpeg',
      blob,
      kind: 'BOX'
    };
    await tx.store.add(photo);
  }
  await tx.done;
  return ids;
}

export type CreateShipmentInput = {
  orderId: string;
  carrier: 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI';
  boxPhotoIds: string[];
  labelImageId?: string;
};

export async function createShipment(input: CreateShipmentInput): Promise<Shipment> {
  if (!input.orderId) {
    throw new Error('Codice spedizione mancante');
  }
  if (!input.boxPhotoIds || input.boxPhotoIds.length === 0) {
    throw new Error('Almeno una foto del pacco è obbligatoria');
  }
  const db = await initDB();
  const createdAt = new Date().toISOString();
  const date = createdAt.slice(0, 10);
  const shipment: Shipment = {
    id: generateId(),
    orderId: input.orderId,
    carrier: input.carrier,
    createdAt,
    date,
    boxPhotoIds: input.boxPhotoIds,
    labelImageId: input.labelImageId
  };
  await db.add('shipments', shipment);
  return shipment;
}

export async function getShipmentsByDate(date: string): Promise<Shipment[]> {
  const db = await initDB();
  return db.getAllFromIndex('shipments', 'by_date', date);
}

export async function getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
  const db = await initDB();
  return db.getAllFromIndex('shipments', 'by_orderId', orderId);
}

export async function getAllShipments(): Promise<Shipment[]> {
  const db = await initDB();
  return db.getAll('shipments');
}

export async function getPhotoById(id: string): Promise<Photo | undefined> {
  const db = await initDB();
  return db.get('photos', id);
}

export async function getPhotosByShipmentId(shipmentId: string): Promise<Photo[]> {
  const db = await initDB();
  const shipment = await db.get('shipments', shipmentId);
  if (!shipment) return [];
  const results: Photo[] = [];
  for (const pid of shipment.boxPhotoIds) {
    const photo = await db.get('photos', pid);
    if (photo && photo.kind === 'BOX') {
      results.push(photo);
    }
  }
  return results;
}

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['shipments', 'photos'], 'readwrite');
  await Promise.all([tx.objectStore('shipments').clear(), tx.objectStore('photos').clear()]);
  await tx.done;
}
