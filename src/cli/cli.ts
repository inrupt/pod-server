#!/usr/bin/env node

import program from 'commander'
import fs from 'mz/fs'
import path from 'path'
import assert from 'assert'
import { JWKS } from '@panva/jose'
import { PodServerConfiguration, IPSIDPConfiguration } from '../types/configuration.types';
import defaultConfiguration from '../podServer/podServerConfigurations/defaultConfiguration';
import PodServer from '../podServer/PodServer';
import IPSIDP from '../identityProvider/ipsIDP/ipsIDP';

/**
 * pod-server init
 */
async function initializeConfig(destination: string, config: any) {
  try {
    const filePath = path.join(process.cwd(), destination)
    assert(!await fs.exists(filePath), `${filePath} already exists.`)

    await fs.writeFile(path.join(process.cwd(), destination), JSON.stringify(config, null, 2))
    console.log(`Initialized at ${filePath}`)
  } catch (err) {
    console.error(err.message)
  }
}

program.command('init [destination]')
  .description('Initialize a configuration for the solid server')
  .action(async (destination: string = './config.json') => {
    // TODO: Make this customizable - Jackson
    await initializeConfig(destination, defaultConfiguration)
  })

program.command('init-idp [destination]')
  .description('Initialize a configuration for the solid server')
  .action(async (destination: string = './config.idp.json') => {
    // TODO: Make this customizable - Jackson
    await initializeConfig(destination, {
      ...defaultConfiguration.additionalRoutes.options,
      network: {
        hostname: 'localhost',
        port: 8081,
        protocol: 'http'
      }
    })
  })

program.command('init-keystore [destination]')
  .description('Initialize the keystore for the identity provider')
  .action(async (destination: string = './keystore.json') => {
    const keystore = new JWKS.KeyStore()
    keystore.generateSync('RSA', 2048, {
      alg: 'RS256',
      use: 'sig',
    })
    await initializeConfig(destination, keystore.toJWKS(true))
  })

/**
 * pod-server start
 */
program.command('start [configDestination]')
  .description('Start the solid server.')
  .action(async (configDestination: string = './config.json') => {
    try {
      const configPath = path.join(process.cwd(), configDestination)
      const config: PodServerConfiguration = JSON.parse((await fs.readFile(configPath)).toString())
      const server = new PodServer(config, configPath)
      server.listen()
    } catch(err) {
      console.error(err.message)
    }
  })

/**
 * idp start
 */
program.command('idp [configDestination]')
  .description('Start just the identity provider.')
  .action(async (configDestination: string = './config.idp.json') => {
    try {
      const configPath = path.join(process.cwd(), configDestination)
      const config: IPSIDPConfiguration = JSON.parse((await fs.readFile(configPath)).toString())
      const server = new IPSIDP(config, configPath)
      server.listen()
    } catch(err) {
      console.error(err.message)
    }
  })

program.parse(process.argv);
