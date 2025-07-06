document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const urlInput = document.getElementById('url-input');
    const fetchBtn = document.getElementById('fetch-btn');
    const formatSelection = document.getElementById('format-selection');
    const qualityCards = document.querySelectorAll('.quality-card');
    const mergeToggle = document.getElementById('merge-toggle');
    const downloadProgress = document.getElementById('download-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const historyList = document.getElementById('history-list');
    const updateBtn = document.getElementById('update-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const openFolderBtn = document.getElementById('open-folder-btn');
    
    let selectedQuality = null;
    let videoFormats = [];
    let currentVideoInfo = null;
    let downloadInProgress = false;
    let downloadPaused = false;
    let downloadProcess = null;
    
    console.log('Script loaded successfully');
    
    // Test server connection on load
    testServerConnection();
    
    async function testServerConnection() {
        try {
            const response = await fetch('/api/test');
            console.log('Server connection test:', response.status);
        } catch (error) {
            console.error('Server connection failed:', error);
            showNotification('Server not responding. Please ensure the server is running.', 'error');
        }
    }
    
    // Add ripple effect to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', createRipple);
    });
    
    function createRipple(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('btn-ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    // Event Listeners
    fetchBtn.addEventListener('click', fetchFormats);
    
    // Allow Enter key to trigger fetch
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchFormats();
        }
    });
    
    qualityCards.forEach(card => {
        card.addEventListener('click', () => {
            const quality = card.dataset.quality;
            selectQuality(quality, card);
        });
    });
    
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);
    if (openFolderBtn) openFolderBtn.addEventListener('click', openDownloadsFolder);
    if (updateBtn) updateBtn.addEventListener('click', checkForUpdates);
    
    // Load history on startup
    loadHistory();
    
    async function fetchFormats() {
        const url = urlInput.value.trim();
        
        console.log('Fetch formats called with URL:', url);
        
        if (!url) {
            showNotification('Please enter a URL', 'error');
            return;
        }
        
        if (!isValidYoutubeUrl(url)) {
            showNotification('Please enter a valid YouTube URL', 'error');
            return;
        }
        
        // Disable button and show loading state
        fetchBtn.disabled = true;
        fetchBtn.style.transform = 'scale(0.95)';
        fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Fetching...</span>';
        
        try {
            console.log('Sending request to /api/formats');
            
            const response = await fetch('/api/formats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });
            
            console.log('Response received:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.formats || !Array.isArray(data.formats)) {
                throw new Error('Invalid response format');
            }
            
            videoFormats = data.formats;
            currentVideoInfo = data.videoInfo;
            console.log('Found formats:', videoFormats.length);
            
            // Update format selection with video info and available qualities
            updateFormatSelectionWithVideo(currentVideoInfo, data.availableQualities);
            
            // Show format selection
            formatSelection.classList.remove('hidden');
            formatSelection.style.animation = 'slideInUp 0.8s ease';
            
            showNotification(`Found ${videoFormats.length} formats! Select quality to download.`, 'success');
            
        } catch (error) {
            console.error('Fetch error:', error);
            showNotification('Error: ' + error.message, 'error');
            
            // Show detailed error for debugging
            if (error.message.includes('fetch')) {
                showNotification('Network error. Is the server running on port 3000?', 'error');
            }
        } finally {
            // Re-enable button and restore state
            fetchBtn.disabled = false;
            fetchBtn.style.transform = 'scale(1)';
            fetchBtn.innerHTML = '<i class="fas fa-search"></i> <span>Fetch Formats</span>';
        }
    }
    
    function updateFormatSelectionWithVideo(videoInfo, availableQualities = {}) {
        // Update the title
        const titleElement = formatSelection.querySelector('h2');
        titleElement.innerHTML = 'Select Quality';
        
        // Create or update video info section
        let videoInfoSection = formatSelection.querySelector('.video-info');
        if (!videoInfoSection) {
            videoInfoSection = document.createElement('div');
            videoInfoSection.className = 'video-info';
            formatSelection.insertBefore(videoInfoSection, formatSelection.querySelector('.quality-grid'));
        }
        
        // Format duration
        const formatDuration = (seconds) => {
            if (!seconds) return 'Unknown';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        };
        
        // Format view count
        const formatViews = (count) => {
            if (!count) return 'Unknown views';
            if (count >= 1000000) {
                return `${(count / 1000000).toFixed(1)}M views`;
            } else if (count >= 1000) {
                return `${(count / 1000).toFixed(1)}K views`;
            }
            return `${count} views`;
        };
        
        videoInfoSection.innerHTML = `
            <div class="video-thumbnail-container">
                ${videoInfo.thumbnail ? `
                    <img src="${videoInfo.thumbnail}" alt="Video thumbnail" class="video-thumbnail" />
                    <div class="video-duration">${formatDuration(videoInfo.duration)}</div>
                ` : `
                    <div class="video-thumbnail-placeholder">
                        <i class="fab fa-youtube"></i>
                    </div>
                `}
            </div>
            <div class="video-details">
                <h3 class="video-title">${videoInfo.title}</h3>
                <div class="video-meta">
                    <span class="video-uploader"><i class="fas fa-user"></i> ${videoInfo.uploader}</span>
                    <span class="video-views"><i class="fas fa-eye"></i> ${formatViews(videoInfo.view_count)}</span>
                </div>
            </div>
        `;
        
        // Update quality cards based on availability
        qualityCards.forEach(card => {
            const quality = card.dataset.quality;
            const isAvailable = availableQualities[quality];
            
            if (isAvailable === false) {
                card.classList.add('unavailable');
                card.style.opacity = '0.5';
                card.style.cursor = 'not-allowed';
                
                // Add unavailable indicator
                let unavailableIndicator = card.querySelector('.unavailable-indicator');
                if (!unavailableIndicator) {
                    unavailableIndicator = document.createElement('div');
                    unavailableIndicator.className = 'unavailable-indicator';
                    unavailableIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Not Available';
                    card.appendChild(unavailableIndicator);
                }
            } else {
                card.classList.remove('unavailable');
                card.style.opacity = '1';
                card.style.cursor = 'pointer';
                
                const unavailableIndicator = card.querySelector('.unavailable-indicator');
                if (unavailableIndicator) {
                    unavailableIndicator.remove();
                }
            }
        });
    }
    
    function selectQuality(quality, cardElement) {
        console.log('Quality selected:', quality);
        
        // Check if quality is available
        if (cardElement.classList.contains('unavailable')) {
            showNotification('This quality is not available for this video. Please choose another quality.', 'warning');
            return;
        }
        
        // Prevent multiple downloads
        if (downloadInProgress) {
            showNotification('Download already in progress', 'warning');
            return;
        }
        
        // Remove selection from all cards
        qualityCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        cardElement.classList.add('selected');
        selectedQuality = quality;
        downloadInProgress = true;
        downloadPaused = false;
        
        // Animate selection
        cardElement.style.animation = 'selectedPulse 0.5s ease';
        
        // Show quality-specific messages
        let qualityMessage = '';
        switch(quality) {
            case '8k-hdr':
                qualityMessage = 'Selected 8K HDR - Note: True 8K HDR may not be available for all videos';
                break;
            case '8k':
                qualityMessage = 'Selected 8K - Will download highest available quality up to 8K';
                break;
            case '4k-hdr':
                qualityMessage = 'Selected 4K HDR - Premium HDR quality';
                break;
            case '4k':
                qualityMessage = 'Selected 4K - Ultra HD quality';
                break;
            case 'fhd':
                qualityMessage = 'Selected Full HD - 1080p quality';
                break;
            case 'hd':
                qualityMessage = 'Selected HD - 720p quality';
                break;
            case 'sd':
                qualityMessage = 'Selected SD - Standard 480p quality';
                break;
            case 'audio':
                qualityMessage = 'Selected Audio Only - Best available audio quality';
                break;
            default:
                qualityMessage = `Selected ${quality.toUpperCase()} quality`;
        }
        
        showNotification(qualityMessage, 'info');
        
        // Start download after a delay
        setTimeout(() => startDownload(), 1500);
    }
    
    async function startDownload() {
        if (!selectedQuality) {
            console.error('No quality selected');
            downloadInProgress = false;
            return;
        }
        
        console.log('Starting download with quality:', selectedQuality);
        
        // Hide format selection and show progress
        formatSelection.style.animation = 'fadeOut 0.5s ease';
        setTimeout(() => {
            formatSelection.classList.add('hidden');
            downloadProgress.classList.remove('hidden');
            downloadProgress.style.animation = 'slideInUp 0.8s ease';
            
            // Add download control buttons immediately after showing progress
            setTimeout(() => {
                addDownloadControls();
            }, 100);
        }, 500);
        
        progressFill.style.width = '0%';
        progressText.textContent = 'Preparing download...';
        
        try {
            const downloadData = {
                url: urlInput.value.trim(),
                quality: selectedQuality,
                merge: mergeToggle.checked
            };
            
            console.log('Sending download request:', downloadData);
            
            const response = await fetch('/api/download-quality', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(downloadData)
            });
            
            const data = await response.json();
            console.log('Download response:', data);
            
            if (data.error) {
                if (data.error.includes('quality not available') || data.error.includes('No formats found')) {
                    showQualityUnavailableDialog(data.availableQualities);
                    return;
                }
                throw new Error(data.error);
            }
            
            downloadProcess = data.processId;
            
            // Start progress polling
            pollProgress();
            
        } catch (error) {
            console.error('Download error:', error);
            showNotification('Download error: ' + error.message, 'error');
            downloadProgress.classList.add('hidden');
            formatSelection.classList.remove('hidden');
            downloadInProgress = false;
        }
    }
    
    function addDownloadControls() {
        // Remove existing controls if any
        const existingControls = downloadProgress.querySelector('.download-controls');
        if (existingControls) {
            existingControls.remove();
        }
        
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'download-controls';
        controlsContainer.innerHTML = `
            <button id="pause-btn" class="btn secondary-btn control-btn">
                <i class="fas fa-pause"></i> 
                <span>Pause</span>
            </button>
            <button id="resume-btn" class="btn success-btn control-btn hidden">
                <i class="fas fa-play"></i> 
                <span>Resume</span>
            </button>
            <button id="cancel-btn" class="btn danger-btn control-btn">
                <i class="fas fa-times"></i> 
                <span>Cancel</span>
            </button>
        `;
        
        const progressContainer = downloadProgress.querySelector('.progress-container');
        const downloadAnimation = progressContainer.querySelector('.download-animation');
        
        // Insert controls after the download animation
        if (downloadAnimation) {
            downloadAnimation.insertAdjacentElement('afterend', controlsContainer);
        } else {
            progressContainer.appendChild(controlsContainer);
        }
        
        console.log('Download controls added to DOM');
        
        // Add event listeners with proper error handling
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', pauseDownload);
            console.log('Pause button listener added');
        }
        
        if (resumeBtn) {
            resumeBtn.addEventListener('click', resumeDownload);
            console.log('Resume button listener added');
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', cancelDownload);
            console.log('Cancel button listener added');
        }
    }
    
    async function pauseDownload() {
        console.log('Pause download called');
        
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        
        if (pauseBtn) pauseBtn.disabled = true;
        
        try {
            const response = await fetch('/api/pause-download', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            console.log('Pause response:', data);
            
            if (data.success) {
                downloadPaused = true;
                if (pauseBtn) pauseBtn.classList.add('hidden');
                if (resumeBtn) resumeBtn.classList.remove('hidden');
                showNotification('Download paused', 'info');
                
                // Update progress text
                progressText.textContent = 'Download paused - Click Resume to continue';
            } else {
                throw new Error(data.error || 'Failed to pause download');
            }
        } catch (error) {
            console.error('Pause error:', error);
            showNotification('Failed to pause download: ' + error.message, 'error');
        } finally {
            if (pauseBtn) pauseBtn.disabled = false;
        }
    }
    
    async function resumeDownload() {
        console.log('Resume download called');
        
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        
        if (resumeBtn) resumeBtn.disabled = true;
        
        try {
            const response = await fetch('/api/resume-download', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: urlInput.value.trim(),
                    quality: selectedQuality,
                    merge: mergeToggle.checked
                })
            });
            const data = await response.json();
            
            console.log('Resume response:', data);
            
            if (data.success) {
                downloadPaused = false;
                if (resumeBtn) resumeBtn.classList.add('hidden');
                if (pauseBtn) pauseBtn.classList.remove('hidden');
                showNotification('Download resumed', 'info');
                
                // Update progress text
                progressText.textContent = 'Resuming download...';
            } else {
                throw new Error(data.error || 'Failed to resume download');
            }
        } catch (error) {
            console.error('Resume error:', error);
            showNotification('Failed to resume download: ' + error.message, 'error');
        } finally {
            if (resumeBtn) resumeBtn.disabled = false;
        }
    }
    
    async function cancelDownload() {
        console.log('Cancel download called');
        
        if (!confirm('Are you sure you want to cancel this download?')) {
            return;
        }
        
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Cancelling...</span>';
        }
        
        try {
            const response = await fetch('/api/cancel-download', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            console.log('Cancel response:', data);
            
            if (data.success) {
                downloadInProgress = false;
                downloadPaused = false;
                downloadProcess = null;
                
                // Hide progress and show format selection
                downloadProgress.classList.add('hidden');
                formatSelection.classList.remove('hidden');
                
                // Reset selection
                selectedQuality = null;
                qualityCards.forEach(card => card.classList.remove('selected'));
                
                showNotification('Download cancelled successfully', 'info');
            } else {
                throw new Error(data.error || 'Failed to cancel download');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            showNotification('Failed to cancel download: ' + error.message, 'error');
        } finally {
            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.innerHTML = '<i class="fas fa-times"></i> <span>Cancel</span>';
            }
        }
    }
    
    function showQualityUnavailableDialog(availableQualities) {
        const dialog = document.createElement('div');
        dialog.className = 'quality-dialog-overlay';
        dialog.innerHTML = `
            <div class="quality-dialog">
                <h3><i class="fas fa-exclamation-triangle"></i> Quality Not Available</h3>
                <p>The selected quality is not available for this video.</p>
                <p><strong>Available qualities:</strong></p>
                <div class="available-qualities">
                    ${Object.entries(availableQualities || {})
                        .filter(([key, value]) => value)
                        .map(([key, value]) => `
                            <button class="btn secondary-btn quality-option" data-quality="${key}">
                                ${key.toUpperCase()}
                            </button>
                        `).join('')}
                </div>
                <div class="dialog-actions">
                    <button class="btn danger-btn" onclick="this.closest('.quality-dialog-overlay').remove(); resetDownload();">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners to quality options
        dialog.querySelectorAll('.quality-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newQuality = e.target.dataset.quality;
                selectedQuality = newQuality;
                dialog.remove();
                startDownload();
            });
        });
        
        downloadInProgress = false;
        downloadProgress.classList.add('hidden');
        formatSelection.classList.remove('hidden');
    }
    
    window.resetDownload = function() {
        downloadInProgress = false;
        downloadPaused = false;
        selectedQuality = null;
        qualityCards.forEach(card => card.classList.remove('selected'));
        downloadProgress.classList.add('hidden');
        formatSelection.classList.remove('hidden');
    };
    
    async function pollProgress() {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/progress');
                const data = await response.json();
                
                console.log('Progress update:', data);
                
                updateProgress(data.progress, data.stage || 'Downloading');
                
                if (data.completed && data.filename) {
                    clearInterval(pollInterval);
                    downloadCompleted(data.filename);
                } else if (data.progress >= 100 && !data.completed) {
                    // If progress is 100% but not marked as completed, wait a bit more
                    setTimeout(() => {
                        if (!data.completed) {
                            clearInterval(pollInterval);
                            downloadCompleted(data.filename || 'Download complete');
                        }
                    }, 3000);
                }
            } catch (error) {
                console.error('Progress polling error:', error);
                clearInterval(pollInterval);
                showNotification('Error checking progress', 'error');
                downloadInProgress = false;
            }
        }, 1000);
        
        // Safety timeout - if no progress after 5 minutes, stop polling
        setTimeout(() => {
            clearInterval(pollInterval);
            if (!downloadCompleted) {
                showNotification('Download timeout - please check manually', 'warning');
                downloadProgress.classList.add('hidden');
                formatSelection.classList.remove('hidden');
                downloadInProgress = false;
            }
        }, 300000); // 5 minutes
    }
    
    function updateProgress(percentage, stage) {
        const safePercentage = Math.min(Math.max(percentage || 0, 0), 100);
        progressFill.style.width = `${safePercentage}%`;
        progressText.textContent = `${stage}: ${safePercentage}%`;
        
        // Update stage-specific messages with more detail
        if (stage.includes('merge') || stage.includes('ffmpeg') || stage.includes('Finalizing')) {
            document.querySelector('.progress-container h2').textContent = 'Processing Video...';
        } else if (stage.includes('download') || stage.includes('Downloading')) {
            document.querySelector('.progress-container h2').textContent = 'Downloading...';
            
            // Show download speed if available
            if (stage.includes('at') && stage.includes('/s')) {
                const speedMatch = stage.match(/at\s+([0-9.]+[KMGT]?iB\/s)/);
                if (speedMatch) {
                    progressText.textContent = `Downloading: ${safePercentage}% at ${speedMatch[1]}`;
                }
            }
        } else if (stage.includes('Complete')) {
            document.querySelector('.progress-container h2').textContent = 'Download Complete!';
        }
    }
    
    function downloadCompleted(filename) {
        updateProgress(100, 'Complete');
        
        // Remove download controls
        const controlsContainer = downloadProgress.querySelector('.download-controls');
        if (controlsContainer) {
            controlsContainer.remove();
        }
        
        setTimeout(() => {
            downloadProgress.classList.add('hidden');
            showNotification(`Download complete: ${filename}`, 'success');
            
            // Only add to history when download is fully completed
            if (filename && filename !== 'Download complete') {
                addToHistory(urlInput.value.trim(), selectedQuality, filename);
            }
            
            // Reset selection
            selectedQuality = null;
            qualityCards.forEach(card => card.classList.remove('selected'));
            downloadInProgress = false;
            downloadPaused = false;
            downloadProcess = null;
            
            // Show celebration particles
            createCelebrationParticles();
        }, 2000);
    }
    
    function addToHistory(url, quality, filename) {
        // Prevent duplicate entries
        const existingHistory = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        const isDuplicate = existingHistory.some(item => 
            item.filename === filename && item.url === url
        );
        
        if (isDuplicate) {
            console.log('Duplicate entry prevented:', filename);
            return;
        }
        
        const timestamp = new Date().toLocaleString();
        
        // Extract actual resolution from filename if possible
        let actualQuality = quality;
        const resolutionMatch = filename.match(/(\d{3,4}p|\d+x\d+)/i);
        if (resolutionMatch) {
            actualQuality = `${quality} (${resolutionMatch[1]})`;
        }
        
        const historyItem = {
            url,
            quality: actualQuality,
            filename,
            timestamp,
            title: currentVideoInfo?.title || 'Unknown Title',
            thumbnail: currentVideoInfo?.thumbnail || null,
            id: Date.now() + Math.random(),
            duration: currentVideoInfo?.duration || 0,
            uploader: currentVideoInfo?.uploader || 'Unknown',
            fileSize: null, // Will be populated if available
            downloadDate: new Date().toISOString()
        };
        
        let history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        history.unshift(historyItem);
        
        // Keep only the latest 10 items
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        
        localStorage.setItem('downloadHistory', JSON.stringify(history));
        displayHistory();
        
        console.log('Added to history:', historyItem);
    }
    
    function loadHistory() {
        displayHistory();
    }
    
    function displayHistory() {
        const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No downloads yet</p>';
            return;
        }
        
        historyList.innerHTML = '';
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const formatDuration = (seconds) => {
                if (!seconds) return '';
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                
                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
                return `${minutes}:${secs.toString().padStart(2, '0')}`;
            };
            
            const downloadDate = new Date(item.timestamp).toLocaleDateString();
            
            historyItem.innerHTML = `
                <div class="history-thumbnail">
                    ${item.thumbnail ? `
                        <img src="${item.thumbnail}" alt="Thumbnail" />
                        ${item.duration ? `<div class="video-duration">${formatDuration(item.duration)}</div>` : ''}
                    ` : `
                        <div class="history-placeholder">
                            <i class="fab fa-youtube"></i>
                        </div>
                    `}
                </div>
                <div class="history-info">
                    <strong class="history-title">${item.title || item.filename || 'Unknown file'}</strong>
                    <div class="history-meta">
                        <span><i class="fas fa-video"></i> Quality: ${item.quality}</span>
                        <span><i class="fas fa-user"></i> ${item.uploader || 'Unknown'}</span>
                        <span><i class="fas fa-calendar"></i> ${downloadDate}</span>
                    </div>
                    <div class="history-filename">${item.filename}</div>
                </div>
                <div class="history-actions">
                    <button class="btn-small secondary-btn" onclick="openFileLocation('${item.filename}')">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="btn-small danger-btn" onclick="removeFromHistory('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });
    }
    
    window.openFileLocation = function(filename) {
        fetch('/api/open-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification('Opening file location', 'info');
            }
        })
        .catch(error => {
            showNotification('Error opening file location', 'error');
        });
    };
    
    window.removeFromHistory = function(id) {
        if (!confirm('Remove this item from history?')) return;
        
        let history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        history = history.filter(item => item.id !== id);
        localStorage.setItem('downloadHistory', JSON.stringify(history));
        displayHistory();
        showNotification('Item removed from history', 'info');
    };
    
    function clearHistory() {
        if (!confirm('Are you sure you want to clear your download history?')) {
            return;
        }
        
        localStorage.removeItem('downloadHistory');
        displayHistory();
        showNotification('Download history cleared', 'success');
    }
    
    function openDownloadsFolder() {
        fetch('/api/open-folder', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showNotification(data.error, 'error');
                } else {
                    showNotification('Opening downloads folder', 'info');
                }
            })
            .catch(error => {
                showNotification('Error opening folder: ' + error.message, 'error');
            });
    }
    
    function checkForUpdates() {
        fetch('/api/check-update')
            .then(response => response.json())
            .then(data => {
                if (data.updateAvailable) {
                    showNotification('Update available! yt-dlp will be updated.', 'info');
                } else {
                    showNotification('yt-dlp is already up to date!', 'success');
                }
            })
            .catch(error => {
                showNotification('Error checking for updates: ' + error.message, 'error');
            });
    }
    
    function createCelebrationParticles() {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.width = '6px';
            particle.style.height = '6px';
            particle.style.background = i % 2 === 0 ? 'var(--primary)' : 'var(--secondary)';
            particle.style.borderRadius = '50%';
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.top = window.innerHeight + 'px';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            particle.style.boxShadow = '0 0 10px currentColor';
            
            document.body.appendChild(particle);
            
            particle.animate([
                { 
                    transform: 'translateY(0) rotate(0deg)',
                    opacity: 1
                },
                { 
                    transform: `translateY(-${window.innerHeight + 100}px) rotate(720deg)`,
                    opacity: 0
                }
            ], {
                duration: 3000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => particle.remove();
        }
    }
    
    function showNotification(message, type = 'info') {
        console.log(`Notification [${type}]:`, message);
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 5px;
            color: white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background-color: ${type === 'success' ? '#00e676' : type === 'error' ? '#ff1744' : '#0066ff'};
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    function isValidYoutubeUrl(url) {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^(https?:\/\/)?(m\.)?youtube\.com\/.+/,
            /^(https?:\/\/)?youtu\.be\/.+/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }
});
