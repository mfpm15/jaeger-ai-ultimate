# Jaeger AI - Production Docker Image
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    nmap \
    curl \
    wget \
    bind-tools \
    openssl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY jaeger-bot.js ./
COPY README.md ./

# Create non-root user
RUN addgroup -g 1001 -S jaeger && \
    adduser -S jaeger -u 1001

# Change ownership of the app directory
RUN chown -R jaeger:jaeger /app
USER jaeger

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port for monitoring
EXPOSE 3000

# Run the bot
CMD ["node", "jaeger-bot.js"]