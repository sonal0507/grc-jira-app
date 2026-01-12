const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'GRC JIRA Integration Server is running',
        timestamp: new Date().toISOString()
    });
});

// Test JIRA connection
app.post('/api/jira/test-connection', async (req, res) => {
    try {
        const { baseUrl, email, apiToken, projectKey } = req.body;
        
        if (!baseUrl || !email || !apiToken || !projectKey) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Clean up the base URL
        const host = baseUrl.replace(/\/$/, '');
        
        // Create auth header
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        
        // Test connection by fetching project info
        const response = await axios.get(
            `${host}/rest/api/3/project/${projectKey}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            success: true,
            message: 'Connection successful',
            project: response.data
        });

    } catch (error) {
        console.error('JIRA Connection Test Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            message: 'Connection failed',
            error: error.response?.data?.errorMessages?.[0] || error.message
        });
    }
});

// Get JIRA project info
app.get('/api/jira/project', async (req, res) => {
    try {
        // Get credentials from request body or query
        const { baseUrl, email, apiToken, projectKey } = req.query;
        
        if (!baseUrl || !email || !apiToken || !projectKey) {
            return res.status(400).json({ error: 'Missing JIRA credentials' });
        }

        const host = baseUrl.replace(/\/$/, '');
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

        const response = await axios.get(
            `${host}/rest/api/3/project/${projectKey}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch project info',
            details: error.response?.data || error.message
        });
    }
});

// Create single JIRA ticket
app.post('/api/jira/create-ticket', async (req, res) => {
    try {
        const { baseUrl, email, apiToken, projectKey, summary, description, priority, issueType } = req.body;

        // Validate required fields
        if (!baseUrl || !email || !apiToken || !projectKey || !summary) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['baseUrl', 'email', 'apiToken', 'projectKey', 'summary']
            });
        }

        const host = baseUrl.replace(/\/$/, '');
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

        // Build JIRA API v3 payload with Atlassian Document Format
        const payload = {
            fields: {
                project: {
                    key: projectKey
                },
                summary: summary,
                issuetype: {
                    name: issueType || 'Task'
                },
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: description || 'No description provided'
                                }
                            ]
                        }
                    ]
                },
                priority: priority ? { name: priority } : { name: 'Medium' }
            }
        };

        console.log('Creating JIRA ticket:', { project: projectKey, summary: summary });

        const response = await axios.post(
            `${host}/rest/api/3/issue`,
            payload,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        const ticketKey = response.data.key;
        const ticketUrl = `${host}/browse/${ticketKey}`;

        console.log('Ticket created successfully:', ticketKey);

        res.json({
            success: true,
            ticketKey: ticketKey,
            ticketUrl: ticketUrl,
            message: `Ticket ${ticketKey} created successfully`
        });

    } catch (error) {
        console.error('JIRA API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to create JIRA ticket',
            details: error.response?.data?.errors || error.response?.data?.errorMessages || error.message
        });
    }
});

// Create multiple JIRA tickets at once
app.post('/api/jira/create-tickets', async (req, res) => {
    try {
        const { baseUrl, email, apiToken, projectKey, issueType, tickets } = req.body;

        // Validate required fields
        if (!baseUrl || !email || !apiToken || !projectKey) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing JIRA credentials',
                required: ['baseUrl', 'email', 'apiToken', 'projectKey']
            });
        }

        if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Tickets array is required' 
            });
        }

        const host = baseUrl.replace(/\/$/, '');
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

        const results = [];
        console.log(`Creating ${tickets.length} JIRA tickets...`);

        for (const ticket of tickets) {
            try {
                // Build JIRA API v3 payload
                const payload = {
                    fields: {
                        project: {
                            key: projectKey
                        },
                        summary: ticket.summary,
                        issuetype: {
                            name: ticket.issueType || issueType || 'Task'
                        },
                        description: {
                            type: 'doc',
                            version: 1,
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [
                                        {
                                            type: 'text',
                                            text: ticket.description || 'No description provided'
                                        }
                                    ]
                                }
                            ]
                        },
                        priority: ticket.priority ? { name: ticket.priority } : { name: 'Medium' }
                    }
                };

                const response = await axios.post(
                    `${host}/rest/api/3/issue`,
                    payload,
                    {
                        headers: {
                            'Authorization': `Basic ${auth}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                results.push({
                    success: true,
                    ticketKey: response.data.key,
                    ticketUrl: `${host}/browse/${response.data.key}`,
                    summary: ticket.summary
                });

                console.log(`Created ticket: ${response.data.key}`);

            } catch (ticketError) {
                console.error(`Failed to create ticket: ${ticket.summary}`, ticketError.response?.data || ticketError.message);
                results.push({
                    success: false,
                    summary: ticket.summary,
                    error: ticketError.response?.data?.errorMessages?.[0] || ticketError.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        res.json({
            success: successCount > 0,
            total: tickets.length,
            created: successCount,
            failed: failedCount,
            results: results
        });

    } catch (error) {
        console.error('Bulk Ticket Creation Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to create tickets',
            details: error.message
        });
    }
});

// Serve the main app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 GRC JIRA Integration Server');
    console.log('='.repeat(60));
    console.log(`📍 Server running on http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log('Available API Endpoints:');
    console.log('  GET   /api/health               - Health check');
    console.log('  POST  /api/jira/test-connection - Test JIRA connection');
    console.log('  GET   /api/jira/project         - Get project info');
    console.log('  POST  /api/jira/create-ticket   - Create single ticket');
    console.log('  POST  /api/jira/create-tickets  - Create multiple tickets');
    console.log('='.repeat(60));
});

module.exports = app;
