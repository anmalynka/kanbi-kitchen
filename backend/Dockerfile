# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code and tsconfig from backend directory
COPY backend/ .

# Copy recipes.json and plan.json from root directory
COPY recipes.json* plan.json* ./

# Run build using the script in package.json
RUN npm run build && ls -la /app/dist

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy only the compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Copy recipes.json and plan.json if they exist
COPY --from=builder /app/recipes.json* /app/plan.json* ./

EXPOSE 3000

# Match package.json: "start": "node dist/app.js"
CMD ["node", "dist/app.js"]
