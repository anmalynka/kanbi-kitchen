# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# In this setup, we assume the context is the backend/ directory (standard for rootDir: backend)
# Copy package files from the current directory
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code and tsconfig
COPY . .

# Run build and list contents of /app to debug
# We expect /app/dist to be created
RUN npm run build && ls -la /app/dist

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy only the compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Note: If recipes.json and plan.json are in the root of the project, 
# and rootDir is "backend", they might be missing here. 
# We'll expect them to be provided via environment or volume in production, 
# or we can try to copy them if they are in the context.

EXPOSE 3000

# Match package.json: "start": "node dist/app.js"
CMD ["node", "dist/app.js"]
