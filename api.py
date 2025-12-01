from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import subprocess
import os
import uuid
import json
from pathlib import Path
import shutil

app = FastAPI(title="WhisperX API")

INPUT_DIR = Path("/app/input")
OUTPUT_DIR = Path("/app/output")

INPUT_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


def detect_compute_type():
    """
    Автоматически определяет доступность GPU и возвращает оптимальный compute_type.
    Возвращает 'float16' для GPU или 'float32' для CPU.
    """
    # Проверка через nvidia-smi (если доступен)
    try:
        result = subprocess.run(
            ["nvidia-smi"],
            capture_output=True,
            text=True,
            timeout=2
        )
        if result.returncode == 0:
            # GPU доступен, используем float16 для ускорения
            return "float16"
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
        pass
    
    # Проверка через переменные окружения CUDA
    if os.environ.get("CUDA_VISIBLE_DEVICES") is not None:
        # CUDA устройства указаны, пробуем float16
        return "float16"
    
    # По умолчанию используем CPU с float32
    return "float32"


@app.get("/health")
async def health():
    compute_type = detect_compute_type()
    return {
        "status": "ok",
        "compute_type": compute_type,
        "device": "gpu" if compute_type == "float16" else "cpu"
    }


@app.post("/transcribe")
async def transcribe(
    audio_file: UploadFile = File(...),
    language: str = Form("ru"),
    model: str = Form("base"),
    align: bool = Form(False)
):
    """
    Транскрибирует аудио файл используя WhisperX
    """
    file_id = str(uuid.uuid4())
    input_path = INPUT_DIR / f"{file_id}_{audio_file.filename}"
    output_path = OUTPUT_DIR / file_id

    try:
        # Сохранение загруженного файла
        with open(input_path, "wb") as f:
            shutil.copyfileobj(audio_file.file, f)

        # Автоматическое определение compute_type (GPU/CPU)
        compute_type = detect_compute_type()
        
        # Подготовка команды WhisperX
        cmd = [
            "whisperx",
            str(input_path),
            "--model", model,
            "--language", language,
            "--output_dir", str(output_path),
            "--output_format", "json",
            "--compute_type", compute_type
        ]

        if align:
            cmd.append("--align")

        # Запуск WhisperX
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )

        # Поиск результата (WhisperX создает файл с расширением .json)
        json_files = list(output_path.glob("*.json"))
        
        if json_files:
            output_file = json_files[0]
            with open(output_file, "r", encoding="utf-8") as f:
                result_data = json.load(f)
            
            # Очистка временных файлов
            input_path.unlink()
            
            return JSONResponse(content={
                "status": "success",
                "result": result_data
            })
        else:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Output file not found"}
            )

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": e.stderr or str(e)
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
    finally:
        # Очистка при ошибке
        if input_path.exists():
            input_path.unlink()

