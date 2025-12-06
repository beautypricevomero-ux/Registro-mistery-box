import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { LabelLayoutType, ParsedFields } from './layouts';

export type Customer = {
  id: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  address: string;
  cap?: string;
  city?: string;
  province?: string;
  phone?: string;
  notes?: string;
  ocrText: string;
  layoutType?: LabelLayoutType;
  trackingFromLabel?: string;
};

export type Shipment = {
  id: string;
  customerId: string;
  createdAt: string;
  date: string;
  boxPhotoIds: string[];
  labelImageId: string;
  ocrText: string;
  tracking?: string;
  layoutType?: LabelLayoutType;
};

export type Photo = {
  id: string;
  createdAt: string;
  mimeType: string;
  blob: Blob;
  kind: 'LDV' | 'BOX';
};

interface RegistryDB extends DBSchema {
  customers: {
    key: string;
    value: Customer;
    indexes: {
      by_name: string;
      by_phone: string;
      by_cap: string;
    };
  };
  shipments: {
    key: string;
    value: Shipment;
    indexes: {
      by_date: string;
      by_customerId: string;
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
const DB_VERSION = 2;
let dbPromise: Promise<IDBPDatabase<RegistryDB>> | null = null;

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

export const buildSearchBlobFromCustomer = (customer: Customer, tracking?: string) => {
  const parts = [
    customer.fullName,
    customer.address,
    customer.cap || '',
    customer.city || '',
    customer.province || '',
    customer.phone || '',
    customer.ocrText || '',
    tracking || customer.trackingFromLabel || ''
  ];
  return normalize(parts.filter(Boolean).join(' '));
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
        if (db.objectStoreNames.contains('customers') && oldVersion < DB_VERSION) {
          db.deleteObjectStore('customers');
        }
        const customers = db.createObjectStore('customers', { keyPath: 'id' });
        customers.createIndex('by_name', 'fullName');
        customers.createIndex('by_phone', 'phone');
        customers.createIndex('by_cap', 'cap');

        const shipments = db.createObjectStore('shipments', { keyPath: 'id' });
        shipments.createIndex('by_date', 'date');
        shipments.createIndex('by_customerId', 'customerId');

        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('by_kind', 'kind');
      }
    });
  }
  return dbPromise;
}

export async function createCustomerFromOcr(
  parsed: ParsedFields,
  ocrText: string,
  notes?: string
): Promise<Customer> {
  const db = await initDB();
  const now = new Date().toISOString();
  const customer: Customer = {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    fullName: parsed.name || '',
    address: parsed.address || '',
    cap: parsed.cap,
    city: parsed.city,
    province: parsed.province,
    phone: parsed.phone,
    notes,
    ocrText,
    layoutType: parsed.layoutType,
    trackingFromLabel: parsed.tracking
  };
  await db.add('customers', customer);
  return customer;
}

export async function updateCustomer(customer: Customer): Promise<void> {
  const db = await initDB();
  customer.updatedAt = new Date().toISOString();
  await db.put('customers', customer);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const db = await initDB();
  return db.get('customers', id);
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
  customerId: string;
  labelImageId: string;
  boxPhotoIds: string[];
  ocrText: string;
  tracking?: string;
  layoutType?: LabelLayoutType;
};

export async function createShipment(input: CreateShipmentInput): Promise<Shipment> {
  if (!input.boxPhotoIds || input.boxPhotoIds.length === 0) {
    throw new Error('Almeno una foto del pacco è obbligatoria');
  }
  const db = await initDB();
  const createdAt = new Date().toISOString();
  const date = createdAt.slice(0, 10);
  const shipment: Shipment = {
    id: generateId(),
    customerId: input.customerId,
    createdAt,
    date,
    boxPhotoIds: input.boxPhotoIds,
    labelImageId: input.labelImageId,
    ocrText: input.ocrText,
    tracking: input.tracking,
    layoutType: input.layoutType
  };
  await db.add('shipments', shipment);
  return shipment;
}

export async function getShipmentsByDate(date: string): Promise<Shipment[]> {
  const db = await initDB();
  return db.getAllFromIndex('shipments', 'by_date', date);
}

export async function getAllShipments(): Promise<Shipment[]> {
  const db = await initDB();
  return db.getAll('shipments');
}

export type ShipmentWithCustomer = { shipment: Shipment; customer: Customer };

export async function getShipmentsWithCustomersByDate(date: string): Promise<ShipmentWithCustomer[]> {
  const shipments = await getShipmentsByDate(date);
  const db = await initDB();
  const customers = await Promise.all(shipments.map((s) => db.get('customers', s.customerId)));
  return shipments
    .map((shipment, idx) => {
      const customer = customers[idx];
      if (!customer) return undefined;
      return { shipment, customer } as ShipmentWithCustomer;
    })
    .filter(Boolean) as ShipmentWithCustomer[];
}

export async function getAllShipmentsWithCustomers(): Promise<ShipmentWithCustomer[]> {
  const shipments = await getAllShipments();
  const db = await initDB();
  const customers = await Promise.all(shipments.map((s) => db.get('customers', s.customerId)));
  return shipments
    .map((shipment, idx) => {
      const customer = customers[idx];
      if (!customer) return undefined;
      return { shipment, customer } as ShipmentWithCustomer;
    })
    .filter(Boolean) as ShipmentWithCustomer[];
}

export async function getPhotoById(id: string): Promise<Photo | undefined> {
  const db = await initDB();
  return db.get('photos', id);
}

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['shipments', 'photos', 'customers'], 'readwrite');
  await Promise.all([
    tx.objectStore('shipments').clear(),
    tx.objectStore('photos').clear(),
    tx.objectStore('customers').clear()
  ]);
  await tx.done;
}
