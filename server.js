const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Global variables
let currentDownloadProgress = 0;
let downloadCompleted = false;
let downloadFilename = '';
let currentStage = 'Preparing';
let downloadStartTime = null;
let currentDownloadProcess = null;
let downloadPaused = false;

// Test endpoint to check server connectivity
app.get('/api/test', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/formats', (req, res) => {
    const { url } = req.body;
    
    console.log('=== FORMAT REQUEST ===');
    console.log('URL:', url);
    console.log('Time:', new Date().toISOString());
    console.log('Working directory:', process.cwd());
    
    if (!url) {
        console.log('ERROR: No URL provided');
        return res.status(400).json({ error: 'URL is required' });
    }
    
    // Check if yt-dlp exists
    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');
    console.log('Checking for yt-dlp at:', ytdlpPath);
    
    if (!fs.existsSync(ytdlpPath)) {
        console.log('ERROR: yt-dlp.exe not found');
        return res.status(500).json({ 
            error: 'yt-dlp.exe not found. Please run Setup-and-Run.bat to download it, or download manually from https://github.com/yt-dlp/yt-dlp/releases' 
        });
    }
    
    console.log('Starting yt-dlp process...');
    const ytdlp = spawn(ytdlpPath, ['-J', url], {
        windowsHide: true,
        cwd: __dirname
    });
    
    let output = '';
    let errorOutput = '';
    
    ytdlp.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('yt-dlp stderr:', data.toString());
    });
    
    ytdlp.on('close', (code) => {
        console.log(`yt-dlp process exited with code: ${code}`);
        
        if (code !== 0) {
            console.log('yt-dlp error output:', errorOutput);
            let errorMessage = errorOutput || `yt-dlp failed with exit code ${code}`;
            
            // Provide more specific error messages
            if (errorOutput.includes('Video unavailable')) {
                errorMessage = 'Video is unavailable or private';
            } else if (errorOutput.includes('network')) {
                errorMessage = 'Network error - please check your internet connection';
            } else if (errorOutput.includes('regex')) {
                errorMessage = 'Invalid YouTube URL format';
            }
            
            return res.status(500).json({ error: errorMessage });
        }
        
        try {
            console.log('Parsing video info...');
            const videoInfo = JSON.parse(output);
            
            const formats = videoInfo.formats.map(format => ({
                format_id: format.format_id,
                ext: format.ext,
                resolution: format.height ? `${format.height}p` : null,
                fps: format.fps,
                filesize: format.filesize,
                vcodec: format.vcodec,
                acodec: format.acodec
            }));
            
            // Check available qualities
            const availableQualities = checkAvailableQualities(videoInfo.formats);
            
            // Extract video metadata including thumbnail
            const videoData = {
                title: videoInfo.title || 'Unknown Title',
                thumbnail: videoInfo.thumbnail || videoInfo.thumbnails?.[videoInfo.thumbnails.length - 1]?.url || null,
                duration: videoInfo.duration || 0,
                uploader: videoInfo.uploader || 'Unknown',
                view_count: videoInfo.view_count || 0,
                description: videoInfo.description || '',
                upload_date: videoInfo.upload_date || '',
                id: videoInfo.id || ''
            };
            
            console.log(`Found ${formats.length} formats for: ${videoData.title}`);
            res.json({ 
                formats,
                videoInfo: videoData,
                availableQualities
            });
            
        } catch (error) {
            console.error('Parse error:', error);
            console.log('Raw output length:', output.length);
            res.status(500).json({ error: 'Failed to parse video information' });
        }
    });
    
    ytdlp.on('error', (error) => {
        console.error('Failed to start yt-dlp:', error);
        res.status(500).json({ 
            error: `Failed to start yt-dlp: ${error.message}. Please ensure yt-dlp.exe is in the correct location.` 
        });
    });
});

function checkAvailableQualities(formats) {
    const qualities = {
        '8k-hdr': false,
        '8k': false,
        '4k-hdr': false,
        '4k': false,
        'fhd': false,
        'hd': false,
        'sd': false,
        'audio': false
    };
    
    formats.forEach(format => {
        if (format.acodec && format.acodec !== 'none') {
            qualities.audio = true;
        }
        
        if (format.height) {
            if (format.height >= 2160) {
                qualities['4k'] = true;
                if (format.height >= 4320) {
                    qualities['8k'] = true;
                }
                if (format.dynamic_range === 'hdr') {
                    qualities['4k-hdr'] = true;
                    if (format.height >= 4320) {
                        qualities['8k-hdr'] = true;
                    }
                }
            } else if (format.height >= 1080) {
                qualities.fhd = true;
            } else if (format.height >= 720) {
                qualities.hd = true;
            } else if (format.height >= 480) {
                qualities.sd = true;
            }
        }
    });
    
    return qualities;
}

app.post('/api/download-quality', (req, res) => {
    const { url, quality, merge } = req.body;
    
    console.log('=== DOWNLOAD REQUEST ===');
    console.log('URL:', url);
    console.log('Quality:', quality);
    console.log('Merge:', merge);
    
    if (!url || !quality) {
        return res.status(400).json({ error: 'URL and quality are required' });
    }
    
    // Check if yt-dlp exists
    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');
    if (!fs.existsSync(ytdlpPath)) {
        return res.status(500).json({ 
            error: 'yt-dlp.exe not found. Please run Setup-and-Run.bat first.' 
        });
    }
    
    // Reset progress
    currentDownloadProgress = 0;
    downloadCompleted = false;
    downloadFilename = '';
    currentStage = 'Preparing';
    downloadStartTime = Date.now();
    downloadPaused = false;
    
    // First, check if the requested quality is available
    checkQualityAvailability(url, quality, ytdlpPath)
        .then(({ isAvailable, availableQualities, formatString }) => {
            if (!isAvailable) {
                return res.status(400).json({ 
                    error: 'Requested quality not available for this video',
                    availableQualities
                });
            }
            
            // Proceed with download
            startDownloadProcess(url, formatString, ytdlpPath, res);
        })
        .catch(error => {
            console.error('Quality check error:', error);
            res.status(500).json({ error: 'Failed to check quality availability' });
        });
});

async function checkQualityAvailability(url, quality, ytdlpPath) {
    return new Promise((resolve, reject) => {
        const ytdlp = spawn(ytdlpPath, ['-J', url], {
            windowsHide: true,
            cwd: __dirname
        });
        
        let output = '';
        
        ytdlp.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        ytdlp.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Failed to get video info'));
                return;
            }
            
            try {
                const videoInfo = JSON.parse(output);
                const availableQualities = checkAvailableQualities(videoInfo.formats);
                const isAvailable = availableQualities[quality];
                const formatString = getFormatString(quality, true); // Assume merge for now
                
                resolve({
                    isAvailable,
                    availableQualities,
                    formatString
                });
            } catch (error) {
                reject(error);
            }
        });
    });
}

function attachDownloadListeners() {
    if (!currentDownloadProcess) return;
    
    currentDownloadProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Download output:', output);
        
        if (downloadPaused) return;
        
        // Parse different stages
        if (output.includes('[download]')) {
            if (output.includes('100%') || output.includes('100.0%')) {
                currentDownloadProgress = 100;
                currentStage = 'Download Complete';
            } else {
                currentStage = 'Downloading';
                const progressMatch = output.match(/(\d+\.\d+)%/);
                if (progressMatch) {
                    currentDownloadProgress = parseFloat(progressMatch[1]);
                }
                
                // Extract download speed if available
                const speedMatch = output.match(/at\s+([0-9.]+[KMGT]?iB\/s)/);
                if (speedMatch) {
                    currentStage = `Downloading at ${speedMatch[1]}`;
                }
            }
        } else if (output.includes('[ffmpeg]')) {
            currentStage = 'Merging with ffmpeg';
            currentDownloadProgress = Math.max(currentDownloadProgress, 90);
        } else if (output.includes('has already been downloaded')) {
            downloadCompleted = true;
            currentStage = 'Complete';
            currentDownloadProgress = 100;
            
            const filenameMatch = output.match(/\[download\] (.+) has already been downloaded/);
            if (filenameMatch) {
                downloadFilename = path.basename(filenameMatch[1]);
            }
        }
    });
    
    currentDownloadProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error('Download stderr:', errorOutput);
        
        if (errorOutput.includes('Deleting original file')) {
            currentStage = 'Finalizing';
            currentDownloadProgress = 95;
        }
    });
    
    currentDownloadProcess.on('close', (code) => {
        console.log(`Download process exited with code ${code}`);
        
        if (code === 0 && !downloadPaused) {
            setTimeout(() => {
                findDownloadedFile();
            }, 1000);
        } else if (code !== 0 && !downloadPaused) {
            console.error(`Download failed with exit code ${code}`);
            currentStage = 'Failed';
        }
        
        if (!downloadPaused) {
            currentDownloadProcess = null;
        }
    });
    
    currentDownloadProcess.on('error', (error) => {
        console.error('Download process error:', error);
        currentStage = 'Error';
        if (!downloadPaused) {
            currentDownloadProcess = null;
        }
    });
}

function startDownloadProcess(url, formatString, ytdlpPath, res) {
    // Create downloads folder if it doesn't exist
    const downloadsPath = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
    }
    
    // Build yt-dlp arguments
    const args = [
        '-f', formatString,
        '-P', downloadsPath,
        '-o', '%(title)s.%(ext)s',
        '--merge-output-format', 'mp4',
        '--newline',
        url
    ];
    
    console.log('yt-dlp arguments:', args);
    
    // Start download process
    currentDownloadProcess = spawn(ytdlpPath, args, {
        windowsHide: true,
        cwd: __dirname
    });
    
    // Attach event listeners
    attachDownloadListeners();
    
    res.json({ 
        success: true, 
        message: 'Download started',
        processId: Date.now()
    });
}

function findDownloadedFile() {
    const downloadsPath = path.join(__dirname, 'downloads');
    
    try {
        const files = fs.readdirSync(downloadsPath);
        if (files.length > 0) {
            const recentFiles = files
                .map(file => ({
                    name: file,
                    path: path.join(downloadsPath, file),
                    time: fs.statSync(path.join(downloadsPath, file)).mtime
                }))
                .filter(file => file.time.getTime() > downloadStartTime)
                .sort((a, b) => b.time - a.time);
            
            if (recentFiles.length > 0) {
                downloadFilename = recentFiles[0].name;
                downloadCompleted = true;
                currentStage = 'Complete';
                currentDownloadProgress = 100;
                
                console.log('Download completed, found file:', downloadFilename);
            } else {
                const mostRecent = files
                    .map(file => ({
                        name: file,
                        time: fs.statSync(path.join(downloadsPath, file)).mtime
                    }))
                    .sort((a, b) => b.time - a.time)[0];
                
                if (mostRecent) {
                    downloadFilename = mostRecent.name;
                    downloadCompleted = true;
                    currentStage = 'Complete';
                    currentDownloadProgress = 100;
                    
                    console.log('Download completed (fallback), found file:', downloadFilename);
                }
            }
        }
    } catch (error) {
        console.error('Error finding downloaded file:', error);
    }
}

// Download control endpoints
app.post('/api/pause-download', (req, res) => {
    console.log('Pause download request received');
    
    if (currentDownloadProcess && !downloadPaused) {
        try {
            downloadPaused = true;
            currentStage = 'Paused';
            
            // On Windows, we can't truly pause yt-dlp, so we kill it
            // The resume will restart from where possible
            if (process.platform === 'win32') {
                currentDownloadProcess.kill('SIGTERM');
            } else {
                currentDownloadProcess.kill('SIGSTOP'); // Pause on Unix-like systems
            }
            
            console.log('Download paused successfully');
            res.json({ success: true, message: 'Download paused' });
        } catch (error) {
            console.error('Error pausing download:', error);
            res.status(500).json({ error: 'Failed to pause download: ' + error.message });
        }
    } else if (downloadPaused) {
        res.json({ success: true, message: 'Download is already paused' });
    } else {
        res.status(400).json({ error: 'No active download to pause' });
    }
});

app.post('/api/resume-download', (req, res) => {
    console.log('Resume download request received');
    
    if (downloadPaused) {
        try {
            const { url, quality, merge } = req.body;
            
            if (!url || !quality) {
                return res.status(400).json({ error: 'URL and quality required for resume' });
            }
            
            downloadPaused = false;
            currentStage = 'Resuming';
            
            // Check if yt-dlp exists
            const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');
            if (!fs.existsSync(ytdlpPath)) {
                return res.status(500).json({ 
                    error: 'yt-dlp.exe not found. Cannot resume download.' 
                });
            }
            
            // Restart the download process (yt-dlp will handle resume automatically)
            const formatString = getFormatString(quality, merge);
            const downloadsPath = path.join(__dirname, 'downloads');
            
            const args = [
                '-f', formatString,
                '-P', downloadsPath,
                '-o', '%(title)s.%(ext)s',
                '--merge-output-format', 'mp4',
                '--newline',
                '--continue', // This helps with resuming partial downloads
                url
            ];
            
            console.log('Resuming with args:', args);
            
            currentDownloadProcess = spawn(ytdlpPath, args, {
                windowsHide: true,
                cwd: __dirname
            });
            
            // Re-attach event listeners
            attachDownloadListeners();
            
            console.log('Download resumed successfully');
            res.json({ success: true, message: 'Download resumed' });
            
        } catch (error) {
            console.error('Error resuming download:', error);
            res.status(500).json({ error: 'Failed to resume download: ' + error.message });
        }
    } else {
        res.status(400).json({ error: 'No paused download to resume' });
    }
});

app.post('/api/cancel-download', (req, res) => {
    console.log('Cancel download request received');
    
    try {
        if (currentDownloadProcess) {
            console.log('Killing download process...');
            currentDownloadProcess.kill('SIGKILL');
            currentDownloadProcess = null;
        }
        
        // Reset all progress variables
        currentDownloadProgress = 0;
        downloadCompleted = false;
        downloadFilename = '';
        currentStage = 'Cancelled';
        downloadPaused = false;
        
        // Clean up any partial files if needed (optional)
        // This could be enhanced to clean up incomplete downloads
        
        console.log('Download cancelled successfully');
        res.json({ success: true, message: 'Download cancelled successfully' });
        
    } catch (error) {
        console.error('Error cancelling download:', error);
        res.status(500).json({ error: 'Failed to cancel download: ' + error.message });
    }
});

function getFormatString(quality, merge) {
    const qualityMap = {
        // Updated format strings for better 8K/HDR detection
        '8k-hdr': merge ? 
            'bestvideo[height>=2160][vcodec*=av01][dynamic_range=hdr]+bestaudio[acodec!=opus]/bestvideo[height>=2160][dynamic_range=hdr]+bestaudio/bestvideo[height>=2160]+bestaudio/best[height>=2160]' : 
            'best[height>=2160][dynamic_range=hdr]/best[height>=2160]',
        
        '8k': merge ? 
            'bestvideo[height>=2160][vcodec*=av01]+bestaudio[acodec!=opus]/bestvideo[height>=2160]+bestaudio/best[height>=2160]' : 
            'best[height>=2160]',
        
        '4k-hdr': merge ? 
            'bestvideo[height>=1440][height<=2160][dynamic_range=hdr]+bestaudio[acodec!=opus]/bestvideo[height>=1440][height<=2160]+bestaudio/best[height>=1440][height<=2160]' : 
            'best[height>=1440][height<=2160][dynamic_range=hdr]/best[height>=1440][height<=2160]',
        
        '4k': merge ? 
            'bestvideo[height>=1440][height<=2160]+bestaudio[acodec!=opus]/bestvideo[height>=1440][height<=2160]+bestaudio/best[height>=1440][height<=2160]' : 
            'best[height>=1440][height<=2160]',
        
        'fhd': merge ? 
            'bestvideo[height>=720][height<=1080]+bestaudio[acodec!=opus]/bestvideo[height>=720][height<=1080]+bestaudio/best[height>=720][height<=1080]' : 
            'best[height>=720][height<=1080]',
        
        'hd': merge ? 
            'bestvideo[height>=480][height<=720]+bestaudio[acodec!=opus]/bestvideo[height>=480][height<=720]+bestaudio/best[height>=480][height<=720]' : 
            'best[height>=480][height<=720]',
        
        'sd': merge ? 
            'bestvideo[height<=480]+bestaudio[acodec!=opus]/bestvideo[height<=480]+bestaudio/best[height<=480]' : 
            'best[height<=480]',
        
        'audio': 'bestaudio[ext=m4a]/bestaudio[acodec=aac]/bestaudio'
    };
    
    return qualityMap[quality] || 'best';
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`\n=================================`);
    console.log(`YouTube Downloader Server Started`);
    console.log(`URL: http://localhost:${port}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`=================================\n`);
    
    // Check for yt-dlp
    if (!fs.existsSync('yt-dlp.exe')) {
        console.log('WARNING: yt-dlp.exe not found!');
        console.log('Please ensure yt-dlp.exe is in the same directory\n');
    }
    
    // Open browser automatically
    const url = `http://localhost:${port}`;
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`);
});
app.listen(port, () => {
    console.log(`\n=================================`);
    console.log(`YouTube Downloader Server Started`);
    console.log(`URL: http://localhost:${port}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`=================================\n`);
    
    // Check for yt-dlp
    if (!fs.existsSync('yt-dlp.exe')) {
        console.log('WARNING: yt-dlp.exe not found!');
        console.log('Please ensure yt-dlp.exe is in the same directory\n');
    }
    
    // Open browser automatically
    const url = `http://localhost:${port}`;
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`);
});
