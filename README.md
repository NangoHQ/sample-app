# wolfcrm

## Launching locally

To use this demo you will need:

- An account on [nango.dev](https://app.nango.dev?source=wolfcrm)
- NodeJS
- Docker

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

# Setup nango
npm install -g nango
cd nango-integrations/
# Add your Nango Secret Key in NANGO_SECRET_KEY_PROD
cp .env.example .env
nango deploy prod

# Launch
npm run start
```

Go to: [http://localhost:3000](http://localhost:3000)
