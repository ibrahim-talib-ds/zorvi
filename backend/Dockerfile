FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --timeout 600 --retries 5 -r requirements.txt

COPY . .

# Force the environment variables directly into the container
ENV DATABASE_URL="postgres://postgres:mlsawdSGAVM75Z7v8ZFcliVIZgU8IsxLXRWdmEOAHf05TUnYg7wTSiGU9CiOhJm1@5ciusmnmqis4a1hw8ikmsrjy:5432/zorvi"
ENV DATABASE_URL_SYNC="postgres://postgres:mlsawdSGAVM75Z7v8ZFcliVIZgU8IsxLXRWdmEOAHf05TUnYg7wTSiGU9CiOhJm1@5ciusmnmqis4a1hw8ikmsrjy:5432/zorvi"
ENV SECRET_KEY="zorvi-super-secret-2026-key"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
