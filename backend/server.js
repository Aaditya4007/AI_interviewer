
    // backend/server.js
    require('dotenv').config();
    const express = require('express');
    const cors = require('cors');
    const livekitRoutes = require('./routes/livekit');

    const app = express();
    const port = process.env.PORT || 8080;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Default if not set

    // Middleware
    app.use(cors({
        origin: frontendUrl // Allow requests only from your frontend URL
    }));
    app.use(express.json()); // Parse JSON bodies

    // Routes
    app.use('/api/livekit', livekitRoutes);

    // Basic health check endpoint
    app.get('/', (req, res) => {
        res.send(`AI Interviewer Backend is running. Ready to accept requests from ${frontendUrl}.`);
    });

    // Global error handler (optional basic example)
    app.use((err, req, res, next) => {
        console.error("Unhandled error:", err.stack);
        res.status(500).send('Something broke!');
    });


    app.listen(port, () => {
        console.log(`Backend server listening at http://localhost:${port}`);
        console.log(`Accepting CORS requests from: ${frontendUrl}`);
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
            console.warn('WARNING: LiveKit environment variables (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL) seem to be missing in .env');
        } else {
            console.log('LiveKit credentials loaded from .env');
        }
    });
