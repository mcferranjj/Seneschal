import { db } from '../db';
import type { ClassRecord } from '../schema';
import type { IClassRepository } from './IClassRepository';

export class ClassRepository implements IClassRepository {
  async getAll(): Promise<ClassRecord[]> {
    return db.classes.toArray();
  }

  async get(id: string): Promise<ClassRecord | undefined> {
    return db.classes.get(id);
  }

  async getBySlug(slug: string): Promise<ClassRecord | undefined> {
    return db.classes.where('slug').equals(slug).first();
  }

  async bulkPut(records: ClassRecord[]): Promise<void> {
    await db.classes.bulkPut(records);
  }

  async count(): Promise<number> {
    return db.classes.count();
  }

  async clear(): Promise<void> {
    await db.classes.clear();
  }
}

/** Singleton Dexie-backed class repository. */
export const classRepository = new ClassRepository();
