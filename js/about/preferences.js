/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Note that these are webpack requires, not CommonJS node requiring requires
const React = require('react')
const ImmutableComponent = require('../components/immutableComponent')
const Immutable = require('immutable')
const SwitchControl = require('../components/switchControl')
const ModalOverlay = require('../components/modalOverlay')
const cx = require('../lib/classSet.js')
const { getZoomValuePercentage } = require('../lib/zoom')
const config = require('../constants/config')
const appConfig = require('../constants/appConfig')
const preferenceTabs = require('../constants/preferenceTabs')
const messages = require('../constants/messages')
const settings = require('../constants/settings')
const aboutActions = require('./aboutActions')
const getSetting = require('../settings').getSetting
const tableSort = require('tablesort')
const pad = require('underscore.string/pad')

const adblock = appConfig.resourceNames.ADBLOCK
const cookieblock = appConfig.resourceNames.COOKIEBLOCK
const adInsertion = appConfig.resourceNames.AD_INSERTION
const trackingProtection = appConfig.resourceNames.TRACKING_PROTECTION
const httpsEverywhere = appConfig.resourceNames.HTTPS_EVERYWHERE
const safeBrowsing = appConfig.resourceNames.SAFE_BROWSING
const noScript = appConfig.resourceNames.NOSCRIPT
const flash = appConfig.resourceNames.FLASH

const isDarwin = navigator.platform === 'MacIntel'
const isWindows = navigator.platform && navigator.platform.includes('Win')
// const lang = navigator.language.split('-')[0].split('_')[0] || 'en'

// TODO: Determine this from the l20n file automatically
const hintCount = 3

// Stylesheets

require('../../less/switchControls.less')
require('../../less/about/preferences.less')
require('../../node_modules/font-awesome/css/font-awesome.css')

const permissionNames = {
  'mediaPermission': 'boolean',
  'geolocationPermission': 'boolean',
  'notificationsPermission': 'boolean',
  'midiSysexPermission': 'boolean',
  'pointerLockPermission': 'boolean',
  'fullscreenPermission': 'boolean',
  'openExternalPermission': 'boolean',
  'protocolRegistrationPermission': 'boolean',
  'flash': 'number'
}

const changeSetting = (cb, key, e) => {
  if (e.target.type === 'checkbox') {
    cb(key, e.target.checked)
  } else {
    let value = e.target.value
    if (e.target.dataset && e.target.dataset.type === 'number') {
      value = parseInt(value, 10)
    } else if (e.target.dataset && e.target.dataset.type === 'float') {
      value = parseFloat(value)
    }
    if (e.target.type === 'number') {
      value = value.replace(/\D/g, '')
      value = parseInt(value, 10)
      if (Number.isNaN(value)) {
        return
      }
      value = Math.min(e.target.getAttribute('max'), Math.max(value, e.target.getAttribute('min')))
    }
    cb(key, value)
  }
}

class SettingsList extends ImmutableComponent {
  render () {
    return <div>
      {
        this.props.dataL10nId
        ? <div className='settingsListTitle' data-l10n-id={this.props.dataL10nId} />
        : null
      }
      <div className='settingsList'>
        {this.props.children}
      </div>
    </div>
  }
}

class SettingItem extends ImmutableComponent {
  render () {
    return <div className='settingItem'>
      <span data-l10n-id={this.props.dataL10nId} />
      {this.props.children}
    </div>
  }
}

class SettingCheckbox extends ImmutableComponent {
  render () {
    return <div style={this.props.style} className='settingItem'>
      <SwitchControl id={this.props.prefKey}
        disabled={this.props.disabled}
        onClick={this.props.onChange ? this.props.onChange : changeSetting.bind(null, this.props.onChangeSetting, this.props.prefKey)}
        checkedOn={this.props.checked !== undefined ? this.props.checked : getSetting(this.props.prefKey, this.props.settings)} />
      <label data-l10n-id={this.props.dataL10nId} htmlFor={this.props.prefKey} />
      {this.props.options}
    </div>
  }
}

class LedgerTableRow extends ImmutableComponent {
  getFormattedTime () {
    var d = this.props.daysSpent
    var h = this.props.hoursSpent
    var m = this.props.minutesSpent
    var s = this.props.secondsSpent
    if (d << 0 > 364) {
      return '>1y'
    }
    d = (d << 0 === 0) ? '' : (d + 'd ')
    h = (h << 0 === 0) ? '' : (h + 'h ')
    m = (m << 0 === 0) ? '' : (m + 'm ')
    s = (s << 0 === 0) ? '' : (s + 's ')
    return (d + h + m + s + '')
  }
  padLeft (v) { return pad(v, 12, '0') }
  render () {
    var faviconURL = this.props.faviconURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA0xpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MUNFNTM2NTcxQzQyMTFFNjhEODk5OTY1MzJCOUU0QjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MUNFNTM2NTYxQzQyMTFFNjhEODk5OTY1MzJCOUU0QjEiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjUxZDUzZDBmLTYzOWMtMTE3OS04Yjk3LTg3Y2M5YTUyOWRmMSIgc3RSZWY6ZG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjUxZDUzZDBmLTYzOWMtMTE3OS04Yjk3LTg3Y2M5YTUyOWRmMSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmF3+n4AAAAoSURBVHja7M1BAQAABAQw9O98SvDbCqyT1KepZwKBQCAQCAQ3VoABAAu6Ay00hnjWAAAAAElFTkSuQmCC'

    return <tr>
      <td data-sort={this.padLeft(this.props.rank)}>{this.props.rank}</td>
      <td><a href={this.props.publisherURL}><img src={faviconURL} alt={this.props.site} /><span>{this.props.site}</span></a></td>
      <td data-sort={this.padLeft(this.props.views)}>{this.props.views}</td>
      <td data-sort={this.padLeft(this.props.duration)}>{this.getFormattedTime()}</td>
      <td className='notImplemented'><input type='range' name='points' min='0' max='10'></input></td>
      <td data-sort={this.padLeft(this.props.percentage)}>{this.props.percentage}</td>
    </tr>
  }
}

class LedgerTable extends ImmutableComponent {
  componentDidMount (event) {
    return tableSort(document.getElementById('ledgerTable'))
  }
  render () {
    var rows = []
    if (!this.props.data.synopsis) {
      return false
    }
    for (let i = 0; i < this.props.data.synopsis.length; i++) {
      rows[i] = <LedgerTableRow {...this.props.data.synopsis[i]} />
    }
    return <table id='ledgerTable' className='sort'>
      <thead>
        <tr>
          <th className='sort-header' data-l10n-id='rank' />
          <th className='sort-header' data-l10n-id='publisher' />
          <th className='sort-header' data-l10n-id='views' />
          <th className='sort-header' data-l10n-id='timeSpent' />
          <th className='sort-header notImplemented' data-l10n-id='adjustment' />
          <th className='sort-header'>&#37;</th>
        </tr>
      </thead>
      <tbody>
        {rows}
      </tbody>
    </table>
  }
}

class BitcoinDashboard extends ImmutableComponent {
  shouldComponentUpdate () { return true }
  componentWillMount () {
    this.setState({ shouldShowOverlay: false })
  }
  getOverlayContent () {
    return <iframe src={this.props.buyURL} />
  }
  copyToClipboard (text) {
    console.log('Bitcoin Address: ' + text)
    document.execCommand('copy')
  }
  goToURL (url) {
    return window.open(url, '_blank')
  }
  hideOverlay (event) {
    if (event.type === 'message' && (!event.data || !event.data.event || event.data.event !== 'modal_closed')) {
      return false
    }
    this.setState({ shouldShowOverlay: false })
  }
  showOverlay (event) {
    this.setState({ shouldShowOverlay: true })
  }
  render () {
    var emptyDialog = true
    window.addEventListener('message', this.hideOverlay.bind(this), false)
// if someone can figure out how to get a localized title attribute (bitcoinCopyAddress) here, please do so!
    return <div id='bitcoinDashboard'>
      <ModalOverlay title={'bitcoinBuy'} content={this.getOverlayContent()} emptyDialog={emptyDialog} shouldShow={this.state.shouldShowOverlay} onShow={this.showOverlay.bind(this)} onHide={this.hideOverlay.bind(this)} />
      <div>{this.props.statusText}</div>
      <div className='board'>
        <div className='panel'>
          <div className='settingsListTitle' data-l10n-id='bitcoinAdd' />
          <a href={this.props.paymentURL} target='_blank'>
            <img src={this.props.paymentIMG} alt={'Add Bitcoin'} />
          </a>
          <div className='settingsListCopy alt'><span className='settingsListCopy' onClick={this.copyToClipboard.bind(this, this.props.address || 'Not available')} title={'Copy Bitcoin address to clipboard'}>{this.props.address}</span></div>
          <button data-l10n-id='bitcoinVisitAccount' onClick={this.goToURL.bind(this, this.props.paymentURL)} />
        </div>
        <div className='panel'>
          <div className='settingsListTitle' data-l10n-id='moneyAdd' />
          <div id='coinbaseLogo' />
          <button data-l10n-id='add' onClick={this.showOverlay.bind(this)} />
        </div>
      </div>
    </div>
  }
}

class GeneralTab extends ImmutableComponent {
  render () {
    var languageOptions = this.props.languageCodes.map(function (lc) {
      return (
        <option data-l10n-id={lc} value={lc} />
      )
    })
    const defaultLanguage = this.props.languageCodes.find((lang) => lang.includes(navigator.language)) || 'en-US'
    return <SettingsList>
      <SettingsList>
        <SettingItem dataL10nId='selectedLanguage'>
          <select value={getSetting(settings.LANGUAGE, this.props.settings) || defaultLanguage}
            onChange={changeSetting.bind(null, this.props.onChangeSetting, settings.LANGUAGE)} >
            {languageOptions}
          </select>
        </SettingItem>
        <SettingItem dataL10nId='startsWith'>
          <select value={getSetting(settings.STARTUP_MODE, this.props.settings)}
            onChange={changeSetting.bind(null, this.props.onChangeSetting, settings.STARTUP_MODE)} >
            <option data-l10n-id='startsWithOptionLastTime' value='lastTime' />
            <option data-l10n-id='startsWithOptionHomePage' value='homePage' />
            <option data-l10n-id='startsWithOptionNewTabPage' value='newTabPage' />
          </select>
        </SettingItem>
        <SettingItem dataL10nId='myHomepage'>
          <input spellCheck='false'
            data-l10n-id='homepageInput'
            value={getSetting(settings.HOMEPAGE, this.props.settings)}
            onChange={changeSetting.bind(null, this.props.onChangeSetting, settings.HOMEPAGE)} />
        </SettingItem>
      </SettingsList>
      <SettingsList dataL10nId='bookmarkToolbarSettings'>
        <SettingCheckbox dataL10nId='bookmarkToolbar' prefKey={settings.SHOW_BOOKMARKS_TOOLBAR} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        <SettingCheckbox dataL10nId='bookmarkToolbarShowFavicon' prefKey={settings.SHOW_BOOKMARKS_TOOLBAR_FAVICON} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        <SettingCheckbox dataL10nId='bookmarkToolbarShowOnlyFavicon' style={{ visibility: (getSetting(settings.SHOW_BOOKMARKS_TOOLBAR_FAVICON, this.props.settings) === true ? 'visible' : 'hidden') }} prefKey={settings.SHOW_BOOKMARKS_TOOLBAR_ONLY_FAVICON} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      </SettingsList>
      <SettingsList dataL10nId='appearanceSettings'>
        <SettingCheckbox dataL10nId='showHomeButton' prefKey={settings.SHOW_HOME_BUTTON} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        {
          isDarwin ? null : <SettingCheckbox dataL10nId='autoHideMenuBar' prefKey={settings.AUTO_HIDE_MENU} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        }
        <SettingCheckbox dataL10nId='disableTitleMode' prefKey={settings.DISABLE_TITLE_MODE} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      </SettingsList>
    </SettingsList>
  }
}

class SearchTab extends ImmutableComponent {
  render () {
    return <div>
      <SettingsList>
        <SettingItem dataL10nId='defaultSearchEngine'>
          <select value={getSetting(settings.DEFAULT_SEARCH_ENGINE, this.props.settings)}
            onChange={changeSetting.bind(null, this.props.onChangeSetting, settings.DEFAULT_SEARCH_ENGINE)}>
            <option value='content/search/google.xml'>Google</option>
            <option value='content/search/duckduckgo.xml'>DuckDuckGo</option>
          </select>
        </SettingItem>
      </SettingsList>
      <SettingsList dataL10nId='suggestionTypes'>
        <SettingCheckbox dataL10nId='history' prefKey={settings.HISTORY_SUGGESTIONS} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        <SettingCheckbox dataL10nId='bookmarks' prefKey={settings.BOOKMARK_SUGGESTIONS} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        <SettingCheckbox dataL10nId='openedTabs' prefKey={settings.OPENED_TAB_SUGGESTIONS} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        <SettingCheckbox dataL10nId='offerSearchSuggestions' prefKey={settings.OFFER_SEARCH_SUGGESTIONS} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      </SettingsList>
    </div>
  }
}

class TabsTab extends ImmutableComponent {
  render () {
    return <SettingsList>
      <SettingItem dataL10nId='tabsPerTabPage'>
        <select
          value={getSetting(settings.TABS_PER_PAGE, this.props.settings)}
          data-type='number'
          onChange={changeSetting.bind(null, this.props.onChangeSetting, settings.TABS_PER_PAGE)}>
          {
            // Sorry, Brad says he hates primes :'(
            [6, 8, 10, 20].map((x) =>
              <option value={x} key={x}>{x}</option>)
          }
        </select>
      </SettingItem>
      <SettingCheckbox dataL10nId='switchToNewTabs' prefKey={settings.SWITCH_TO_NEW_TABS} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      <SettingCheckbox dataL10nId='paintTabs' prefKey={settings.PAINT_TABS} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      <SettingCheckbox dataL10nId='showTabPreviews' prefKey={settings.SHOW_TAB_PREVIEWS} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
    </SettingsList>
  }
}

class SecurityTab extends ImmutableComponent {
  onToggleFlash (e) {
    aboutActions.setResourceEnabled(flash, e.target.checked)
  }
  render () {
    return <div>
      <SettingsList dataL10nId='passwordSettings'>
        <SettingCheckbox dataL10nId='usePasswordManager' prefKey={settings.PASSWORD_MANAGER_ENABLED} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting}
          options={
            getSetting(settings.PASSWORD_MANAGER_ENABLED, this.props.settings)
              ? <span className='linkText' data-l10n-id='managePasswords'
                onClick={aboutActions.newFrame.bind(null, {
                  location: 'about:passwords'
                }, true)}></span>
              : null
          } />
        <SettingCheckbox dataL10nId='useOnePassword' prefKey={settings.ONE_PASSWORD_ENABLED} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        <SettingCheckbox dataL10nId='useLastPass' prefKey={settings.LAST_PASS_ENABLED} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting}
          options={
            getSetting(settings.LAST_PASS_ENABLED, this.props.settings)
              ? <span className='linkText' data-l10n-id='preferences'
                onClick={aboutActions.newFrame.bind(null, {
                  location: 'chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/tabDialog.html?dialog=preferences&cmd=open'
                }, true)}></span>
              : null
          } />
        <SettingCheckbox dataL10nId='useDashlane' prefKey={settings.DASHLANE_ENABLED} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      </SettingsList>
      <SettingsList dataL10nId='pluginSettings'>
        <SettingCheckbox checked={this.props.flashInstalled ? this.props.braveryDefaults.get('flash') : false} dataL10nId='enableFlash' onChange={this.onToggleFlash} disabled={!this.props.flashInstalled} />
      </SettingsList>
      <div className='subtext'>
        <span className='fa fa-info-circle' id='flashInfoIcon' />
        {
          isDarwin || isWindows
            ? <span><span data-l10n-id='enableFlashSubtext' />
              <span className='linkText'onClick={aboutActions.newFrame.bind(null, {
                location: 'https://get.adobe.com/flashplayer'
              })}>{'Adobe'}</span>.</span>
            : <span data-l10n-id='enableFlashSubtextLinux' />
        }
      </div>
      <SitePermissionsPage siteSettings={this.props.siteSettings} />
    </div>
  }
}

class ShieldsTab extends ImmutableComponent {
  constructor () {
    super()
    this.onChangeAdControl = this.onChangeAdControl.bind(this)
    this.onToggleHTTPSE = this.onToggleSetting.bind(this, httpsEverywhere)
    this.onToggleSafeBrowsing = this.onToggleSetting.bind(this, safeBrowsing)
    this.onToggleNoScript = this.onToggleSetting.bind(this, noScript)
  }
  onChangeAdControl (e) {
    if (e.target.value === 'showBraveAds') {
      aboutActions.setResourceEnabled(adblock, true)
      aboutActions.setResourceEnabled(trackingProtection, true)
      aboutActions.setResourceEnabled(adInsertion, true)
    } else if (e.target.value === 'blockAds') {
      aboutActions.setResourceEnabled(adblock, true)
      aboutActions.setResourceEnabled(trackingProtection, true)
      aboutActions.setResourceEnabled(adInsertion, false)
    } else {
      aboutActions.setResourceEnabled(adblock, false)
      aboutActions.setResourceEnabled(trackingProtection, false)
      aboutActions.setResourceEnabled(adInsertion, false)
    }
  }
  onChangeCookieControl (e) {
    aboutActions.setResourceEnabled(cookieblock, e.target.value === 'block3rdPartyCookie')
  }
  onToggleSetting (setting, e) {
    aboutActions.setResourceEnabled(setting, e.target.checked)
  }
  render () {
    return <div id='shieldsContainer'>
      <SettingsList dataL10nId='braveryDefaults'>
        <SettingItem dataL10nId='adControl'>
          <select value={this.props.braveryDefaults.get('adControl')} onChange={this.onChangeAdControl}>
            <option data-l10n-id='showBraveAds' value='showBraveAds' />
            <option data-l10n-id='blockAds' value='blockAds' />
            <option data-l10n-id='allowAdsAndTracking' value='allowAdsAndTracking' />
          </select>
        </SettingItem>
        <SettingItem dataL10nId='cookieControl'>
          <select value={this.props.braveryDefaults.get('cookieControl')} onChange={this.onChangeCookieControl}>
            <option data-l10n-id='block3rdPartyCookie' value='block3rdPartyCookie' />
            <option data-l10n-id='allowAllCookies' value='allowAllCookies' />
          </select>
        </SettingItem>
        <SettingCheckbox checked={this.props.braveryDefaults.get('httpsEverywhere')} dataL10nId='httpsEverywhere' onChange={this.onToggleHTTPSE} />
        <SettingCheckbox checked={this.props.braveryDefaults.get('safeBrowsing')} dataL10nId='safeBrowsing' onChange={this.onToggleSafeBrowsing} />
        <SettingCheckbox checked={this.props.braveryDefaults.get('noScript')} dataL10nId='noScript' onChange={this.onToggleNoScript} />
        <SettingCheckbox dataL10nId='blockCanvasFingerprinting' prefKey={settings.BLOCK_CANVAS_FINGERPRINTING} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      </SettingsList>
      <SettingsList dataL10nId='advancedPrivacySettings'>
        <SettingCheckbox dataL10nId='doNotTrack' prefKey={settings.DO_NOT_TRACK} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      </SettingsList>
    </div>
  }
}

class PaymentsTab extends ImmutableComponent {
  shouldComponentUpdate () { return true }
  componentWillMount () {
    this.setState({ shouldShowOverlay: false })
  }
  getTableContent () {
    return this.props.data.enabled ? <LedgerTable data={this.props.data} /> : <div className='pull-left' data-l10n-id='tableEmptyText' />
  }
  getButtonContent () {
    return this.props.data.buttonLabel && this.props.data.buttonURL ? <a className='settingsListTitle pull-right' href={this.props.data.buttonURL}>{this.props.data.buttonLabel}</a> : null
  }
  getNotificationContent () {
    return this.props.data.statusText ? <div className='notificationBar'>
      <div className='pull-left'>{this.props.data.statusText}</div>
    </div> : <div className='notificationBar'>
      <div className='pull-left' data-l10n-id='notificationEmptyText' />
    </div>
  }
  getOverlayContent () {
    BitcoinDashboard.defaultProps = this.props.data
    return <BitcoinDashboard />
  }
  getFundingLink () {
    return this.props.data.address ? <div className='settingsListLink pull-right' data-l10n-id='addFundsTitle' value='addFundsTitle' onClick={this.showOverlay.bind(this)} /> : null
  }
  hideOverlay (event) {
    this.setState({ shouldShowOverlay: false })
  }
  showOverlay (event) {
    this.setState({ shouldShowOverlay: true })
  }
  render () {
    return this.props.data.enabled ? <div id='paymentsContainer'>
      <ModalOverlay title={'addFunds'} content={this.getOverlayContent()} shouldShow={this.state.shouldShowOverlay} onShow={this.showOverlay.bind(this)} onHide={this.hideOverlay.bind(this)} />
      <div className='titleBar'>
        <div className='settingsListTitle pull-left' data-l10n-id='publisherPaymentsTitle' value='publisherPaymentsTitle' />
        {this.getButtonContent()}
        {this.getFundingLink()}
      </div>
      {this.getNotificationContent()}
      {this.getTableContent()}
    </div> : <div className='emptyMessage' data-l10n-id='publisherEmptyText' />
  }
}
PaymentsTab.propTypes = { data: React.PropTypes.array.isRequired }
PaymentsTab.defaultProps = { data: [] }

class SyncTab extends ImmutableComponent {
  render () {
    return <div>
      Sync settings coming soon
    </div>
  }
}

class AdvancedTab extends ImmutableComponent {
  render () {
    const defaultZoomSetting = getSetting(settings.DEFAULT_ZOOM_LEVEL, this.props.settings)
    return <div>
      <SettingsList dataL10nId='contentRenderingOptions'>
        <SettingItem dataL10nId='defaultZoomLevel'>
          <select
            value={defaultZoomSetting === undefined || defaultZoomSetting === null ? config.zoom.defaultValue : defaultZoomSetting}
            data-type='float'
            onChange={changeSetting.bind(null, this.props.onChangeSetting, settings.DEFAULT_ZOOM_LEVEL)}>
            {
              config.zoom.zoomLevels.map((x) =>
                <option value={x} key={x}>{getZoomValuePercentage(x) + '%'}</option>)
            }
          </select>
        </SettingItem>
        <SettingCheckbox dataL10nId='useHardwareAcceleration' prefKey={settings.HARDWARE_ACCELERATION_ENABLED} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
        <SettingCheckbox dataL10nId='usePDFJS' prefKey={settings.PDFJS_ENABLED} settings={this.props.settings} onChangeSetting={this.props.onChangeSetting} />
      </SettingsList>
    </div>
  }
}

class HelpfulHints extends ImmutableComponent {
  render () {
    return <div className='helpfulHints'>
      <span className='hintsTitleContainer'>
        <span data-l10n-id='hintsTitle' />
        <span className='hintsRefresh fa fa-refresh'
          onClick={this.props.refreshHint} />
      </span>
      <div data-l10n-id={`hint${this.props.hintNumber}`} />
      <div className='helpfulHintsBottom'>
        <a data-l10n-id='sendUsFeedback' href={appConfig.contactUrl} />
      </div>
    </div>
  }
}

class PreferenceNavigationButton extends ImmutableComponent {
  render () {
    return <div className={cx({
      selected: this.props.selected,
      [this.props.className]: !!this.props.className
    })}>
      <div onClick={this.props.onClick}
        className={cx({
          topBarButton: true,
          fa: true,
          [this.props.icon]: true
        })}>
        <i className={this.props.icon.replace('fa-', 'i-')} />
        <div className='tabMarkerText'
          data-l10n-id={this.props.dataL10nId} />
      </div>
      {
        this.props.selected
        ? <div className='tabMarkerContainer'>
          <div className='tabMarker' />
        </div>
        : null
      }
    </div>
  }
}

class PreferenceNavigation extends ImmutableComponent {
  render () {
    return <div className='prefAside'>
      <div data-l10n-id='prefAsideTitle' />
      <PreferenceNavigationButton icon='fa-list-alt'
        dataL10nId='general'
        onClick={this.props.changeTab.bind(null, preferenceTabs.GENERAL)}
        selected={this.props.preferenceTab === preferenceTabs.GENERAL}
      />
      <PreferenceNavigationButton icon='fa-search'
        dataL10nId='search'
        onClick={this.props.changeTab.bind(null, preferenceTabs.SEARCH)}
        selected={this.props.preferenceTab === preferenceTabs.SEARCH}
      />
      <PreferenceNavigationButton icon='fa-bookmark-o'
        dataL10nId='tabs'
        onClick={this.props.changeTab.bind(null, preferenceTabs.TABS)}
        selected={this.props.preferenceTab === preferenceTabs.TABS}
      />
      <PreferenceNavigationButton icon='fa-lock'
        dataL10nId='security'
        onClick={this.props.changeTab.bind(null, preferenceTabs.SECURITY)}
        selected={this.props.preferenceTab === preferenceTabs.SECURITY}
      />
      <PreferenceNavigationButton icon='fa-user'
        dataL10nId='shields'
        onClick={this.props.changeTab.bind(null, preferenceTabs.SHIELDS)}
        selected={this.props.preferenceTab === preferenceTabs.SHIELDS}
      />
      <PreferenceNavigationButton icon='fa-bitcoin'
        dataL10nId='publishers'
        onClick={this.props.changeTab.bind(null, preferenceTabs.PUBLISHERS)}
        selected={this.props.preferenceTab === preferenceTabs.PUBLISHERS}
      />
      <PreferenceNavigationButton icon='fa-refresh'
        dataL10nId='sync'
        onClick={this.props.changeTab.bind(null, preferenceTabs.SYNC)}
        selected={this.props.preferenceTab === preferenceTabs.SYNC}
      />
      <PreferenceNavigationButton icon='fa-server'
        dataL10nId='advanced'
        onClick={this.props.changeTab.bind(null, preferenceTabs.ADVANCED)}
        selected={this.props.preferenceTab === preferenceTabs.ADVANCED}
      />
      <HelpfulHints hintNumber={this.props.hintNumber} refreshHint={this.props.refreshHint} />
    </div>
  }
}

class SitePermissionsPage extends React.Component {
  hasEntryForPermission (name) {
    return this.props.siteSettings.some((value) => {
      return value.get ? typeof value.get(name) === permissionNames[name] : false
    })
  }
  isPermissionsNonEmpty () {
    // Check whether there is at least one permission set
    return this.props.siteSettings.some((value) => {
      if (value && value.get) {
        for (let name in permissionNames) {
          if (typeof value.get(name) === permissionNames[name]) {
            return true
          }
        }
      }
      return false
    })
  }
  deletePermission (name, hostPattern) {
    aboutActions.removeSiteSetting(hostPattern, name)
  }
  render () {
    return this.isPermissionsNonEmpty()
    ? <div id='sitePermissionsPage'>
      <div data-l10n-id='sitePermissions'></div>
      <ul className='sitePermissions'>
        {
          Object.keys(permissionNames).map((name) =>
            this.hasEntryForPermission(name)
            ? <li>
              <div data-l10n-id={name} className='permissionName'></div>
              <ul>
              {
                this.props.siteSettings.map((value, hostPattern) => {
                  if (!value.size) {
                    return null
                  }
                  const granted = value.get(name)
                  if (typeof granted === permissionNames[name]) {
                    let statusText
                    let statusArgs
                    if (name === 'flash') {
                      // Show the number of days/hrs/min til expiration
                      if (granted === 1) {
                        // Flash is allowed just one time
                        statusText = 'flashAllowOnce'
                      } else {
                        statusText = 'flashAllowAlways'
                        statusArgs = {
                          time: new Date(granted).toLocaleString()
                        }
                      }
                    } else {
                      statusText = granted ? 'alwaysAllow' : 'alwaysDeny'
                    }
                    return <div className='permissionItem'>
                      <span className='fa fa-times permissionAction'
                        onClick={this.deletePermission.bind(this, name, hostPattern)}></span>
                      <span className='permissionHost'>{hostPattern + ': '}</span>
                      <span className='permissionStatus'
                        data-l10n-id={statusText}
                        data-l10n-args={statusArgs ? JSON.stringify(statusArgs) : null}></span>
                    </div>
                  }
                  return null
                })
              }
              </ul>
            </li>
            : null)
        }
      </ul>
    </div>
    : null
  }
}

class AboutPreferences extends React.Component {
  constructor () {
    super()
    let hash = window.location.hash ? window.location.hash.slice(1) : ''
    this.state = {
      preferenceTab: hash.toUpperCase() in preferenceTabs ? hash : preferenceTabs.GENERAL,
      hintNumber: this.getNextHintNumber(),
      languageCodes: window.languageCodes ? Immutable.fromJS(window.languageCodes) : Immutable.Map(),
      flashInstalled: false,
      settings: window.initSettings ? Immutable.fromJS(window.initSettings) : Immutable.Map(),
      siteSettings: window.initSiteSettings ? Immutable.fromJS(window.initSiteSettings) : Immutable.Map(),
      braveryDefaults: window.initBraveryDefaults ? Immutable.fromJS(window.initBraveryDefaults) : Immutable.Map(),
      ledger: []
    }
    aboutActions.checkFlashInstalled()
    window.addEventListener(messages.SETTINGS_UPDATED, (e) => {
      this.setState({
        settings: Immutable.fromJS(e.detail || {})
      })
    })
    window.addEventListener(messages.LEDGER_UPDATED, (e) => {
      PaymentsTab.defaultProps.data = e.detail
    })
    window.addEventListener(messages.SITE_SETTINGS_UPDATED, (e) => {
      this.setState({
        siteSettings: Immutable.fromJS(e.detail || {})
      })
    })
    window.addEventListener(messages.BRAVERY_DEFAULTS_UPDATED, (e) => {
      this.setState({
        braveryDefaults: Immutable.fromJS(e.detail || {})
      })
    })
    window.addEventListener(messages.FLASH_UPDATED, (e) => {
      this.setState({
        flashInstalled: e.detail
      })
    })
    this.onChangeSetting = this.onChangeSetting.bind(this)
  }

  changeTab (preferenceTab) {
    this.setState({
      preferenceTab
    })
  }

  refreshHint () {
    this.setState({
      hintNumber: this.getNextHintNumber()
    })
  }

  getNextHintNumber () {
    // Try for a new random number at most 10 times.
    // Avoiding the same tip twice is good because people may think the
    // refresh button is broken.
    let newNumber
    for (let i = 0; i < 10; ++i) {
      newNumber = Math.random() * hintCount | 0
      if (!this.state || newNumber !== this.state.hintNumber) {
        break
      }
    }
    return newNumber
  }

  onChangeSetting (key, value) {
    this.setState({
      settings: this.state.settings.set(key, value)
    })
    aboutActions.changeSetting(key, value)
  }

  render () {
    let tab
    const settings = this.state.settings
    const siteSettings = this.state.siteSettings
    const braveryDefaults = this.state.braveryDefaults
    const languageCodes = this.state.languageCodes
    switch (this.state.preferenceTab) {
      case preferenceTabs.GENERAL:
        tab = <GeneralTab settings={settings} onChangeSetting={this.onChangeSetting} languageCodes={languageCodes} />
        break
      case preferenceTabs.SEARCH:
        tab = <SearchTab settings={settings} onChangeSetting={this.onChangeSetting} />
        break
      case preferenceTabs.TABS:
        tab = <TabsTab settings={settings} onChangeSetting={this.onChangeSetting} />
        break
      case preferenceTabs.SECURITY:
        tab = <SecurityTab settings={settings} siteSettings={siteSettings} braveryDefaults={braveryDefaults} flashInstalled={this.state.flashInstalled} onChangeSetting={this.onChangeSetting} />
        break
      case preferenceTabs.SHIELDS:
        tab = <ShieldsTab settings={settings} siteSettings={siteSettings} braveryDefaults={braveryDefaults} onChangeSetting={this.onChangeSetting} />
        break
      case preferenceTabs.PUBLISHERS:
        tab = <PaymentsTab settings={settings} siteSettings={siteSettings} braveryDefaults={braveryDefaults} onChangeSetting={this.onChangeSetting} />
        break
      case preferenceTabs.SYNC:
        tab = <SyncTab settings={settings} onChangeSetting={this.onChangeSetting} />
        break
      case preferenceTabs.ADVANCED:
        tab = <AdvancedTab settings={settings} onChangeSetting={this.onChangeSetting} />
        break
    }
    return <div>
      <PreferenceNavigation preferenceTab={this.state.preferenceTab} hintNumber={this.state.hintNumber}
        changeTab={this.changeTab.bind(this)}
        refreshHint={this.refreshHint.bind(this)}
        getNextHintNumber={this.getNextHintNumber.bind(this)} />
      <div className='prefBody'>
        <div className='prefTabContainer'>
          {tab}
        </div>
      </div>
    </div>
  }
}

module.exports = <AboutPreferences />
