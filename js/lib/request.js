/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain
const messages = require('../constants/messages')

const getWebContents = () => {
  try {
    return BrowserWindow.getAllWindows()[0].webContents
  } catch (e) {
    return null
  }
}

var nonce = 0

/**
 * Sends a network request using Chromium's networks stack instead of Node's.
 * Depends on there being a loaded browser window available.
 * @param {string|object} options - the url to load (if a string)
 * @param {function} callback - callback to call with the response metadata and
 *   body
 */

// NB: the call to webContents.send never results in a call to the listener ../components/main.js [MTR]
const http = require('http')
const https = require('https')
const url = require('url')

module.exports.request = (options, callback) => {
  var client, parts

  if (typeof options === 'string') options = { url: options }
  parts = url.parse(options.url)
  parts.method = 'GET'

  client = parts.protocol === 'https:' ? https : http
  client.request(parts, (response) => {
    var chunks = []
    var responseType = options.responseType || 'text'

    response.on('data', (chunk) => {
      if (!Buffer.isBuffer(chunk)) chunk = new Buffer(chunk, responseType !== 'text' ? 'binary' : 'utf8')

      chunks.push(chunk)
    }).on('end', () => {
      var rsp = { statusCode: response.statusCode, headers: response.headers }

      var done = (err, result) => { callback(err, rsp, result) }

      var f = {
        arraybuffer: () => { done(null, Buffer.concat(chunks)) },

        blob: () => {
          done(null, 'data:' + rsp.headers['content-type'] + ';base64,' + Buffer.concat(chunks).toString('base64'))
        },

        text: () => { done(null, Buffer.concat(chunks).toString('utf8')) }
      }[responseType] || (() => { done(null, Buffer.concat(chunks).toString('binary')) })

      try { f() } catch (ex) { done(ex) }
    }).setEncoding('binary')
  }).on('error', (err) => {
    callback(err)
  }).end()

/*
// TBD: see note above [MTR]

  const webContents = getWebContents()

  if (!webContents) {
    callback(new Error('Request failed, no webContents available'))
  } else {
    // Send a message to the main webcontents to make an XHR to the URL
    nonce++
    try {
      ipcMain.once(messages.GOT_XHR_RESPONSE + nonce, (wnd, err, response, body) => {
        callback(err, response, body)
      })

      if (typeof options === 'string') options = { url: options }
      webContents.send(messages.SEND_XHR_REQUEST, options.url, nonce, null, options.responseType)
    } catch (ex) {
      callback(ex)
    }
  }
 */
}

module.exports.requestDataFile = (url, headers, path, reject, resolve) => {
  const webContents = getWebContents()
  if (!webContents) {
    reject('Request failed, no webContents available')
  } else {
    // Send a message to the main webcontents to make an XHR to the URL
    nonce++
    webContents.send(messages.DOWNLOAD_DATAFILE, url, nonce, headers, path)
    ipcMain.once(messages.DOWNLOAD_DATAFILE_DONE + nonce, (wnd, response, error) => {
      if (response.statusCode === 200) {
        resolve(response.etag)
      } else if (response.statusCode && response.statusCode !== 200) {
        reject(`Got HTTP status code ${response.statusCode}`)
      } else {
        reject('Got error fetching datafile: ' + error)
      }
    })
  }
}
