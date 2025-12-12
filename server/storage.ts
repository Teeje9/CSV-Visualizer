import {
  users,
  exportUsage,
  type User,
  type UpsertUser,
  type ExportUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getExportUsage(userId: string, yearMonth: string): Promise<ExportUsage | undefined>;
  incrementExportCount(userId: string, yearMonth: string): Promise<ExportUsage>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getExportUsage(userId: string, yearMonth: string): Promise<ExportUsage | undefined> {
    const [usage] = await db
      .select()
      .from(exportUsage)
      .where(and(eq(exportUsage.userId, userId), eq(exportUsage.yearMonth, yearMonth)));
    return usage;
  }

  async incrementExportCount(userId: string, yearMonth: string): Promise<ExportUsage> {
    const existing = await this.getExportUsage(userId, yearMonth);
    
    if (existing) {
      const [updated] = await db
        .update(exportUsage)
        .set({
          exportCount: existing.exportCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(exportUsage.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(exportUsage)
        .values({
          userId,
          yearMonth,
          exportCount: 1,
        })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
