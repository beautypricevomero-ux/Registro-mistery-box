import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ParsedFields } from './layouts';

export type Shipment = {
  id: string;
  orderId: string;
  createdAt: string;
  date: string;
  photoIds: string[];
  ocrText?: string;
  parsedFields?: ParsedFields;
  searchBlob?: string;
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

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // simple fallback
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

export const buildSearchBlob = (orderId: string, ocrText?: string, parsedFields?: ParsedFields) => {
  const parts = [orderId || '', ocrText || ''];
  if (parsedFields) {
    parts.push(
      parsedFields.name || '',
      parsedFields.address || '',
      parsedFields.cap || '',
      parsedFields.city || '',
      parsedFields.province || '',
      parsedFields.phone || '',
      parsedFields.tracking || ''
    );
  }
  return normalize(parts.filter(Boolean).join(' '));
};

const withSearchBlob = (shipment: Shipment): Shipment => {
  if (shipment.searchBlob) return shipment;
  return { ...shipment, searchBlob: buildSearchBlob(shipment.orderId, shipment.ocrText, shipment.parsedFields) };
};

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

type SaveOptions = {
  ocrText?: string;
  parsedFields?: ParsedFields;
};

export async function saveShipmentWithPhotos(
  orderId: string,
  photoBlobs: Blob[],
  options?: SaveOptions
): Promise<string> {
  const db = await initDB();
  const tx = db.transaction(['shipments', 'photos'], 'readwrite');
  const shipmentId = generateId();
  const createdAt = new Date().toISOString();
  const date = createdAt.slice(0, 10);
  const photoIds: string[] = [];
  const { ocrText, parsedFields } = options || {};

  try {
    for (const blob of photoBlobs) {
      const id = generateId();
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
      photoIds,
      ocrText,
      parsedFields,
      searchBlob: buildSearchBlob(orderId, ocrText, parsedFields)
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
  const shipments = await db.getAllFromIndex('shipments', 'by_date', date);
  return shipments.map(withSearchBlob);
}

export async function getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
  const db = await initDB();
  const shipments = await db.getAllFromIndex('shipments', 'by_orderId', orderId);
  return shipments.map(withSearchBlob);
}

export async function searchShipments(query: string): Promise<Shipment[]> {
  const db = await initDB();
  const all = await db.getAll('shipments');
  const normalizedQuery = normalize(query);
  return all
    .map(withSearchBlob)
    .filter((shipment) => shipment.searchBlob && shipment.searchBlob.includes(normalizedQuery));
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
