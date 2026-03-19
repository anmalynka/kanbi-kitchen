# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code and tsconfig
COPY . .

# Run build and list contents of /app to debug
RUN npm run build && ls -la /app

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy only the compiled code from the builder stage
# Based on tsconfig.json, outDir is ./dist
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Match package.json: "start": "node dist/app.js"
CMD ["node", "dist/app.js"]
