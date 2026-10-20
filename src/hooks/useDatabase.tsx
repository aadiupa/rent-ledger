// ============================================================
// RentLedger — Database Context Provider
// Provides the SQLite database instance to all screens.
// ============================================================

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../db/database';
import { generateMonthlyCharges } from '../services/AccountingService';

interface DatabaseContextValue {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  error: string | null;
  refresh: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  db: null,
  isReady: false,
  error: null,
  refresh: () => {},
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const database = await openDatabase();
        if (!mounted) return;
        setDb(database);

        // Generate any missing rent charges (idempotent — safe to call every open)
        const setting = await database.getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key = 'auto_generate_charges'"
        );
        if (setting?.value === '1') {
          await generateMonthlyCharges(database);
        }

        setIsReady(true);
      } catch (e) {
        if (mounted) {
          setError(String(e));
          setIsReady(true); // still set ready so app can show error state
        }
      }
    }

    init();
    return () => { mounted = false; };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <DatabaseContext.Provider value={{ db, isReady, error, refresh }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}

export function useDb(): SQLite.SQLiteDatabase {
  const { db } = useContext(DatabaseContext);
  if (!db) throw new Error('Database not initialized');
  return db;
}
