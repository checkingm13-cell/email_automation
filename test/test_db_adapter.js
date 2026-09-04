const assert = require('assert');

// Test placeholder conversion logic
const convertPlaceholders = (sql) => {
    let index = 1;
    return sql.replace(/'(?:''|[^'])*'|\?/g, (match) => {
        if (match === '?') {
            return `$${index++}`;
        }
        return match;
    });
};

assert.strictEqual(
    convertPlaceholders('SELECT * FROM test WHERE id = ?'),
    'SELECT * FROM test WHERE id = $1'
);

assert.strictEqual(
    convertPlaceholders('INSERT INTO campaigns (a, b) VALUES (?, ?)'),
    'INSERT INTO campaigns (a, b) VALUES ($1, $2)'
);

assert.strictEqual(
    convertPlaceholders("SELECT * FROM test WHERE str = 'what? really?' AND id = ?"),
    "SELECT * FROM test WHERE str = 'what? really?' AND id = $1"
);

// Test adapter module loading without DATABASE_URL (MySQL fallback mode)
delete process.env.DATABASE_URL;
const dbMysql = require('../src/config/db');
assert(typeof dbMysql.query === 'function', 'db.query should be a function');

// Test adapter module loading with DATABASE_URL (PostgreSQL mode)
delete require.cache[require.resolve('../src/config/db')];
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
const dbPg = require('../src/config/db');
assert(typeof dbPg.query === 'function', 'dbPg.query should be a function');
assert(typeof dbPg.getConnection === 'function', 'dbPg.getConnection should be a function');

console.log('✅ All DB adapter unit checks passed successfully.');

