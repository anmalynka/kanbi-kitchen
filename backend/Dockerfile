# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from the current directory (which is ./backend in docker-compose)
COPY package*.json ./

RUN npm install

# Copy the rest of the backend files
COPY . .

# Run the build script defined in backend/package.json
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy only production dependencies and the built dist folder
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# The compiled app uses dist/app.js as defined in package.json "main"
EXPOSE 3000

CMD ["node", "dist/app.js"]
