# Nango Sample App

This repository provides a practical demonstration of integrating Nango into your codebase. It includes Syncs scripts, a backend API for managing Nango's webhooks, and a straightforward frontend for user interaction and data retrieval.

![Example App](example.png)

## Highlights

- Folder [nango-integrations](/nango-integrations/) To use Nango you need some integrations, this folder (setup with our CLI) contains the scripts that will fetch your users’ data.

- Folder [back-end](/back-end/src/app.ts) To ingegrate with Nango you need a backend that will listen to Nango’s webhooks and interact with our API.

- Folder [front-end](/front-end/src/components/integrationGrid.tsx#L24) Finally to let your user connect to your integration you need a frontend and call to our auth library.

---

### Launching locally

To use this demo you will need:

- An account on [nango.dev](https://app.nango.dev?source=sample-app)
- NodeJS
- Docker
- Slack OAuth app with Bot Token Scopes `users:read`, `chat:write`

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
npm install -g nango
cd nango-integrations/
nango init

# Add your Nango Secret Key in NANGO_SECRET_KEY_PROD
code .env
nango deploy prod

# Proxy the webhooks
# Copy the <URL>/webhooks-from-nango in your environment settings https://app.nango.dev/prod/environment-settings
# This should be kept running
npm run webhooks-proxy

# Launch
npm run start
```

Go to: [http://localhost:3000](http://localhost:3000)
