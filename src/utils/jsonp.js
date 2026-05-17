let callbackCounter = 0

export function jsonp(url, callbackName, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const cbName = callbackName || `__jsonp_cb_${++callbackCounter}_${Date.now()}`
    const script = document.createElement('script')
    let timer

    const cleanup = () => {
      clearTimeout(timer)
      delete window[cbName]
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    window[cbName] = (data) => {
      cleanup()
      resolve(data)
    }

    timer = setTimeout(() => {
      cleanup()
      reject(new Error(`JSONP timeout: ${url}`))
    }, timeout)

    const sep = url.includes('?') ? '&' : '?'
    script.src = `${url}${sep}callback=${cbName}`
    script.onerror = () => {
      cleanup()
      reject(new Error(`JSONP error: ${url}`))
    }
    document.head.appendChild(script)
  })
}

export function jsonpVar(url, varName, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    let timer

    const cleanup = () => {
      clearTimeout(timer)
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    timer = setTimeout(() => {
      cleanup()
      reject(new Error(`JSONP timeout: ${url}`))
    }, timeout)

    script.src = url
    script.onload = () => {
      cleanup()
      const data = window[varName]
      if (data) {
        resolve(data)
      } else {
        reject(new Error(`Variable ${varName} not found after script load`))
      }
    }
    script.onerror = () => {
      cleanup()
      reject(new Error(`JSONP error: ${url}`))
    }
    document.head.appendChild(script)
  })
}
