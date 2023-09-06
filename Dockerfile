# Use a smaller and more secure alpine base image
FROM node:current-alpine3.18 AS builder

# Switch to a non-root user for subsequent operations
USER node

# Set working directory inside the image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci 

# Stage 2: Only keep what we need to run the app
FROM node:current-alpine3.18 AS runner

# switch to a non-root user
USER node

WORKDIR /usr/src/app

# Copy installed dependencies
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules/

# Copy all other files
COPY --chown=node:node . .

# Expose the app port
EXPOSE 3000

# Run the application
CMD [ "npm", "start" ]
