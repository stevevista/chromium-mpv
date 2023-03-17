/**
  * Parse second to time string
  *
  * @param {Number} second
  * @return {String} 00:00 or 00:00:00
  */
export function formatSeconds (second, includeHour) {
  second = second || 0;
  if (second === 0 || second === Infinity || second.toString() === 'NaN') {
    return includeHour ? '00:00:00' : '00:00';
  }
  const add0 = (num) => (num < 10 ? '0' + num : '' + num);
  const hour = Math.floor(second / 3600);
  const min = Math.floor((second - hour * 3600) / 60);
  const sec = Math.floor(second - hour * 3600 - min * 60);
  return ((hour > 0 || includeHour) ? [hour, min, sec] : [min, sec]).map(add0).join(':');
}

/*

Copy from https://github.com/DIYgod/DPlayer

*/
export function getBoundingClientRectViewLeft (element) {
  const scrollTop = window.scrollY || window.pageYOffset || document.body.scrollTop + ((document.documentElement && document.documentElement.scrollTop) || 0);

  if (element.getBoundingClientRect) {
    if (typeof getBoundingClientRectViewLeft.offset !== 'number') {
      let temp = document.createElement('div');
      temp.style.cssText = 'position:absolute;top:0;left:0;';
      document.body.appendChild(temp);
      getBoundingClientRectViewLeft.offset = -temp.getBoundingClientRect().top - scrollTop;
      document.body.removeChild(temp);
      temp = null;
    }
    const rect = element.getBoundingClientRect();
    const offset = getBoundingClientRectViewLeft.offset;

    return rect.left + offset;
  } else {
    // not support getBoundingClientRect
    return getElementViewLeft(element);
  }
}

function getElementViewLeft (element) {
  let actualLeft = element.offsetLeft;
  let current = element.offsetParent;
  const elementScrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft;
  if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
    while (current != null) {
      actualLeft += current.offsetLeft;
      current = current.offsetParent;
    }
  } else {
    while (current != null && current !== element) {
      actualLeft += current.offsetLeft;
      current = current.offsetParent;
    }
  }
  return actualLeft - elementScrollLeft;
}

export function filesize (bytes) {
  const options = {}

  options.calculate = function () {
    const type = ['K', 'B']
    const magnitude = (Math.log(bytes) / Math.log(1024)) | 0
    const result = (bytes / Math.pow(1024, magnitude))
    const fixed = result.toFixed(2)

    const suffix = magnitude
      ? (type[0] + 'MGTPEZY')[magnitude - 1] + type[1]
      : ((fixed | 0) === 1 ? 'Byte' : 'Bytes')

    return {
      suffix,
      result,
      fixed
    }
  }

  options.to = function (unit) {
    let position = ['B', 'K', 'M', 'G', 'T'].indexOf(typeof unit === 'string' ? unit[0].toUpperCase() : 'B')
    var result = bytes

    if (position === -1 || position === 0) return result.toFixed(2)
    for (; position > 0; position--) result /= 1024
    return result.toFixed(2)
  }

  options.human = function () {
    var output = options.calculate()
    return output.fixed + ' ' + output.suffix
  }

  return options;
}
