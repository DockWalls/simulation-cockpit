FROM python:3.10-slim

WORKDIR /app
COPY score.py clause-pose-map.yaml hud-frame.json ./
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "score.py"]