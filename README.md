# WhisperX Docker Compose

Docker Compose конфигурация для запуска WhisperX через REST API.

## Быстрый старт

```bash
docker-compose up -d --build
```

## Использование

После запуска сервис будет доступен на `http://localhost:8000`

### Примеры запросов

**Транскрипция аудио файла:**
```bash
curl -X POST "http://localhost:8000/transcribe" \
  -F "audio_file=@/path/to/audio.mp3" \
  -F "language=ru" \
  -F "model=base"
```

**С выравниванием (alignment):**
```bash
curl -X POST "http://localhost:8000/transcribe" \
  -F "audio_file=@/path/to/audio.mp3" \
  -F "language=ru" \
  -F "model=base" \
  -F "align=true"
```

**Проверка здоровья:**
```bash
curl http://localhost:8000/health
```

**Документация API:**
Откройте в браузере `http://localhost:8000/docs`

## Структура директорий

- `input/` - входные аудио файлы (временные)
- `output/` - результаты транскрипции в JSON формате
- `models/` - кэш моделей WhisperX

## Параметры транскрипции

- `language` - язык аудио (ru, en, и т.д.), по умолчанию "ru"
- `model` - модель Whisper (tiny, base, small, medium, large), по умолчанию "base"
- `align` - включить выравнивание временных меток, по умолчанию false

