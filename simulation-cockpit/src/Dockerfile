FROM python:3.9-slim

WORKDIR /app

COPY hud_renderer.py requirements.txt /app/

RUN pip install --no-cache-dir -r requirements.txt

ENTRYPOINT ["python", "hud_renderer.py"]
