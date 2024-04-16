# Nango Sample App

This repository provides a practical demonstration of integrating Nango into your codebase. It includes Syncs scripts, a backend API for managing Nango's webhooks, and a straightforward frontend for user interaction and data retrieval.

![Example App](example.png)

## Highlights

- [nango-integrations](/nango-integrations/) folder contains the scripts responsible to fetch each user data
- [front-end](/front-end/src/components/integrationGrid.tsx#L24) folder contains the code to OAuth your users
- [back-end](/back-end/src/app.ts) folder contains the necessary endpoints to handle webhooks and access Nango's data

---

## Launching locally

To use this demo you will need:

- An account on [nango.dev](https://app.nango.dev?source=sample-app)
- NodeJS
- Docker
- Slack OAuth app with bot permissions `users:read`

```sh
git clone https://github.com/NangoHQ/sample-app.git

cd sample-app

# Use the right NodeJS version
nvm use

# Setup the repo
npm i

# Add your Nango Secret Key
cp .env.example .env

# Add your Nango Public Key
cp front-end/.env.example front-end/.env

# ---- Setup nango
# Add your Nango Secret Key in NANGO_SECRET_KEY_PROD
npm install -g nango
cd nango-integrations/
cp .env.example .env
nango deploy prod

# Proxy the webhooks
# Copy the <URL>/webhooks-from-nango in your environment settings https://app.nango.dev/prod/environment-settings
# This should be kept running
npm run webhooks-proxy

# Launch
npm run start
```

Go to: [http://localhost:3000](http://localhost:3000)
