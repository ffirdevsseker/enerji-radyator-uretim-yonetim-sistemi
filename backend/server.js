const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Debug: log key env vars (remove in production)
console.log('ENV DEBUG', { DB_HOST: process.env.DB_HOST, DB_USER: process.env.DB_USER ? '***' : process.env.DB_USER, DB_NAME: process.env.DB_NAME });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
const kayitlarRoutes = require('./routes/kayitlarRoutes');
const maliyetDosyasıRoutes = require('./routes/maliyetDosyasıRoutes');
const islemlerRoutes = require('./routes/islemlerRoutes');
const uretimRoutes = require('./routes/uretimRoutes');

app.use('/api/kayitlar', kayitlarRoutes);
app.use('/api', maliyetDosyasıRoutes);
app.use('/api/islemler', islemlerRoutes);
app.use('/api/uretim', uretimRoutes);

// Auth routes (login/register)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);


// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/kayitlar', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/kayitlar.html'));
});

app.get('/maliyet-dosyalari', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/maliyet-dosyalari.html'));
});

app.get('/islemler', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/islemler.html'));
});

app.get('/uretim', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/uretim.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start server only after a successful DB connection
const db = require('./config/database');

const startServer = async () => {
    try {
        // Try to get a connection from the pool as a health check
        const conn = await db.getConnection();
        conn.release();
        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Please stop the process using this port or set a different PORT in .env`);
                process.exit(1);
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });
    } catch (err) {
        console.error('Failed to start server because DB connection failed:', err.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;