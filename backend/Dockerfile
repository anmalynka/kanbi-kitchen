# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy ONLY backend's package files
COPY backend/package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy ONLY backend's source code and tsconfig
COPY backend/ .

# Copy recipes.json and plan.json from the root into the root of /app (they are needed by the app)
COPY recipes.json plan.json /app/

# Run build and list contents of /app to debug
# We expect /app/dist to be created
RUN npm run build && ls -la /app/dist

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy only the compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the data files into the production image as well
COPY recipes.json plan.json ./

EXPOSE 3000

# Match package.json: "start": "node dist/app.js"
CMD ["node", "dist/app.js"]
