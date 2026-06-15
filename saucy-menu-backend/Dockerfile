# Use official Bun image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN bun install

# Expose port
EXPOSE 8080

# Start your app
CMD ["bun", "start"]  # or your actual start script
