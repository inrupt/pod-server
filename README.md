# Inrupt Pod Server

This is a monorepo for Inrupt Pod Server. It includes:

 - [pod-server](packages/pod-server): Combines all packages together into a Solid compliant server.
 - [solid-idp](packages/solid-idp): Solid Identity Provider
 - [wac-ldp](packages/wac-ldp): Web Access Control Linked Data Platform (The main storage system)
 - [websockets-pubsub](packages/websockets-pubsub): Handles websocket connections.

## Installation

```bash
git clone https://github.com/inrupt/pod-server.git
cd pod-server
npm install
npm run bootstrap
```

## Dev
```bash
npm run dev
```

## Test
```bash
npm run test
```