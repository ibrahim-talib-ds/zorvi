FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_ROOT_USER_ACTION=ignore

RUN addgroup --system app \
    && adduser --system --ingroup app app

COPY requirements.txt ./
RUN pip install --no-cache-dir --timeout 600 --retries 5 -r requirements.txt

COPY --chown=app:app . .
RUN mkdir -p /app/storage /app/app/storage /app/logs \
    && chown -R app:app /app/storage /app/app/storage /app/logs

USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)" || exit 1
CMD ["sh", "./start.sh"]
