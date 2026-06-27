export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): (...args: TArgs) => void {
  let timer: number | undefined
  return (...args: TArgs) => {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), wait)
  }
}

export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): (...args: TArgs) => void {
  let last = 0
  let timer: number | undefined

  return (...args: TArgs) => {
    const now = performance.now()
    const remaining = wait - (now - last)

    if (remaining <= 0) {
      if (timer !== undefined) {
        window.clearTimeout(timer)
        timer = undefined
      }
      last = now
      fn(...args)
      return
    }

    if (timer === undefined) {
      timer = window.setTimeout(() => {
        last = performance.now()
        timer = undefined
        fn(...args)
      }, remaining)
    }
  }
}
