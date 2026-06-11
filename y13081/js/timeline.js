const Timeline = (function() {
    let timeFrames = [];
    let currentFrameIndex = 0;
    let isPlaying = false;
    let playSpeed = 1;
    let lastFrameTime = 0;
    let frameInterval = 500;
    let onFrameChangeCallback = null;
    let onPlayStateChangeCallback = null;

    function init(frames) {
        timeFrames = frames;
        currentFrameIndex = 0;

        setupUI();
        renderEventMarkers();

        return {
            play: play,
            pause: pause,
            nextFrame: nextFrame,
            prevFrame: prevFrame,
            goToFrame: goToFrame,
            setSpeed: setSpeed,
            getCurrentFrame: getCurrentFrame,
            getCurrentIndex: function() { return currentFrameIndex; },
            isPlaying: function() { return isPlaying; },
            onFrameChange: function(callback) {
                onFrameChangeCallback = callback;
            },
            onPlayStateChange: function(callback) {
                onPlayStateChangeCallback = callback;
            }
        };
    }

    function setupUI() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevFrameBtn = document.getElementById('prevFrame');
        const nextFrameBtn = document.getElementById('nextFrame');
        const speedSelect = document.getElementById('playSpeed');
        const timelineTrack = document.getElementById('timelineTrack');

        playPauseBtn.addEventListener('click', togglePlay);
        prevFrameBtn.addEventListener('click', prevFrame);
        nextFrameBtn.addEventListener('click', nextFrame);
        speedSelect.addEventListener('change', (e) => {
            setSpeed(parseFloat(e.target.value));
        });

        timelineTrack.addEventListener('click', onTrackClick);

        updateTimelineDisplay();
    }

    function renderEventMarkers() {
        const eventsContainer = document.getElementById('timelineEvents');
        eventsContainer.innerHTML = '';

        const totalFrames = timeFrames.length;
        if (totalFrames === 0) return;

        const events = [];
        timeFrames.forEach((frame, idx) => {
            let hasWarning = false;
            let hasError = false;

            frame.records.forEach(record => {
                if (record.status === 'warning') hasWarning = true;
                if (record.status === 'error') hasError = true;
            });

            if (hasError) {
                events.push({ index: idx, type: 'error' });
            } else if (hasWarning) {
                events.push({ index: idx, type: 'warning' });
            }
        });

        events.forEach(event => {
            const dot = document.createElement('div');
            dot.className = `timeline-event-dot ${event.type}`;
            dot.style.left = `${(event.index / (totalFrames - 1)) * 100}%`;
            dot.title = `${timeFrames[event.index].time} - ${event.type === 'error' ? '异常' : '预警'}事件`;
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                goToFrame(event.index);
            });
            eventsContainer.appendChild(dot);
        });
    }

    function togglePlay() {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    function play() {
        if (isPlaying) return;
        isPlaying = true;
        lastFrameTime = performance.now();
        updatePlayButton();
        animate();

        if (onPlayStateChangeCallback) {
            onPlayStateChangeCallback(true);
        }
    }

    function pause() {
        isPlaying = false;
        updatePlayButton();

        if (onPlayStateChangeCallback) {
            onPlayStateChangeCallback(false);
        }
    }

    function animate() {
        if (!isPlaying) return;

        const now = performance.now();
        const delta = now - lastFrameTime;
        const interval = frameInterval / playSpeed;

        if (delta >= interval) {
            nextFrame();
            lastFrameTime = now;
        }

        if (isPlaying) {
            requestAnimationFrame(animate);
        }
    }

    function nextFrame() {
        if (currentFrameIndex < timeFrames.length - 1) {
            goToFrame(currentFrameIndex + 1);
        } else {
            pause();
        }
    }

    function prevFrame() {
        if (currentFrameIndex > 0) {
            goToFrame(currentFrameIndex - 1);
        }
    }

    function goToFrame(index) {
        if (index < 0 || index >= timeFrames.length) return;

        currentFrameIndex = index;
        updateTimelineDisplay();

        if (onFrameChangeCallback) {
            onFrameChangeCallback(timeFrames[currentFrameIndex]);
        }
    }

    function setSpeed(speed) {
        playSpeed = speed;
    }

    function getCurrentFrame() {
        return timeFrames[currentFrameIndex];
    }

    function onTrackClick(e) {
        const track = e.currentTarget;
        const rect = track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const frameIndex = Math.round(percentage * (timeFrames.length - 1));
        goToFrame(Math.max(0, Math.min(timeFrames.length - 1, frameIndex)));
    }

    function updateTimelineDisplay() {
        const progress = document.getElementById('timelineProgress');
        const marker = document.getElementById('timelineMarker');
        const frameDisplay = document.getElementById('timelineFrame');
        const timeDisplay = document.getElementById('currentTimeDisplay');
        const dateDisplay = document.getElementById('timelineDate');

        const percentage = timeFrames.length > 1
            ? (currentFrameIndex / (timeFrames.length - 1)) * 100
            : 0;

        progress.style.width = `${percentage}%`;
        marker.style.left = `${percentage}%`;

        frameDisplay.textContent = `帧 ${currentFrameIndex + 1} / ${timeFrames.length}`;

        if (timeFrames[currentFrameIndex]) {
            timeDisplay.textContent = timeFrames[currentFrameIndex].time;
        }
    }

    function updatePlayButton() {
        const btn = document.getElementById('playPauseBtn');
        btn.textContent = isPlaying ? '⏸' : '▶';
        btn.title = isPlaying ? '暂停' : '播放';
    }

    return {
        init: init
    };
})();
