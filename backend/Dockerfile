FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 600 --retries 5 -r requirements.txt
COPY . .

ENV DATABASE_URL="postgresql+asyncpg://postgres:mlsawdSGAVM75Z7v8ZFcliVIZgU8IsxLXRWdmEOAHf05TUnYg7wTSiGU9CiOhJm1@5ciusmnmqis4a1hw8ikmsrjy:5432/zorvi"
ENV DATABASE_URL_SYNC="postgresql://postgres:mlsawdSGAVM75Z7v8ZFcliVIZgU8IsxLXRWdmEOAHf05TUnYg7wTSiGU9CiOhJm1@5ciusmnmqis4a1hw8ikmsrjy:5432/zorvi"
ENV SECRET_KEY="zorvi-super-secret-2026-key"
# Hardcode the PUBLIC Frontend URL for CORS
ENV BACKEND_CORS_ORIGINS="http://sjsjkccnxvsuqihkh9zbzujdx.172.21.0.1.sslip.io"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
