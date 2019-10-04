#!/usr/bin/env node

import program from 'commander'
import fs from 'mz/fs'
import path from 'path'
import assert from 'assert'
import { PodServerConfiguration } from '../types/configuration.types';
import defaultConfiguration from '../podServer/podServerConfigurations/defaultConfiguration';
import PodServer from '../podServer/podServer';

/**
 * pod-server init
 */
program.command('init [destination]')
  .description('Initialize a configuration for the solid server')
  .action(async (destination: string = './config.json') => {
    // TODO: Make this customizable
    try {
      const filePath = path.join(process.cwd(), destination)
      assert(!await fs.exists(filePath), `${filePath} already exists.`)

      await fs.writeFile(path.join(process.cwd(), destination), JSON.stringify(defaultConfiguration, null, 2))
    } catch (err) {
      console.error(err.message)
    }
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
  .action(async (configDestination: string) => {
    try {
      const configPath = path.join(process.cwd(), configDestination)
      const config: PodServerConfiguration = JSON.parse((await fs.readFile(configPath)).toString())
      const server = new PodServer(config, configPath)
      server.listen()
    } catch(err) {
      console.error(err.message)
    }
  })

program.parse(process.argv);
