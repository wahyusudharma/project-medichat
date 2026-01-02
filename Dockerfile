# TAHAP 1: Build React
FROM node:18 AS build-step
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY public ./public
COPY src ./src
RUN npm run build

# TAHAP 2: Setup Python
FROM python:3.9
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user:user backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user:user backend/main.py main.py
COPY --chown=user:user --from=build-step /app/build ./build

ENV HF_HOME=/app/cache
USER root
RUN mkdir -p /app/cache && chmod -R 777 /app
USER user

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]