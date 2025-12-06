import { openDB, type DBSchema as Schema, type IDBPDatabase } from 'idb';

export type Shipment = {
  id: string;
  orderId: string;
  createdAt: string;
  date: string;
  photoIds: string[];
};

export type Photo = {
  id: string;
  shipmentId: string;
  createdAt: string;
  mimeType: string;
  blob: Blob;
};

interface AppDB extends Schema {
  shipments: {
    key: string;
    value: Shipment;
    indexes: {
      by_orderId: string;
      by_date: string;
    };
  };
  photos: {
    key: string;
    value: Photo;
    indexes: {
      by_shipmentId: string;
    };
  };
}

const DB_NAME = 'registroSpedizioniDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const shipmentStore = db.createObjectStore('shipments', { keyPath: 'id' });
        shipmentStore.createIndex('by_orderId', 'orderId', { unique: false });
        shipmentStore.createIndex('by_date', 'date', { unique: false });

        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by_shipmentId', 'shipmentId', { unique: false });
      }
    });
  }
  return dbPromise;
}

const getUuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export async function saveShipmentWithPhotos(orderId: string, photoBlobs: Blob[]): Promise<Shipment> {
  const db = await getDB();
  const shipmentId = getUuid();
  const createdAt = new Date().toISOString();
  const date = createdAt.slice(0, 10);
  const photoIds: string[] = [];

  const tx = db.transaction(['shipments', 'photos'], 'readwrite');
  try {
    const shipment: Shipment = { id: shipmentId, orderId, createdAt, date, photoIds };
    await tx.objectStore('shipments').put(shipment);

    for (const blob of photoBlobs) {
      const photoId = getUuid();
      const record: Photo = {
        id: photoId,
        shipmentId,
        createdAt: new Date().toISOString(),
        mimeType: blob.type || 'image/jpeg',
        blob
      };
      photoIds.push(photoId);
      await tx.objectStore('photos').put(record);
    }

    await tx.objectStore('shipments').put({ id: shipmentId, orderId, createdAt, date, photoIds });
    await tx.done;
    return { id: shipmentId, orderId, createdAt, date, photoIds };
  } catch (error) {
    console.error('Error saving shipment', error);
    tx.abort();
    throw error;
  }
}

export async function getShipmentsByDate(date: string): Promise<Shipment[]> {
  const db = await getDB();
  return db.getAllFromIndex('shipments', 'by_date', IDBKeyRange.only(date));
}

export async function getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
  const db = await getDB();
  return db.getAllFromIndex('shipments', 'by_orderId', IDBKeyRange.only(orderId));
}

export async function getPhotosByShipmentId(shipmentId: string): Promise<Photo[]> {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'by_shipmentId', IDBKeyRange.only(shipmentId));
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['shipments', 'photos'], 'readwrite');
  await Promise.all([tx.objectStore('shipments').clear(), tx.objectStore('photos').clear()]);
  await tx.done;
}
