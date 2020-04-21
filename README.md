# Minerva Class Registerer

Program that attempts to register for a McGill class through minerva at a certain time interval. The system uses a headless browser to crawl through the Minerva website and attempt registration. Upon error, sleeps for a provided amount of time, and retries. Upon logout or unknown error, program retries from scratch.

## Requirements

Your machine needs to have npm installed. Please follow link for instructions.
https://www.npmjs.com/get-npm

## Dependencies & Setup

To install dependencies:

```
npm install
```

To setup Minerva _credentials_ and course _term_ and _CRN_, go to _src/config.ts_ and fill in fields. In addition, further implementation details are available in the config file.

## Run

```
npm start
```
