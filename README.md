# McGill Minerva Registration System

System that attempts to register for a McGill class through McGill's Minerva at a certain time interval. The system uses a headless browser to crawl through Minerva and attempt registration. Upon registration error, system sleeps for a provided amount of time, and retries again. Upon logout or unknown error, program retries from scratch.

## Requirements

Your machine needs to have npm installed. Please follow link for instructions.
https://www.npmjs.com/get-npm

## Dependencies & Setup

To install dependencies:

```
npm install
```

To setup Minerva _credentials_ and course _term_ and _CRN_, go to _src/config.ts_ and fill in fields. In addition, further implementation details are available in the config file.

## Run System

```
npm start
```

## Deploying to Heroku

Optionally the system can be deployed on Heroku. Easy way of doing it is linking a github repo to the heroku app and setting up the Heroku pruduction environemnt (ENV) variables.
