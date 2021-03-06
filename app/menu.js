/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const electron = require('electron')
const appConfig = require('../js/constants/appConfig')
const Menu = electron.Menu
const messages = require('../js/constants/messages')
const settings = require('../js/constants/settings')
const dialog = electron.dialog
const appActions = require('../js/actions/appActions')
const siteUtil = require('../js/state/siteUtil')
const Filtering = require('./filtering')
const getSetting = require('../js/settings').getSetting
const appStore = require('../js/stores/appStore')
const locale = require('./locale')

const isDarwin = process.platform === 'darwin'

const aboutUrl = 'https://brave.com/'

let menuArgs = {}
let lastSettingsState, lastArgs

const menu = Menu.buildFromTemplate([])
Menu.setApplicationMenu(menu)

/**
 * Sets up the menu.
 * @param {Object} settingsState - Application settings state
 * @param {Object} args - Arguments to initialize the menu with if any
 * @param {boolean} state.bookmarked - Whether the current active page is
 *   bookmarked
 */
const init = (settingsState, args) => {
  // The menu will always be called once localization is done
  // so don't bother loading anything until it is done.
  // Save out menuArgs in the meantime since they shuld persist across calls.
  if (!locale.initialized) {
    menuArgs = Object.assign(menuArgs, args || {})
    return
  }

  // This needs to be within the init method to handle translations
  const CommonMenu = require('../js/commonMenu')

  // Check for uneeded updates.
  // Updating the menu when it is not needed causes the menu to close if expanded
  // and also causes menu clicks to not work.  So we don't want to update it a lot
  // when app state changes, like when there are downloads.
  // Note that settingsState is not used directly below, but getSetting uses it.
  if (settingsState === lastSettingsState && args === lastArgs) {
    return
  }

  lastSettingsState = settingsState
  lastArgs = args

  menuArgs = Object.assign(menuArgs, args || {})
  // Create references to menu items that need to be updated dynamically
  const bookmarkPageMenuItem = {
    label: locale.translation('bookmarkPage'),
    type: 'checkbox',
    accelerator: 'CmdOrCtrl+D',
    checked: menuArgs.bookmarked || false,
    click: function (item, focusedWindow) {
      var msg = bookmarkPageMenuItem.checked
        ? messages.SHORTCUT_ACTIVE_FRAME_REMOVE_BOOKMARK
        : messages.SHORTCUT_ACTIVE_FRAME_BOOKMARK
      CommonMenu.sendToFocusedWindow(focusedWindow, [msg])
    }
  }

  const fileMenu = [
    CommonMenu.newTabMenuItem(),
    CommonMenu.newPrivateTabMenuItem(),
    CommonMenu.newPartitionedTabMenuItem(),
    CommonMenu.newWindowMenuItem(),
    CommonMenu.separatorMenuItem,
    {
      label: locale.translation('openFile'),
      accelerator: 'CmdOrCtrl+O',
      click: (item, focusedWindow) => {
        dialog.showOpenDialog(focusedWindow, {
          properties: ['openFile', 'multiSelections']
        }, (paths) => {
          if (paths) {
            paths.forEach((path) => {
              CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_NEW_FRAME, path])
            })
          }
        })
      }
    }, {
      label: locale.translation('openLocation'),
      accelerator: 'CmdOrCtrl+L',
      click: function (item, focusedWindow) {
        CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_FOCUS_URL])
      }
    },
    CommonMenu.separatorMenuItem,
    /*
    {
      label: locale.translation('importFrom'),
      visible: false
      submenu: [
        {label: 'Google Chrome...'},
        {label: 'Firefox...'},
        {label: 'Safari...'}
      ]
    },
    CommonMenu.separatorMenuItem,
    */
    {
      // this should be disabled when
      // no windows are active
      label: locale.translation('closeTab'),
      accelerator: 'CmdOrCtrl+W',
      click: function (item, focusedWindow) {
        CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_CLOSE_FRAME])
      }
    }, {
      // this should be disabled when
      // no windows are active
      label: locale.translation('closeWindow'),
      accelerator: 'CmdOrCtrl+Shift+W',
      click: function (item, focusedWindow) {
        if (focusedWindow) {
          appActions.closeWindow(focusedWindow.id)
        }
      }
    },
    CommonMenu.separatorMenuItem,
    {
      label: locale.translation('savePageAs'),
      accelerator: 'CmdOrCtrl+S',
      click: function (item, focusedWindow) {
        CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_SAVE])
      }
    }, {
      label: locale.translation('share'),
      visible: false
      /*
      submenu: [
        {label: 'Email Page Link...'},
        CommonMenu.separatorMenuItem,
        {label: 'Tweet Page...'},
        {label: 'Share on Facebook...'},
        {label: 'More...'}
      ]
      */
    },
    CommonMenu.separatorMenuItem,
    CommonMenu.printMenuItem()
  ]

  const helpMenu = [
    CommonMenu.reportAnIssueMenuItem(),
    CommonMenu.separatorMenuItem,
    CommonMenu.submitFeedbackMenuItem(),
    {
      label: locale.translation('spreadTheWord'),
      click: function (item, focusedWindow) {
        CommonMenu.sendToFocusedWindow(focusedWindow,
                            [messages.SHORTCUT_NEW_FRAME, aboutUrl])
      }
    }
  ]

  if (!isDarwin) {
    fileMenu.push(CommonMenu.separatorMenuItem)
    fileMenu.push(CommonMenu.quitMenuItem())
    helpMenu.push(CommonMenu.separatorMenuItem)
    helpMenu.push(CommonMenu.checkForUpdateMenuItem())
    helpMenu.push(CommonMenu.separatorMenuItem)
    helpMenu.push(CommonMenu.aboutBraveMenuItem())
  }

  const editSubmenu = [{
    label: locale.translation('undo'),
    accelerator: 'CmdOrCtrl+Z',
    role: 'undo'
  }, {
    label: locale.translation('redo'),
    accelerator: 'Shift+CmdOrCtrl+Z',
    role: 'redo'
  },
    CommonMenu.separatorMenuItem,
    {
      label: locale.translation('cut'),
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    }, {
      label: locale.translation('copy'),
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    }, {
      label: locale.translation('paste'),
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    }, {
      label: locale.translation('pasteWithoutFormatting'),
      accelerator: 'Shift+CmdOrCtrl+V',
      click: function (item, focusedWindow) {
        focusedWindow.webContents.pasteAndMatchStyle()
      }
    },
    CommonMenu.separatorMenuItem,
    {
      label: locale.translation('delete'),
      accelerator: 'Delete',
      click: function (item, focusedWindow) {
        focusedWindow.webContents.delete()
      }
    }, {
      label: locale.translation('selectAll'),
      accelerator: 'CmdOrCtrl+A',
      role: 'selectall'
    },
    CommonMenu.separatorMenuItem,
    CommonMenu.findOnPageMenuItem(),
    {
      label: locale.translation('findNext'),
      visible: false,
      accelerator: 'CmdOrCtrl+G'
    }, {
      label: locale.translation('findPrevious'),
      visible: false,
      accelerator: 'Shift+CmdOrCtrl+G'
    },
    CommonMenu.separatorMenuItem
    // OSX inserts "start dictation" and "emoji and symbols" automatically
  ]

  if (!isDarwin) {
    editSubmenu.push(CommonMenu.preferencesMenuItem())
  }

  var template = [
    {
      label: locale.translation('file'),
      submenu: fileMenu
    }, {
      label: locale.translation('edit'),
      submenu: editSubmenu
    }, {
      label: locale.translation('view'),
      submenu: [
        {
          label: locale.translation('actualSize'),
          accelerator: 'CmdOrCtrl+0',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_ZOOM_RESET])
          }
        }, {
          label: locale.translation('zoomIn'),
          accelerator: 'CmdOrCtrl+=',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_ZOOM_IN])
          }
        }, {
          label: locale.translation('zoomOut'),
          accelerator: 'CmdOrCtrl+-',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_ZOOM_OUT])
          }
        },
        CommonMenu.separatorMenuItem,
        /*
        {
          label: locale.translation('toolbars'),
          visible: false
          submenu: [
            {label: 'Favorites Bar', accelerator: 'Alt+CmdOrCtrl+B'},
            {label: 'Tab Bar'},
            {label: 'Address Bar', accelerator: 'Alt+CmdOrCtrl+A'},
            {label: 'Tab Previews', accelerator: 'Alt+CmdOrCtrl+P'}
          ]
        },
        CommonMenu.separatorMenuItem,
        */
        {
          label: locale.translation('stop'),
          accelerator: isDarwin ? 'Cmd+.' : 'Esc',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_STOP])
          }
        }, {
          label: locale.translation('reloadPage'),
          accelerator: 'CmdOrCtrl+R',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_RELOAD])
          }
        }, {
          label: locale.translation('cleanReload'),
          accelerator: 'CmdOrCtrl+Shift+R',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_CLEAN_RELOAD])
          }
        },
        CommonMenu.separatorMenuItem,
        /*
        {
          label: locale.translation('readingView'),
          visible: false,
          accelerator: 'Alt+CmdOrCtrl+R'
        }, {
          label: locale.translation('tabManager'),
          visible: false,
          accelerator: 'Alt+CmdOrCtrl+M'
        },
        CommonMenu.separatorMenuItem,
        {
          label: locale.translation('textEncoding'),
          visible: false
          submenu: [
            {label: 'Autodetect', submenu: []},
            CommonMenu.separatorMenuItem,
            {label: 'Unicode'},
            {label: 'Western'},
            CommonMenu.separatorMenuItem,
            {label: 'etc...'}
          ]
        },
        CommonMenu.separatorMenuItem,
        */
        {
          label: locale.translation('toggleDeveloperTools'),
          accelerator: isDarwin ? 'Cmd+Alt+I' : 'Ctrl+Shift+I',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_TOGGLE_DEV_TOOLS])
          }
        }, {
          label: locale.translation('toggleBrowserConsole'),
          accelerator: 'CmdOrCtrl+Alt+J',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.toggleDevTools()
            }
          }
        },
        CommonMenu.separatorMenuItem,
        {
          label: locale.translation('toggleFullScreenView'),
          accelerator: isDarwin ? 'Ctrl+Cmd+F' : 'F11',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              // This doesn't seem to work but also doesn't throw errors...
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
            }
          }
        }
      ]
    }, {
      label: locale.translation('history'),
      submenu: [
        {
          label: locale.translation('home'),
          accelerator: 'CmdOrCtrl+Shift+H',
          click: function (item, focusedWindow) {
            getSetting(settings.HOMEPAGE).split('|').forEach((homepage, i) => {
              CommonMenu.sendToFocusedWindow(focusedWindow,
                  [i === 0 ? messages.SHORTCUT_ACTIVE_FRAME_LOAD_URL : messages.SHORTCUT_NEW_FRAME, homepage])
            })
          }
        }, {
          label: locale.translation('back'),
          accelerator: 'CmdOrCtrl+[',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_BACK])
          }
        }, {
          label: locale.translation('forward'),
          accelerator: 'CmdOrCtrl+]',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_ACTIVE_FRAME_FORWARD])
          }
        },
        CommonMenu.separatorMenuItem,
        CommonMenu.reopenLastClosedTabItem(),
        {
          label: locale.translation('reopenLastClosedWindow'),
          accelerator: 'Alt+Shift+CmdOrCtrl+T',
          click: function () {
            process.emit(messages.UNDO_CLOSED_WINDOW)
          }
        },
        CommonMenu.separatorMenuItem,
        /*
        {
          label: locale.translation('showAllHistory'),
          accelerator: 'CmdOrCtrl+Y',
          visible: false
        },
        CommonMenu.separatorMenuItem,
        */
        {
          label: locale.translation('clearHistory'),
          accelerator: 'Shift+CmdOrCtrl+Delete',
          enabled: siteUtil.hasNoTagSites(appStore.getState().get('sites')),
          click: function (item, focusedWindow) {
            appActions.clearSitesWithoutTags(appStore.getState().get('sites'))
          }
        }, {
          label: locale.translation('clearCache'),
          click: function () {
            Filtering.clearCache()
          }
        }, {
          label: locale.translation('clearSiteData'),
          click: function () {
            Filtering.clearStorageData()
            Filtering.clearCache()
          }
        }
      ]
    }, {
      label: locale.translation('bookmarks'),
      submenu: [
        bookmarkPageMenuItem,
        {
          label: locale.translation('addToFavoritesBar'),
          visible: false,
          accelerator: 'Shift+CmdOrCtrl+D'
        },
        CommonMenu.separatorMenuItem,
        CommonMenu.bookmarksMenuItem(),
        CommonMenu.bookmarksToolbarMenuItem(),
        CommonMenu.separatorMenuItem,
        CommonMenu.importBookmarksMenuItem()
      ]
    }, {
      label: locale.translation('window'),
      role: 'window',
      submenu: [
        {
          label: locale.translation('minimize'),
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
          // "Minimize all" added automatically
        }, {
          label: locale.translation('zoom'),
          visible: false
        },
        CommonMenu.separatorMenuItem,
        {
          label: locale.translation('selectNextTab'),
          accelerator: 'Ctrl+Tab',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_NEXT_TAB])
          }
        }, {
          label: locale.translation('selectPreviousTab'),
          accelerator: 'Ctrl+Shift+Tab',
          click: function (item, focusedWindow) {
            CommonMenu.sendToFocusedWindow(focusedWindow, [messages.SHORTCUT_PREV_TAB])
          }
        }, {
          label: locale.translation('moveTabToNewWindow'),
          visible: false
        }, {
          label: locale.translation('mergeAllWindows'),
          visible: false
        },
        CommonMenu.separatorMenuItem,
        CommonMenu.bookmarksMenuItem(),
        CommonMenu.downloadsMenuItem(),
        CommonMenu.passwordsMenuItem(),
        {
          label: locale.translation('history'),
          accelerator: 'CmdOrCtrl+Y',
          visible: false
        },
        CommonMenu.separatorMenuItem,
        {
          label: locale.translation('bringAllToFront'),
          role: 'front'
        }
      ]
    }, {
      label: locale.translation('help'),
      role: 'help',
      submenu: helpMenu
    }
  ]

  if (process.env.NODE_ENV === 'development') {
    template.push({
      label: 'Debug',
      submenu: [
        {
          // Makes future renderer processes pause when they are created until a debugger appears.
          // The console will print a message like: [84790:0710/201431:ERROR:child_process.cc(136)] Renderer (84790) paused waiting for debugger to attach. Send SIGUSR1 to unpause.
          // And this means you should attach Xcode or whatever your debugger is to PID 84790 to unpause.
          // To debug all renderer processes then add the appendSwitch call to app/index.js
          label: 'append wait renderer switch',
          click: function () {
            electron.app.commandLine.appendSwitch('renderer-startup-dialog')
          }
        }, {
          label: 'Crash main process',
          click: function () {
            process.crash()
          }
        }, {
          label: 'Relaunch',
          accelerator: 'Command+Alt+R',
          click: function () {
            electron.app.relaunch({args: process.argv.slice(1) + ['--relaunch']})
            process.exit(0)
          }
        }
      ]
    })
  }

  if (isDarwin) {
    template.unshift({
      label: appConfig.name, // Ignored on OSX, which gets this from the app Info.plist file.
      submenu: [
        CommonMenu.aboutBraveMenuItem(),
        CommonMenu.separatorMenuItem,
        CommonMenu.checkForUpdateMenuItem(),
        CommonMenu.separatorMenuItem,
        CommonMenu.preferencesMenuItem(),
        CommonMenu.separatorMenuItem,
        {
          label: locale.translation('sendUsFeedback'),
          click: function () {
            electron.shell.openExternal(appConfig.contactUrl)
          }
        },
        CommonMenu.separatorMenuItem,
        {
          label: locale.translation('services'),
          role: 'services'
        },
        CommonMenu.separatorMenuItem,
        {
          label: `Hide ${appConfig.name}`,
          accelerator: 'Command+H',
          role: 'hide'
        }, {
          label: locale.translation('hideOthers'),
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        }, {
          label: locale.translation('showAll'),
          role: 'unhide'
        },
        CommonMenu.separatorMenuItem,
        CommonMenu.quitMenuItem()
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

module.exports.init = init
