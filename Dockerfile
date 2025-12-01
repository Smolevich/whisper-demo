FROM python:3.13-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Обновление pip и установка WhisperX
RUN pip install -U pip whisperx

# Установка веб-сервера
RUN pip install fastapi uvicorn python-multipart

# Копирование API сервиса
COPY api.py /app/api.py

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]

