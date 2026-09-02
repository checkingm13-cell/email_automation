require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/db');

// Inject DB pool into app so routes can access it via req.app.get('db')
app.set('db', db);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});