# Use stable Node image
FROM node:18

# Set working directory
WORKDIR /app

# Copy only dependency files first (caching layer for faster builds)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Expose API port
EXPOSE 10000

# Set environment variables (optional, use Render dashboard instead)
# ENV NODE_ENV=production

# Start the backend
CMD ["node", "server.js"]
