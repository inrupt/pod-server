# pod-server

[![Build Status](https://travis-ci.org/inrupt/pod-server.svg?branch=master)](https://travis-ci.org/inrupt/pod-server)

[![Coverage Status](https://coveralls.io/repos/github/inrupt/pod-server/badge.svg?branch=master)](https://coveralls.io/github/inrupt/pod-server?branch=master)

[![Greenkeeper badge](https://badges.greenkeeper.io/inrupt/pod-server.svg)](https://greenkeeper.io/)

Solid server package that bind together
[solid-idp](https://github.com/inrupt/solid-idp),
[wac-ldp](https://github.com/inrupt/wac-ldp),
[websockets-pubsub](https://github.com/inrupt/websockets-pubsub), and the
[data-browser](https://github.com/linkeddata/mashlib).

# Running on localhost, NSS compat mode

```sh
git clone https://github.com/inrupt/pod-server
cd pod-server
git checkout dev
npm install
cp config.json-local-nss-compat config.json
cp -r ../../solid/node-solid-server/.db .
cp -r ../../solid/node-solid-server/data .
npm start
```

# Architecture

## The Solid Spec Protocols

This server implements version 0.7 of the [Solid spec](https://github.com/solid/solid-spec). This is a diagram of the layering of protocols:

![protocol layers](https://user-images.githubusercontent.com/408412/57321843-78149980-7102-11e9-8c32-4ebda462335e.png)

## Functions of the server
Regardless of the layering of protocols, we have a layering of functional components in the software, which looks as follows:

![Functional components of inrupt's pod-server](https://user-images.githubusercontent.com/408412/57322032-de99b780-7102-11e9-8a20-9e49e0d44f04.png)

It shows how the different functional units of the server (persistence, auth, data interface, etc.) depend on each other. 

## Code modules
This server delegates some of its functions to npm modules it depends on.

### solid-idp
The [solid-idp](https://github.com/inrupt/solid-idp) module implements the webid-oidc functionality. Note that a pod-server makes no explicit distinction between local and remote users. In terms of organization, each user gets an identity and a storage space, and that identity is the first to be granted full access to the empty storage space upon its creation. But in technical terms the IDP and the storage are almost entirely separate. The only two connections between them is that the IDP proves control of a profile URL (web id) that points to a document on the storage space, and that the IDP's authorize dialog will edit the list of trusted apps in that profile whenever the user authorizes a new third-party web app.

The IDP exposes a koa handler to the pod-server. Apart from that, it sends out emails for verifications and password reminders. It also exposes an event when an account is created or deleted, and its dialogs will do xhr edits to trustedApps.

### wac-ldp
The [wac-ldp](https://github.com/inrupt/wac-ldp) module is the central part of the pod-server. It exposes a koa handler, which pod-server consumes.
It also emits change events, which the pod-server used to know when to call the `Hub#publish` method from the websocket-pubsub module (see below).
Apart from that, it exposes a number of interfaces which the websockets-pubsub module consumes:
* a function to check [updates-via tickets](https://github.com/inrupt/websockets-pubsub/issues/2#issuecomment-489319630)
* a function for checking whether a given webId has read access to a given resource

### websockets-pubsub
The [websockets-pubsub](https://github.com/inrupt/websockets-pubsub) module exposes a 'Hub' object, with a websocket-onconnection handler and a publish method

### html statics
Although some pod providers may choose to replace `static/index.html` with the [data-browser](https://github.com/linkeddata/mashlib). This is the content which the pod-server serves when a user visits the pod-server with their browser.

Published under an MIT license by inrupt, Inc.

Contributors:
* Michiel de Jong
* Jackson Morgan
* Ruben Verborgh
* Kjetil Kjernsmo
* Pat McBennett
* Justin Bingham
* Sebastien Dubois
