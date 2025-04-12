FROM node:18-alpine AS builder

WORKDIR /app

# Copy the entire project for TypeScript compilation
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# Install dependencies and build
RUN npm ci
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files, but modify to remove prepare script
COPY --from=builder /app/package*.json ./
# Remove prepare script to prevent it from running during install
RUN cat package.json | grep -v '"prepare":' > temp.json && mv temp.json package.json

# Copy already built files
COPY --from=builder /app/build/ ./build/

# Install only production dependencies without running scripts
RUN npm install --omit=dev --no-package-lock --ignore-scripts

# Set executable permissions on entry point
RUN chmod +x ./build/index.js

# Expose any necessary environment variables
ENV NODE_ENV=production

# Command to run the server
CMD ["node", "build/index.js"] 