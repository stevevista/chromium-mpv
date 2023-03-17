// split ur -> (protp, auth@, rest)
// 
// rtsp://user:pass@xx.host.com/path?query=1
//  [1] rtsp
//  [2] user:pass@
//  [3] user
//  [4] pass
//  [5] xx.host.com/path?query=1
const simple_uri_re = /^([A-Za-z]{3,9}):\/\/(([\-;&=\+\$,\w]*):([\-;&=\+\$,\w]*)@)?(.*)$/

export function parseURL (url) {
  const m = url.match(simple_uri_re)
  if (!m) {
    return
  }

  return {
    protocol: m[1],
    username: decodeURIComponent(m[3] || ''),
    password: decodeURIComponent(m[4] || ''),
  }
}

export function appendURLAuth (src, username, password) {
  if (username) {
    const m = src.match(simple_uri_re)
    if (m) {
      return `${m[1]}://${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@${m[5]}`
    }
  }
  return src
}
