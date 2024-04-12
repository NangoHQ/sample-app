# wolfcrm

This is an example of how you can fully implement Nango inside your own codebase. It contains some Syncs scripts, a backend API that handles Nango's webhooks and a frontend that allows your users to connect and fetch their data.

## Highlights

- [nango-integrations](/nango-integrations/) folder contains the scripts responsible to fetch each user data
- [front-end](/front-end/src/components/integrationGrid.tsx#L24) contains the code to oAuth your users
- [back-end](/back-end/src/app.ts) contains the necessary endpoints to handle webhooks and access Nango's data

---

## Launching locally

To use this demo you will need:

- An account on [nango.dev](https://app.nango.dev?source=wolfcrm)
- NodeJS
- Docker
- Slack oAuth app with `users:read`

```sh
git clone https://github.com/NangoHQ/wolfcrm.git

cd wolfcrm

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
