const express = require('express');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const { planCopy, renderFromCopyData, regenerateSingleSlide, run } = require('./pipeline');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static UI
app.use(express.static(path.join(__dirname, 'public')));
// Serve generated images
app.use('/output', express.static(path.join(__dirname, 'output')));

const jobs = new Map();
const progressEvents = new EventEmitter();

function createLogger(jobId) {
    return (msg) => {
        console.log(`[Job ${jobId}] ${msg}`);
        if (jobs.has(jobId)) {
            jobs.get(jobId).logs.push(msg);
        }
        progressEvents.emit(`progress-${jobId}`, { type: 'log', message: msg });
    };
}

/**
 * Step 1: Draft Copy / Blueprint Plan (Pre-Generation Review)
 */
app.post('/api/plan-copy', async (req, res) => {
    const { topicMode, customTopic, customContext, category, channelName, slideCount } = req.body;
    const jobId = Date.now().toString();
    jobs.set(jobId, { status: 'running', logs: [] });
    const onProgress = createLogger(jobId);

    try {
        onProgress(`Drafting copy for ${slideCount} slides...`);
        const result = await planCopy({
            topicMode,
            customTopic,
            customContext,
            category,
            channelName,
            slideCount,
            onProgress
        });

        if (result.error) {
            jobs.get(jobId).status = 'error';
            return res.status(400).json({ success: false, error: result.error });
        }

        jobs.get(jobId).status = 'completed';
        res.json({
            success: true,
            jobId,
            bestStory: result.bestStory,
            copyData: result.copyData
        });
    } catch (err) {
        onProgress(`Planning failed: ${err.message}`);
        jobs.get(jobId).status = 'error';
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Step 2: Render Carousel from Confirmed/Edited Copy
 */
app.post('/api/render-copy', async (req, res) => {
    const { copyData, channelName, bestStory, topicMode } = req.body;
    const jobId = Date.now().toString();
    jobs.set(jobId, { status: 'running', logs: [] });
    const onProgress = createLogger(jobId);

    try {
        onProgress("Rendering carousel from approved copy data...");
        const result = await renderFromCopyData(copyData, {
            channelName,
            bestStory,
            topicMode,
            onProgress
        });

        jobs.get(jobId).status = 'completed';
        res.json({
            success: true,
            jobId,
            slides: result.slides,
            caption: result.caption,
            copyData: result.copyData
        });
    } catch (err) {
        onProgress(`Rendering failed: ${err.message}`);
        jobs.get(jobId).status = 'error';
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Step 3: Regenerate or re-render a SINGLE slide on demand
 */
app.post('/api/regenerate-slide', async (req, res) => {
    const { slideIndex, slideData, channelName } = req.body;
    const jobId = Date.now().toString();
    const onProgress = createLogger(jobId);

    try {
        const result = await regenerateSingleSlide(slideIndex, slideData, {
            channelName,
            onProgress
        });

        res.json({
            success: true,
            slideIndex: result.slideIndex,
            slideFile: result.slideFile,
            slideData: result.slideData
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Step 4: Upload custom image file per slide
 */
app.post('/api/upload-image', (req, res) => {
    try {
        const { slideIndex, imageData } = req.body;
        if (!imageData) {
            return res.status(400).json({ success: false, error: 'No image data provided' });
        }

        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const idx = parseInt(slideIndex) || 0;
        const filename = `custom_slide_${idx + 1}.jpg`;
        const filePath = path.join(outputDir, filename);

        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        res.json({
            success: true,
            imageUrl: `/output/${filename}?t=${Date.now()}`,
            localPath: filePath
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Legacy One-Shot Generation Endpoint (Backwards compatible)
 */
app.post('/api/generate', (req, res) => {
    const { topicMode, customTopic, customContext, category, channelName, slideCount } = req.body;
    const jobId = Date.now().toString();
    jobs.set(jobId, { status: 'running', logs: [] });
    res.json({ jobId });

    const onProgress = createLogger(jobId);

    run({ topicMode, customTopic, customContext, category, channelName, slideCount, onProgress })
        .then(result => {
            if (result.error) {
                progressEvents.emit(`progress-${jobId}`, { type: 'error', message: result.error });
                jobs.get(jobId).status = 'error';
            } else {
                progressEvents.emit(`progress-${jobId}`, { type: 'done', data: result });
                jobs.get(jobId).status = 'completed';
            }
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
