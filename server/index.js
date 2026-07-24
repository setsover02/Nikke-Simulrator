import express from 'express';
import cors from 'cors';
import shiftypadRoutes from './routes/shiftypad.js';
import { closeBrowser } from './crawler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:5173',  // Vite dev server
        'http://localhost:5174',
        'http://localhost:4173',  // Vite preview
    ],
    methods: ['GET', 'POST'],
    credentials: true,
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ShiftyPad crawling routes
app.use('/api/shiftypad', shiftypadRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Nikke Crawler Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   GET /api/health`);
    console.log(`   GET /api/shiftypad/outpost?openid=xxx`);
    console.log(`   GET /api/shiftypad/nikkes?openid=xxx`);
    console.log(`   GET /api/shiftypad/nikke/:id?openid=xxx`);
    console.log(`   GET /api/shiftypad/raw?openid=xxx&page=home|nikke-list`);
    console.log('');
});

// Graceful shutdown
const shutdown = async () => {
    console.log('\n🛑 Shutting down server...');
    await closeBrowser();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
