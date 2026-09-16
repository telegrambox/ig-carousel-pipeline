const express = require('express');
const path = require('path');
const { EventEmitter } = require('events');
const { run } = require('./pipeline');

const app = express();
app.use(express.json());

// Serve static UI
app.use(express.static(path.join(__dirname, 'public')));
// Serve generated images
app.use('/output', express.static(path.join(__dirname, 'output')));

const jobs = new Map();
const progressEvents = new EventEmitter();

app.post('/api/generate', (req, res) => {
    const { topicMode, customTopic, category, channelName } = req.body;
    const jobId = Date.now().toString();
    
    jobs.set(jobId, { status: 'running', logs: [] });
    
    res.json({ jobId });

    // Run pipeline asynchronously
    const onProgress = (msg) => {
        console.log(`[Job ${jobId}] ${msg}`);
        jobs.get(jobId).logs.push(msg);
        progressEvents.emit(`progress-${jobId}`, { type: 'log', message: msg });
    };

    run({ topicMode, customTopic, category, channelName, onProgress })
        .then(result => {
            if (result.error) {
                progressEvents.emit(`progress-${jobId}`, { type: 'error', message: result.error });
            } else {
                progressEvents.emit(`progress-${jobId}`, { type: 'done', data: result });
            }
            jobs.get(jobId).status = 'completed';
        })
        .catch(err => {
            progressEvents.emit(`progress-${jobId}`, { type: 'error', message: err.message });
            jobs.get(jobId).status = 'error';
        });
});

app.get('/api/stream/:id', (req, res) => {
    const jobId = req.params.id;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const listener = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    progressEvents.on(`progress-${jobId}`, listener);

    // Send old logs if any
    const job = jobs.get(jobId);
    if (job) {
        job.logs.forEach(log => {
            res.write(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`);
        });
    }

    req.on('close', () => {
        progressEvents.removeListener(`progress-${jobId}`, listener);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web Dashboard running at http://localhost:${PORT}`);
});
