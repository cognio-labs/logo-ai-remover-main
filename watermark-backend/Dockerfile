FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=5000 \
    IMAGE_JOB_DIR=/app/image_jobs

WORKDIR /app

# Copy requirements separately to improve layer caching.
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app.py processor.py image_processor.py ./
COPY static ./static

# Jobs are stored outside the web-served static folder.
RUN mkdir -p /app/image_jobs /app/uploads /app/outputs \
    && useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

CMD ["python", "app.py"]

