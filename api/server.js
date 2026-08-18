const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());

const users = new Map();
const sessions = new Map();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function randomUUID() {
    return crypto.randomUUID();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password && password.length >= 8;
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Sign up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        if (users.has(email)) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const user = {
            id: randomUUID(),
            email,
            name,
            password: password,
            createdAt: new Date().toISOString(),
            plan: 'free',
            teamSize: 1
        };

        users.set(email, user);

        const token = generateToken();
        sessions.set(token, { email, createdAt: new Date().toISOString() });

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                teamSize: user.teamSize
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sign in
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = users.get(email);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken();
        sessions.set(token, { email, createdAt: new Date().toISOString() });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                teamSize: user.teamSize
            }
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sign out
app.post('/api/auth/signout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            sessions.delete(token);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const session = sessions.get(token);
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const user = users.get(session.email);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                teamSize: user.teamSize
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Subscribe to plan
app.post('/api/subscribe', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const session = sessions.get(token);
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const user = users.get(session.email);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const { plan } = req.body;
        if (!plan || !['free', 'professional', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan selection' });
        }

        user.plan = plan;
        users.set(session.email, user);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                teamSize: user.teamSize
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/docs', async (req, res) => {
    res.json({
        guides: [
            { id: 'getting-started', title: 'Getting Started', path: '/guides/getting-started' },
            { id: 'configuration', title: 'Configuration Guide', path: '/guides/configuration' },
            { id: 'deployment', title: 'Deployment', path: '/guides/deployment' }
        ],
        api: [
            { id: 'authentication', title: 'Authentication', path: '/api/authentication' },
            { id: 'endpoints', title: 'API Endpoints', path: '/api/endpoints' }
        ]
    });
});

module.exports = app;