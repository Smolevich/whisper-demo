// whisper-worker.js - Изолированный поток для Whisper
// Загружаем Transformers.js в Worker
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriber = null;
let currentModel = null;

// Обработка сообщений от главного потока
self.addEventListener('message', async (e) => {
    const { type, data } = e.data;
    
    try {
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
            error: error.message 
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

