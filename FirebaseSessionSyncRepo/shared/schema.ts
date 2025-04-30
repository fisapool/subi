import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  credits: integer("credits").notNull().default(0),
});

export const proxyServers = pgTable("proxy_servers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  location: text("location"),
  isActive: boolean("is_active").default(false),
});

export const proxySessions = pgTable("proxy_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  proxyId: integer("proxy_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  bandwidthUsed: integer("bandwidth_used").default(0),
  averageLatency: integer("average_latency"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  uid: true,
  email: true,
  username: true,
});

export const insertProxyServerSchema = createInsertSchema(proxyServers).pick({
  name: true,
  host: true,
  port: true,
  location: true,
});

export const insertProxySessionSchema = createInsertSchema(proxySessions).pick({
  proxyId: true,
});

export type User = typeof users.$inferSelect;
export type ProxyServer = typeof proxyServers.$inferSelect;
export type ProxySession = typeof proxySessions.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProxyServer = z.infer<typeof insertProxyServerSchema>;
export type InsertProxySession = z.infer<typeof insertProxySessionSchema>;
