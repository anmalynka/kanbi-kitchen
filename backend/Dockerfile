# Frontend Build Stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Backend Build Stage
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app

# Copy backend dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/dist ./dist

# Copy compiled frontend to 'public' folder for backend to serve
COPY --from=frontend-builder /app/dist ./public

# Copy data files
COPY recipes.json* plan.json* ./

EXPOSE 3000
CMD ["node", "dist/app.js"]
