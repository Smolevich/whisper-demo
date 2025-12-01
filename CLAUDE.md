# WhisperX Demo

API сервис для транскрибации аудио и видео файлов с использованием WhisperX.

## Возможности

- Автоматическая транскрибация аудио файлов
- Поддержка видео форматов (MKV, WebM и др.) с автоматическим извлечением аудио
- Несколько моделей Whisper (base, small, medium, large)
- Автоматическое определение GPU/CPU для оптимальной производительности
- Экспорт результатов в разных форматах: JSON, SRT, VTT, TXT, TSV

## Архитектура

- **FastAPI** - веб-сервер для API
- **WhisperX** - улучшенная версия Whisper с точным выравниванием временных меток
- **FFmpeg** - для извлечения аудио из видео файлов
- **Docker** - контейнеризация приложения

## Структура проекта

```
.
├── api.py              # FastAPI сервер
├── Dockerfile          # Образ Docker с WhisperX и зависимостями
├── docker-compose.yml  # Конфигурация для запуска сервиса
├── input/             # Папка для входных файлов (игнорируется git)
├── output/            # Папка для результатов транскрибации (игнорируется git)
└── models/            # Кэш моделей Whisper (игнорируется git)
```

## Использование

### Через API

1. Запустить сервис:
```bash
docker-compose up -d
```

2. Отправить файл на транскрибацию:
```bash
curl -X POST "http://localhost:8000/transcribe" \
  -F "audio_file=@your_file.mp3" \
  -F "language=ru" \
  -F "model=base"
```

### Через Docker Exec (для локальных файлов)

1. Поместить файл в папку `input/`

2. Для аудио файлов:
```bash
docker exec whisperx-service whisperx /app/input/file.mp3 \
  --model large \
  --language ru \
  --output_dir /app/output \
  --output_format all
```

3. Для видео файлов (сначала извлечь аудио):
```bash
docker exec whisperx-service ffmpeg \
  -i /app/input/video.mkv \
  -vn -acodec libmp3lame -q:a 2 \
  /app/input/audio.mp3

docker exec whisperx-service whisperx /app/input/audio.mp3 \
  --model large \
  --language ru \
  --output_dir /app/output \
  --output_format all
```

## Модели Whisper

- `tiny` - самая быстрая, минимальная точность
- `base` - быстрая, базовая точность
- `small` - стандартная (по умолчанию)
- `medium` - хороший баланс скорости и точности
- `large` / `large-v3` - максимальная точность, медленнее

## Примечания

- Первый запуск с новой моделью требует времени на загрузку (~3GB для large)
- GPU значительно ускоряет обработку (требуется nvidia-docker)
- Качество транскрибации зависит от качества аудио и выбранной модели
