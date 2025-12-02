// whisper-worker.js - Изолированный поток для Whisper
// Загружаем Transformers.js через importScripts для Worker
// Используем ESM версию через динамический импорт
let pipeline, env;

async function initTransformers() {
    if (pipeline && env) return;
    
    // Используем динамический импорт для ESM модулей в Worker
    const transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
    pipeline = transformers.pipeline;
    env = transformers.env;

    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.useBrowserCache = true;
}

let transcriber = null;
let currentModel = null;

// Обработка сообщений от главного потока
self.addEventListener('message', async (e) => {
    const { type, data } = e.data;
    
    try {
        // Инициализируем Transformers.js при первом сообщении
        await initTransformers();
        
        switch(type) {
            case 'load':
                await loadModel(data.modelName);
                break;
            case 'transcribe':
                await transcribe(data.audioUrl, data.options);
                break;
            case 'stop':
                // Остановка обработки
                self.postMessage({ type: 'stopped' });
                break;
        }
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            error: error.message || String(error)
        });
    }
});

async function loadModel(modelName) {
    if (currentModel === modelName && transcriber) {
        self.postMessage({ type: 'modelLoaded' });
        return;
    }
    
    self.postMessage({ type: 'status', message: `Загрузка модели ${modelName}...` });
    
    transcriber = await pipeline('automatic-speech-recognition', modelName, {
        progress_callback: (progress) => {
            if (progress.status === 'progress') {
                let percent = progress.progress;
                if (percent <= 1) {
                    percent = percent * 100;
                }
                percent = Math.max(0, Math.min(100, Math.round(percent)));
                
                self.postMessage({ 
                    type: 'loadProgress', 
                    progress: percent 
                });
            }
        }
    });
    
    currentModel = modelName;
    self.postMessage({ type: 'modelLoaded' });
}

async function transcribe(audioUrl, options) {
    if (!transcriber) {
        throw new Error('Модель не загружена');
    }
    
    self.postMessage({ type: 'status', message: 'Транскрипция...' });
    
    // Транскрипция в изолированном потоке
    const result = await transcriber(audioUrl, options);
    
    self.postMessage({ 
        type: 'result', 
        result: result 
    });
}

