import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

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

interface RegistryDB extends DBSchema {
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
let dbPromise: Promise<IDBPDatabase<RegistryDB>> | null = null;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<RegistryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const shipments = db.createObjectStore('shipments', { keyPath: 'id' });
        shipments.createIndex('by_orderId', 'orderId');
        shipments.createIndex('by_date', 'date');
        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('by_shipmentId', 'shipmentId');
      }
    });
  }
  return dbPromise;
}

export async function saveShipmentWithPhotos(orderId: string, photoBlobs: Blob[]): Promise<string> {
  const db = await initDB();
  const tx = db.transaction(['shipments', 'photos'], 'readwrite');
  const shipmentId = uuidv4();
  const createdAt = new Date().toISOString();
  const date = createdAt.slice(0, 10);
  const photoIds: string[] = [];

  try {
    for (const blob of photoBlobs) {
      const id = uuidv4();
      const photo: Photo = {
        id,
        shipmentId,
        createdAt,
        mimeType: blob.type || 'image/jpeg',
        blob
      };
      photoIds.push(id);
      await tx.objectStore('photos').add(photo);
    }

    const shipment: Shipment = {
      id: shipmentId,
      orderId,
      createdAt,
      date,
      photoIds
    };
    await tx.objectStore('shipments').add(shipment);
    await tx.done;
    return shipmentId;
  } catch (error) {
    console.error('Error saving shipment', error);
    tx.abort();
    throw error;
  }
}

export async function getShipmentsByDate(date: string): Promise<Shipment[]> {
  const db = await initDB();
  return db.getAllFromIndex('shipments', 'by_date', date);
}

export async function getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
  const db = await initDB();
  return db.getAllFromIndex('shipments', 'by_orderId', orderId);
}

export async function getPhotosByShipmentId(shipmentId: string): Promise<Photo[]> {
  const db = await initDB();
  return db.getAllFromIndex('photos', 'by_shipmentId', shipmentId);
}

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['shipments', 'photos'], 'readwrite');
  await Promise.all([
    tx.objectStore('shipments').clear(),
    tx.objectStore('photos').clear()
  ]);
  await tx.done;
}
