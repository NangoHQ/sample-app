# Nango Sample App

This repository provides a practical demonstration of integrating Nango into your codebase. It includes Syncs scripts, a backend API for managing Nango's webhooks, and a straightforward frontend for user interaction and data retrieval.

![Example App](example.png)

## Highlights

- Folder [back-end](/back-end/src/app.ts) To integrate with Nango you need a backend that will listen to Nango’s webhooks and interact with our API.

- Folder [front-end](/front-end/src/components/integrationGrid.tsx#L24) Finally to let your user connect to your integration you need a frontend and call to our auth library.

- Folder [nango-integrations](/nango-integrations/) **Optional** To use Nango you need some integrations, we provide templates for most provider but you can also use custom scripts. This folder (setup with our CLI) contains the scripts that will fetch your users’ data.

---

### Launching locally

To use this demo you will need:

## Step 1: Create an account

- Go to [nango.dev](https://app.nango.dev?source=sample-app)
- Create an account, it's free

## Step 2: Create a Slack integration

- Go to [Integrations Page](https://app.nango.dev/dev/integrations?source=sample-app)
- Create an integration > Slack
- Then go to [Slack Dev Center](https://api.slack.com/apps)
- Create a Slack OAuth app with **Bot Token Scopes**
  - `users:read`
  - `chat:write`
- Go back to Nango:
  - Add credentials in the integration
  - Activate endpoint `GET /users`
  - Activate endpoint `POST /send-message`

## Step 3: Prepare your env

Install

- NodeJS
- Docker

```sh
git clone https://github.com/NangoHQ/sample-app.git

cd sample-app

nvm use

npm i
```

## Step 4: Copy secrets

- Copy backend .env

```sh
cp .env.example .env
```

- Add your Nango Secret Key, you can find it in [Environment Settings](https://app.nango.dev/dev/environment-settings?source=sample-app)

```sh
NANGO_SECRET_KEY=_SECRET_
```

## Step 5: Transfer Webhooks locally

- This command should be running at all time

```sh
npm run webhooks-proxy
```

- Copy the URL the command gave you
- Go to [Environment Settings](https://app.nango.dev/dev/environment-settings?source=sample-app)
- Edit Webhook URL to
  - `${URL}/webhooks-from-nango`, e.g: `https://tame-socks-warn.loca.lt/webhooks-from-nango`

> [!NOTE]
> If that doesn't work, you can use grok

## Step 6: Launch

```sh
npm run start
```

Go to: [http://localhost:3000](http://localhost:3000)

---

## Step Bonus: Deploy custom scripts

This demo use templates by default, but you can also use custom scripts

```sh
# Setup nango
npm install -g nango
cd nango-integrations/
nango init

# Add your Nango Secret Key in NANGO_SECRET_KEY_PROD
code .env

# Change and deploy
nango deploy prod
```
