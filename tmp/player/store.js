import { useSettings } from '~/renderer/store/common-store'

// for ipc device
export function provideRtspAuth (options, callback) {
  const {url, username: oldUsername, password: oldPassword} = options
  
  const { username, password } = gerPreferAuthInfo(url)
  if (username && password && (username !== oldUsername || password !== oldPassword)) {
    return callback({ username, password })
  }

  window.electron.requestAuthInput({
    url,
    username: oldUsername
  })
    .then(result => {
      if (result && result.username) {
        updateAuthInfo(url, result.username, result.password)
        callback({username: result.username, password: result.password})
      } else {
        callback({})
      }
    })
}

export function gerPreferAuthInfo (url) {
  let username
  let password
  try {
    const xaddr = new URL(url)
    const credStr = localStorage.getItem(`${xaddr.host}-credit`) || '';
    const credit = JSON.parse(credStr);
    username = credit.username
    password = credit.password
  } catch (e) {
    // ignore
  }

  return { username, password }
}

function updateAuthInfo (url, username, password) {
  const xaddr = new URL(url)
  if (xaddr && xaddr.host) {
    localStorage.setItem(`${xaddr.host}-credit`, JSON.stringify({username, password}));
  }
}

export function toggleAI (fea) {
  const settings = useSettings()

  if (fea === 'all') {
    if (settings.aiSwitchs.length) {
      settings.aiSwitchs = []
    } else {
      settings.aiSwitchs = ['face', 'pedestrian', 'vehicle', 'face_detail', 'pedestrian_detail', 'car_detail']
    }
  } else {
    if (settings.aiSwitchs.indexOf(fea) < 0) {
      settings.aiSwitchs = settings.aiSwitchs.concat([fea])
    } else {
      settings.aiSwitchs = settings.aiSwitchs.filter(item => item !== fea)
    }
  }

  settings.save()
}

export async function ensureScreenshotDirectoryExists () {
  const settings = useSettings()

  // select directory
  let dir = settings.screenshotPath;
  if (dir) {
    const stat = await window.electron.shellStatPath(dir)
    if (stat && stat.isDirectory) {
      return true
    }
  }
  
  const selDir = await selectScreenshotFolder()
  return !!selDir
}

export async function selectScreenshotFolder () {
  const settings = useSettings()

  const { canceled, filePaths } = await window.electron.showOpenDialog({
    defaultPath: settings.screenshotPath || '',
    properties: ['openDirectory']
  })
  if (!canceled) {
    const screenshotPath = filePaths[0]
    settings.screenshotPath = screenshotPath
    settings.save({ screenshotPath })
    return screenshotPath
  }
}
