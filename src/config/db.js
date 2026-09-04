/**
 * Universal Database Adapter
 * 
 * Connects via pg.Pool if process.env.DATABASE_URL is defined,
 * or falls back to mysql2 if DB_HOST is configured.
 * 
 * Emulates mysql2's [rows, fields] return signature when using pg,
 * translating '?' placeholders to '$1, $2, ...'.
 */
require('dotenv').config();

let db;

if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    // Test DB Connection
    (async () => {
        try {
            const client = await pool.connect();
            console.log('Successfully connected to PostgreSQL (Supabase) Database.');
            client.release();
        } catch (error) {
            console.error('PostgreSQL database connection failed:', error.message);
        }
    })();

    const convertPlaceholders = (sql) => {
        let index = 1;
        return sql.replace(/'(?:''|[^'])*'|\?/g, (match) => {
            if (match === '?') {
                return `$${index++}`;
            }
            return match;
        });
    };

    const executeQuery = async (executor, sql, values) => {
        let params = values;
        if (params !== undefined && params !== null && !Array.isArray(params)) {
            params = [params];
        } else if (!params) {
            params = [];
        }

        const trimmed = sql.trim();
        const upper = trimmed.toUpperCase();
        const isInsert = upper.startsWith('INSERT');
        const hasReturning = /\bRETURNING\b/i.test(trimmed);

        let queryText = convertPlaceholders(trimmed);
        if (isInsert && !hasReturning) {
            queryText += ' RETURNING id';
        }

        const res = await executor.query(queryText, params);

        if (isInsert) {
            const insertedId = res.rows[0]?.id;
            const insertId = insertedId !== undefined && insertedId !== null
                ? (isNaN(insertedId) ? insertedId : Number(insertedId))
                : 0;
            return [{
                insertId,
                affectedRows: res.rowCount || 0
            }, res.fields];
        }

        if (upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
            return [{
                affectedRows: res.rowCount || 0,
                changedRows: res.rowCount || 0,
                insertId: 0
            }, res.fields];
        }

        // SELECT and other row-returning queries
        return [res.rows, res.fields];
    };

    db = {
        query: (sql, values) => executeQuery(pool, sql, values),
        execute: (sql, values) => executeQuery(pool, sql, values),
        getConnection: async () => {
            const client = await pool.connect();
            return {
                query: (sql, values) => executeQuery(client, sql, values),
                execute: (sql, values) => executeQuery(client, sql, values),
                release: () => client.release()
            };
        },
        end: () => pool.end(),
        pool
    };
} else {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'email_automation_db',
        port: Number(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    // Test DB Connection
    (async () => {
        try {
            const connection = await pool.getConnection();
            console.log('Successfully connected to MySQL Database.');
            connection.release();
        } catch (error) {
            console.error('MySQL database connection failed:', error.message);
        }
    })();

    db = pool;
}

module.exports = db;