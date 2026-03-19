# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code and tsconfig
COPY . .

# Run build using the locally installed tsc
RUN ./node_modules/.bin/tsc && ls -la dist

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy only the compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Copy recipes.json and plan.json if they exist in the current context
# This assumes context is "backend" or files were copied into it
COPY recipes.json* plan.json* ./

EXPOSE 3000

# Match package.json: "start": "node dist/app.js"
CMD ["node", "dist/app.js"]
