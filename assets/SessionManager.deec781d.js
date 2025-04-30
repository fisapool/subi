import {
  d as N,
  r as O,
  c as M,
  s as U,
  o as H,
  a as w,
  b as v,
  e as u,
  u as R,
  F as A,
  f as T,
  t as C,
  w as I,
  g as L,
} from "./index.978da6eb.js"
const y = { CRITICAL: "critical", WARNING: "warning", INFO: "info" },
  K = 3,
  D = ["domain", "name", "value"],
  j = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
  V = 4096,
  P = [/<script/i, /javascript:/i, /data:/i, /vbscript:/i, /onclick/i, /onerror/i, /onload/i, /%3Cscript/i],
  W = ["__Host-", "__Secure-", "__SameSite=", "__Host-", "__Secure-"],
  x = { MAX_SIZE: 1e3, TTL: 5 * 60 * 1e3, BATCH_SIZE: 50 }
class z {
  constructor(e = x.MAX_SIZE, t = x.TTL) {
    ;(this.cache = new Map()), (this.maxSize = e), (this.ttl = t)
  }
  set(e, t) {
    if (this.cache.size >= this.maxSize) {
      const s = this.cache.keys().next().value
      this.cache.delete(s)
    }
    this.cache.set(e, { value: t, timestamp: Date.now() })
  }
  get(e) {
    const t = this.cache.get(e)
    return t ? (Date.now() - t.timestamp > this.ttl ? (this.cache.delete(e), null) : t.value) : null
  }
  clear() {
    this.cache.clear()
  }
}
class q {
  constructor() {
    this.retryCount = new Map()
  }
  async handleError(e, t, s) {
    console.error(`Error in ${t} during ${s}:`, e)
    const n = this.enhanceError(e, t)
    return (
      await this.logError(n),
      this.shouldRetry(n) && (await this.retryOperation(n, s)).success
        ? { handled: !0, recovered: !0, message: "Operation recovered after retry" }
        : { handled: !0, recovered: !1, message: this.getErrorMessage(n) }
    )
  }
  enhanceError(e, t) {
    return {
      original: e,
      timestamp: new Date(),
      context: t,
      level: this.determineErrorLevel(e),
      code: this.getErrorCode(e),
      recoverable: this.isRecoverable(e),
    }
  }
  determineErrorLevel(e) {
    let t = ""
    if (e instanceof Error) t = e.message || "Unknown error"
    else if (typeof e == "object" && e !== null)
      if (e.message) t = e.message
      else
        try {
          t = JSON.stringify(e)
        } catch {
          t = "Unknown error object"
        }
    else t = String(e)
    return (
      (!t || t === "[object Object]") && (t = "Unknown error"),
      t.includes("Failed to parse") || t.includes("Invalid cookie data") || t.includes("Security violation")
        ? y.CRITICAL
        : t.includes("Missing domain") || t.includes("__Host-") || t.includes("validation")
          ? y.WARNING
          : y.INFO
    )
  }
  getErrorCode(e) {
    return e instanceof DOMException
      ? `DOM_${e.name}`
      : e.message.includes("Failed to parse or set cookie")
        ? "COOKIE_PARSE_ERROR"
        : e.message.includes("__Host-") || e.message.includes("__Secure-")
          ? "HOST_COOKIE_ERROR"
          : e.name || "UNKNOWN_ERROR"
  }
  isRecoverable(e) {
    return e.message.includes("network") || (e instanceof DOMException && !e.message.includes("QuotaExceededError"))
  }
  shouldRetry(e) {
    const t = this.retryCount.get(e.code) || 0
    return e.recoverable && t < K
  }
  async retryOperation(e, t) {
    const s = this.retryCount.get(e.code) || 0
    this.retryCount.set(e.code, s + 1)
    const n = Math.pow(2, s) * 1e3
    return await new Promise((r) => setTimeout(r, n)), { success: !0 }
  }
  async logError(e) {
    const t = {
      message: e.original.message || "Unknown error",
      context: e.context || "Unknown context",
      level: e.level || "unknown",
      code: e.code || "UNKNOWN_ERROR",
      timestamp: e.timestamp || new Date().toISOString(),
      suggestions: this.getErrorSuggestions(e),
      recoverable: e.recoverable,
    }
    e.level === y.CRITICAL && (t.stack = e.original.stack),
      e.level === y.CRITICAL
        ? console.error(`[CookieManager.${e.context}] Critical Error:`, JSON.stringify(t, null, 2))
        : e.level === y.WARNING
          ? console.warn(`[CookieManager.${e.context}] Warning:`, t.message)
          : console.info(`[CookieManager.${e.context}] Info:`, t.message),
      e.level === y.CRITICAL && this.notifyUI(t)
  }
  getErrorSuggestions(e) {
    const t = []
    switch (e.code) {
      case "COOKIE_PARSE_ERROR":
        t.push(
          "Check if the cookie data is properly formatted",
          "Verify that all required fields are present",
          "Ensure the cookie value is properly encoded",
        )
        break
      case "HOST_COOKIE_ERROR":
        t.push(
          "Verify that the domain matches the __Host- or __Secure- prefix requirements",
          "Ensure the cookie is being set over HTTPS",
          'Check if the path is set to "/" for __Host- cookies',
        )
        break
      case "DOM_QuotaExceededError":
        t.push(
          "Consider clearing some existing cookies",
          "Check if the cookie value size can be reduced",
          "Verify if the storage quota has been exceeded",
        )
        break
      default:
        e.recoverable && t.push("The operation will be retried automatically")
    }
    return t
  }
  notifyUI(e) {
    try {
      chrome.runtime.sendMessage({ type: "ERROR_NOTIFICATION", error: e })
    } catch (t) {
      console.warn("Failed to notify UI of error:", t)
    }
  }
  getErrorMessage(e) {
    if (e.original instanceof DOMException) return `Error in ${e.context}: ${e.original.name} - ${e.original.message}`
    if (e.original && typeof e.original == "object") {
      const t = e.original.message || e.original.toString() || JSON.stringify(e.original)
      return `Error in ${e.context}: ${t}`
    } else return `Error in ${e.context}: ${e.original || "Unknown error"}`
  }
}
class J {
  validateCookie(e) {
    const t = [],
      s = []
    if (
      ("hostOnly" in e &&
        s.push({
          field: "hostOnly",
          message: "hostOnly property is not supported by Chrome cookies API and will be removed",
        }),
      this.validateRequiredFields(e, t),
      this.validateDomain(e.domain, t),
      this.validateValue(e.value, s),
      this.containsSuspiciousContent(e.value) &&
        s.push({ field: "value", message: "Cookie value contains potentially suspicious content" }),
      e.value.length > V && s.push({ field: "value", message: "Cookie value exceeds recommended size" }),
      this.validateHostCookie(e, t, s),
      this.validateSecurityFlags(e, s),
      e.expirationDate !== void 0 &&
        (typeof e.expirationDate != "number"
          ? t.push({ field: "expirationDate", message: "expirationDate must be a number (seconds since epoch)" })
          : e.expirationDate < Date.now() / 1e3 &&
            s.push({ field: "expirationDate", message: "Cookie has already expired" })),
      e.sameSite !== void 0)
    ) {
      const r = ["no_restriction", "lax", "strict"]
      r.includes(e.sameSite) || t.push({ field: "sameSite", message: `sameSite must be one of: ${r.join(", ")}` })
    }
    e.path !== void 0 && typeof e.path != "string" && t.push({ field: "path", message: "path must be a string" }),
      e.secure !== void 0 &&
        typeof e.secure != "boolean" &&
        t.push({ field: "secure", message: "secure must be a boolean" }),
      e.httpOnly !== void 0 &&
        typeof e.httpOnly != "boolean" &&
        t.push({ field: "httpOnly", message: "httpOnly must be a boolean" }),
      e.storeId !== void 0 &&
        typeof e.storeId != "string" &&
        t.push({ field: "storeId", message: "storeId must be a string" })
    const n = {
      isValid: t.length === 0,
      cookieName: e.name || "unknown",
      cookieDomain: e.domain || "unknown",
      errors: t,
      warnings: s,
      timestamp: new Date().toISOString(),
    }
    return (
      t.length > 0 && console.error(`Cookie validation errors for ${e.name}:`, JSON.stringify(n, null, 2)),
      s.length > 0 && console.debug(`Cookie validation warnings for ${e.name}:`, JSON.stringify(n, null, 2)),
      n
    )
  }
  validateRequiredFields(e, t) {
    const s = D.filter((n) => !e[n])
    if (e.name && e.name.startsWith("__Host-")) {
      const r = D.filter((o) => o !== "domain").filter((o) => !e[o])
      r.length > 0 &&
        t.push({ level: y.CRITICAL, message: `Missing required fields for __Host- cookie: ${r.join(", ")}` })
    } else s.length > 0 && t.push({ level: y.CRITICAL, message: `Missing required fields: ${s.join(", ")}` })
  }
  validateDomain(e, t) {
    ;(!e || !j.test(e)) && t.push({ field: "domain", message: "Invalid domain format" })
  }
  validateValue(e, t) {
    e || t.push({ field: "value", message: "Empty cookie value" })
  }
  containsSuspiciousContent(e) {
    return P.some((t) => t.test(e))
  }
  validateHostCookie(e, t, s) {
    W.some((r) => e.name.startsWith(r)) &&
      (e.secure || t.push({ field: "secure", message: "Host-prefixed cookies must be secure" }),
      e.path !== "/" && t.push({ field: "path", message: 'Host-prefixed cookies must have path="/"' }),
      e.name.startsWith("__Host-") &&
        e.domain &&
        s.push({
          field: "domain",
          message: "__Host- cookies should not specify a domain according to browser standards",
        }))
  }
  validateSecurityFlags(e, t) {
    ;(e.name.includes("session") || e.name.includes("token")) &&
      (e.secure || t.push({ field: "secure", message: "Sensitive cookies should be secure" })),
      (e.name.includes("session") || e.name.includes("token")) &&
        (e.httpOnly || t.push({ field: "httpOnly", message: "Sensitive cookies should be httpOnly" }))
  }
}
class Z {
  constructor() {
    ;(this.validator = new J()),
      (this.errorHandler = new q()),
      (this.errorManager = new B()),
      (this.cache = new z()),
      (this.pendingOperations = new Map()),
      (this.worker = null),
      (this.csrfToken = null),
      this.initializeWorker()
  }
  initializeWorker() {
    typeof Worker != "undefined" &&
      ((this.worker = new Worker("cookie-worker.js")),
      (this.worker.onmessage = (e) => {
        const { id: t, result: s } = e.data,
          n = this.pendingOperations.get(t)
        n && (n(s), this.pendingOperations.delete(t))
      }))
  }
  async batchProcess(e) {
    const t = []
    for (let n = 0; n < e.length; n += x.BATCH_SIZE) t.push(e.slice(n, n + x.BATCH_SIZE))
    const s = []
    for (const n of t) {
      const r = await Promise.all(n.map((o) => this.executeOperation(o)))
      s.push(...r)
    }
    return s
  }
  async executeOperation(e) {
    const t = this.getCacheKey(e),
      s = this.cache.get(t)
    if (s) return s
    if (this.worker && e.type === "heavy")
      return new Promise((r) => {
        const o = Date.now().toString()
        this.pendingOperations.set(o, r), this.worker.postMessage({ id: o, operation: e })
      })
    const n = await this.processOperation(e)
    return this.cache.set(t, n), n
  }
  getCacheKey(e) {
    return `${e.type}-${e.domain}-${JSON.stringify(e.data)}`
  }
  async processOperation(e) {
    switch (e.type) {
      case "get":
        return this.getCookies(e.domain)
      case "set":
        return this.setCookies(e.data, e.domain)
      case "remove":
        return this.removeCookies(e.domain)
      default:
        throw new Error(`Unknown operation type: ${e.type}`)
    }
  }
  async initialize() {
    try {
      const e = await chrome.storage.local.get("encryptionKey")
      e.encryptionKey
        ? (this.encryptionKey = e.encryptionKey)
        : ((this.encryptionKey = await this.generateEncryptionKey()),
          await chrome.storage.local.set({ encryptionKey: this.encryptionKey })),
        this.csrfToken || (await this.generateCSRFToken())
    } catch (e) {
      throw (this.errorManager.addError(e, { operation: "initialize" }), e)
    }
  }
  async generateEncryptionKey() {
    return await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, !0, ["encrypt", "decrypt"])
  }
  async generateCSRFToken() {
    try {
      const e = crypto.getRandomValues(new Uint8Array(32)).reduce((t, s) => t + s.toString(16).padStart(2, "0"), "")
      return (this.csrfToken = e), e
    } catch (e) {
      return (
        this.errorManager.addError(e, { operation: "generateCSRFToken" }),
        (this.csrfToken = `token-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`),
        this.csrfToken
      )
    }
  }
  getCSRFToken() {
    return this.csrfToken || this.generateCSRFToken(), this.csrfToken
  }
  async importCookies(e, t = !1) {
    return this.errorManager.withRetry(
      async () => {
        if (!Array.isArray(e)) throw new Error("Invalid cookie data format")
        const s = {
            success: [],
            failed: [],
            warnings: [],
            summary: { total: e.length, success: 0, failed: 0, warnings: 0 },
          },
          n = await this.validateSession()
        this.errorManager.setSessionValid(n)
        for (const r of e)
          try {
            const o = { ...r }
            "hostOnly" in o &&
              (console.log(`Removing unsupported 'hostOnly' property from cookie: ${o.name}`),
              delete o.hostOnly,
              t ||
                (s.warnings.push({ cookie: o.name, message: "Removed unsupported hostOnly property" }),
                s.summary.warnings++))
            const i = this.validator.validateCookie(o)
            if (
              (i.warnings.length > 0 &&
                !t &&
                (s.warnings.push({ cookie: o.name, warnings: i.warnings }), s.summary.warnings++),
              !i.isValid)
            ) {
              const h = {
                cookie: {
                  name: o.name,
                  domain: o.domain,
                  path: o.path || "/",
                  secure: o.secure || !1,
                  httpOnly: o.httpOnly || !1,
                  sameSite: o.sameSite || "no_restriction",
                },
                validationErrors: i.errors,
                validationWarnings: i.warnings,
                timestamp: new Date().toISOString(),
              }
              s.failed.push(h), s.summary.failed++, this.notifyValidationFailure(h, t)
              continue
            }
            if (!this.validateRequiredCookieFields(o)) {
              const h = {
                cookie: { name: o.name, domain: o.domain },
                error: "Missing required fields for Chrome cookies API",
                timestamp: new Date().toISOString(),
              }
              s.failed.push(h), s.summary.failed++, this.notifyValidationFailure(h, t)
              continue
            }
            this.SPECIAL_COOKIE_PREFIXES.some((h) => o.name.startsWith(h))
              ? await this.processHostCookie(o)
              : await this.processRegularCookie(o),
              s.success.push({ name: o.name, domain: o.domain, path: o.path || "/" }),
              s.summary.success++,
              console.log(`Successfully imported cookie: ${o.name} for domain: ${o.domain}`)
          } catch (o) {
            const i = `Failed to import cookie "${r.name}" for domain "${r.domain}": ${o.message || "Unknown error"}`,
              h = new Error(i)
            ;(h.originalError = o), this.errorManager.addError(h, { cookie: r, operation: "importCookies" })
            const S = { cookie: { name: r.name, domain: r.domain }, error: i, timestamp: new Date().toISOString() }
            s.failed.push(S),
              s.summary.failed++,
              this.notifyValidationFailure(S, t),
              console.error(`Cookie import error: ${i}`, o)
          }
        return console.log("Cookie import summary:", JSON.stringify(s.summary, null, 2)), s
      },
      { operation: "importCookies" },
    )
  }
  validateRequiredCookieFields(e) {
    const s = ["name", "value", "domain"].filter((n) => !e[n])
    return s.length > 0
      ? (console.error(
          `Missing required fields for cookie: ${JSON.stringify({ cookieName: e.name || "unknown", missingFields: s, timestamp: new Date().toISOString() }, null, 2)}`,
        ),
        !1)
      : !0
  }
  notifyValidationFailure(e, t = !1) {
    if (!(t && e.validationWarnings && !e.validationErrors))
      try {
        chrome.runtime.sendMessage({ type: "COOKIE_VALIDATION_FAILURE", error: e })
      } catch (s) {
        console.warn("Failed to notify UI of validation failure:", s)
      }
  }
  async processHostCookie(e) {
    try {
      ;(e.secure = !0), (e.path = "/"), e.name.startsWith("__Host-") && delete e.domain
      const t = {
        url: this.getCookieUrl(e),
        name: e.name,
        value: e.value,
        path: e.path,
        secure: e.secure,
        httpOnly: e.httpOnly || !1,
        sameSite: e.sameSite || "no_restriction",
      }
      e.domain && (t.domain = e.domain), e.expirationDate && (t.expirationDate = e.expirationDate)
      const s = await chrome.cookies.set(t)
      if (!s) throw new Error(`Failed to set host cookie: ${e.name}`)
      return console.log(`Successfully set host cookie: ${e.name}`), s
    } catch (t) {
      throw (console.error(`Error setting host cookie: ${e.name}`, t), t)
    }
  }
  async processRegularCookie(e) {
    try {
      ;(e.domain = this.normalizeDomain(e.domain)), (e.path = e.path || "/")
      const t = {
        url: this.getCookieUrl(e),
        name: e.name,
        value: e.value,
        domain: e.domain,
        path: e.path,
        secure: e.secure || !1,
        httpOnly: e.httpOnly || !1,
        sameSite: e.sameSite || "no_restriction",
      }
      e.expirationDate && (t.expirationDate = e.expirationDate)
      const s = await chrome.cookies.set(t)
      if (!s) throw new Error(`Failed to set regular cookie: ${e.name}`)
      return console.log(`Successfully set regular cookie: ${e.name}`), s
    } catch (t) {
      throw (console.error(`Error setting regular cookie: ${e.name}`, t), t)
    }
  }
  normalizeDomain(e) {
    return e.startsWith(".") ? e.slice(1) : e
  }
  getCookieUrl(e) {
    return (e.name && e.name.startsWith("__Host-") && !e.domain) || !e.domain
      ? window.location.origin
      : `${e.secure ? "https:" : "http:"}//${e.domain}`
  }
  async exportCookies(e) {
    return this.errorManager.withRetry(
      async () => {
        const t = await chrome.cookies.getAll({ domain: e }),
          s = []
        for (const n of t) {
          const r = this.validator.validateCookie(n)
          r.warnings.length > 0 && s.push({ cookie: n.name, warnings: r.warnings })
        }
        return {
          cookies: t.map((n) => ({ ...n, domain: this.normalizeDomain(n.domain) })),
          warnings: s.length > 0 ? s : null,
        }
      },
      { operation: "exportCookies", domain: e },
    )
  }
  async setCookies(e, t, s = !1) {
    const n = e.map((r) => ({ type: "set", domain: t, data: r }))
    return this.batchProcess(n)
  }
  async getCookies(e) {
    const t = `cookies-${e}`,
      s = this.cache.get(t)
    if (s) return s
    const n = await chrome.cookies.getAll({ domain: e })
    return this.cache.set(t, n), n
  }
  async removeCookies(e) {
    const s = (await this.getCookies(e)).map((n) => ({ type: "remove", domain: e, data: n }))
    return this.batchProcess(s)
  }
  async validateSession() {
    try {
      const e = { name: "__test_session_validation", value: "1", domain: "localhost" }
      return await chrome.cookies.set(e), await chrome.cookies.remove({ url: "http://localhost", name: e.name }), !0
    } catch (e) {
      return console.warn("Session validation failed:", e), !1
    }
  }
}
class B {
  constructor() {
    ;(this.errors = []),
      (this.warnings = []),
      (this.maxRetries = 3),
      (this.suppressedErrors = new Set()),
      (this.sessionValid = !1)
  }
  safeStringify(e, t = 2) {
    const s = new WeakSet()
    return JSON.stringify(
      e,
      (n, r) => {
        if (typeof r == "object" && r !== null) {
          if (s.has(r)) return "[Circular Reference]"
          s.add(r)
        }
        return r instanceof Error
          ? {
              name: r.name,
              message: r.message,
              stack: r.stack,
              ...Object.getOwnPropertyNames(r).reduce((o, i) => ((o[i] = r[i]), o), {}),
            }
          : r
      },
      t,
    )
  }
  addError(e, t = {}) {
    let s = { message: "", stack: "", originalError: null }
    if (e instanceof Error) s = { message: e.message || "Unknown error", stack: e.stack || "", originalError: e }
    else if (typeof e == "object" && e !== null)
      try {
        e.message ? (s.message = e.message) : (s.message = this.safeStringify(e)), (s.originalError = e)
      } catch {
        ;(s.message = "Failed to process error object"), (s.originalError = e)
      }
    else s.message = String(e)
    ;(!s.message || s.message === "[object Object]") && (s.message = "Unknown error")
    const n = {
      timestamp: new Date().toISOString(),
      message: s.message,
      stack: s.stack,
      context: { ...t, errorType: e instanceof Error ? e.constructor.name : typeof e },
      level: this.determineErrorLevel(e),
      originalError: s.originalError,
    }
    return (
      this.errors.push(n),
      console.error(
        `[CookieManager Error] ${n.context.operation || "Unknown Operation"}:`,
        JSON.stringify(
          { message: n.message, context: n.context, stack: n.stack || "No stack trace available", level: n.level },
          null,
          2,
        ),
      ),
      n
    )
  }
  addWarning(e, t = {}) {
    let s = ""
    typeof e == "object" ? (s = e.message || this.safeStringify(e)) : (s = String(e))
    const n = this.getErrorKey({ message: s })
    if (this.shouldSuppressError({ message: s }, n))
      return (
        console.debug(
          `[CookieManager Suppressed Warning] ${t.operation || "Unknown Operation"}:`,
          `
Message:`,
          s,
          `
Context:`,
          this.safeStringify(t),
        ),
        null
      )
    const r = { timestamp: new Date().toISOString(), message: s, context: { ...t, warningType: typeof e } }
    return (
      this.warnings.push(r),
      console.warn(
        `[CookieManager Warning] ${r.context.operation || "Unknown Operation"}:`,
        `
Message:`,
        r.message,
        `
Context:`,
        this.safeStringify(r.context),
      ),
      r
    )
  }
  determineErrorLevel(e) {
    let t = ""
    if (e instanceof Error) t = e.message || "Unknown error"
    else if (typeof e == "object" && e !== null)
      if (e.message) t = e.message
      else
        try {
          t = JSON.stringify(e)
        } catch {
          t = "Unknown error object"
        }
    else t = String(e)
    return (
      (!t || t === "[object Object]") && (t = "Unknown error"),
      t.includes("Failed to parse") || t.includes("Invalid cookie data") || t.includes("Security violation")
        ? y.CRITICAL
        : t.includes("Missing domain") || t.includes("__Host-") || t.includes("validation")
          ? y.WARNING
          : y.INFO
    )
  }
  async withRetry(e, t = {}) {
    let s = null
    for (let r = 1; r <= this.maxRetries; r++)
      try {
        return await e()
      } catch (o) {
        s = o
        const i = {
          ...t,
          attempt: r,
          maxRetries: this.maxRetries,
          operation: t.operation || "Unknown Operation",
          timestamp: new Date().toISOString(),
        }
        let h = o
        if (!(o instanceof Error)) {
          const _ = typeof o == "object" ? this.safeStringify(o) : String(o)
          ;(h = new Error(_)), (h.originalError = o)
        }
        const S = this.getErrorKey(h)
        if (this.shouldSuppressError(h, S)) {
          console.debug(
            `[CookieManager Suppressed] ${i.operation}:`,
            `
Attempt ${r}/${this.maxRetries}`,
            `
Error: ${h.message}`,
          )
          continue
        }
        if ((this.addError(h, i), r < this.maxRetries)) {
          console.warn(
            `[CookieManager Retry] ${i.operation}:`,
            `
Attempt ${r}/${this.maxRetries}`,
            `
Last Error: ${h.message}`,
            `
Retrying in ${Math.pow(2, r - 1)} seconds...`,
          )
          const _ = Math.pow(2, r - 1) * 1e3
          await new Promise((b) => setTimeout(b, _))
          continue
        }
      }
    const n = new Error(`Operation "${t.operation || "Unknown"}" failed after ${this.maxRetries} attempts`)
    throw (
      ((n.originalError = s),
      (n.context = t),
      (n.attempts = this.maxRetries),
      (n.lastError = s instanceof Error ? s.message : this.safeStringify(s)),
      n)
    )
  }
  getErrorKey(e) {
    const t = e.message || ""
    return t.includes("Invalid cookie data format")
      ? "INVALID_COOKIE_FORMAT"
      : t.includes("Failed to parse")
        ? "PARSE_ERROR"
        : t
  }
  shouldSuppressError(e, t) {
    return this.sessionValid
      ? t === "INVALID_COOKIE_FORMAT"
        ? this.suppressedErrors.has(t)
          ? !0
          : (this.suppressedErrors.add(t), !1)
        : !!(
            e.message &&
            (e.message.includes("validation") ||
              e.message.includes("__Host-") ||
              e.message.includes("domain format") ||
              e.message.includes("Empty cookie value") ||
              e.message.includes("Cookie value exceeds recommended size") ||
              e.message.includes("Cookie has already expired") ||
              e.message.includes("Sensitive cookies should be secure") ||
              e.message.includes("Sensitive cookies should be httpOnly"))
          )
      : !1
  }
  setSessionValid(e) {
    ;(this.sessionValid = e), e || this.suppressedErrors.clear()
  }
  getErrors() {
    return this.errors
  }
  getWarnings() {
    return this.warnings
  }
  clear() {
    ;(this.errors = []), (this.warnings = [])
  }
}
const G = N("session", () => {
  const g = O([]),
    e = O(!1),
    t = O(new Map()),
    s = M(() => g.value.length),
    n = M(() => g.value.reduce((l, c) => l + c.data.length, 0)),
    r = new Z(),
    o = async () => {
      e.value = !0
      try {
        const l = await chrome.storage.local.get("sessions")
        return (g.value = l.sessions || []), await r.initialize(), g.value
      } catch (l) {
        throw (console.error("Error loading sessions:", l), l)
      } finally {
        e.value = !1
      }
    },
    i = async () => {
      e.value = !0
      try {
        const l = await chrome.tabs.query({ currentWindow: !0 }),
          c = await Promise.all(
            l.map(async (d) => {
              try {
                const a = new URL(d.url).hostname,
                  m = await r.exportCookies(a),
                  p = await b(d.url)
                return { url: d.url, title: d.title, favicon: p, cookies: m }
              } catch (a) {
                return (
                  console.error("Error exporting cookies for tab:", d.url, a),
                  { url: d.url, title: d.title, favicon: null, cookies: null }
                )
              }
            }),
          ),
          f = { id: Date.now(), name: `Session ${new Date().toLocaleString()}`, data: c, createdAt: Date.now() },
          k = [...g.value, f]
        return await chrome.storage.local.set({ sessions: k }), (g.value = k), f
      } catch (l) {
        throw (console.error("Error creating session:", l), l)
      } finally {
        e.value = !1
      }
    },
    h = async (l) => {
      e.value = !0
      try {
        const c = g.value.find((d) => d.id === l)
        if (!c) throw new Error(`Session with ID ${l} not found`)
        const f = await chrome.windows.create({}),
          k = c.data.map(async (d) => {
            try {
              const a = await chrome.tabs.create({ windowId: f.id, url: d.url, active: !1 })
              if (d.cookies && d.cookies.length > 0) {
                const m = new URL(d.url).hostname
                await r.setCookies(d.cookies, m)
              }
              return a
            } catch (a) {
              return console.error("Error restoring tab:", d.url, a), null
            }
          })
        if ((await Promise.all(k), c.data.length > 0)) {
          const d = await chrome.tabs.query({ windowId: f.id, index: 0 })
          d.length > 0 && (await chrome.tabs.update(d[0].id, { active: !0 }))
        }
        return f
      } catch (c) {
        throw (console.error("Error restoring session:", c), c)
      } finally {
        e.value = !1
      }
    },
    S = async (l) => {
      e.value = !0
      try {
        const c = await chrome.tabs.create({ url: l.url, active: !0 })
        if (l.cookies && l.cookies.length > 0) {
          const f = new URL(l.url).hostname
          await r.setCookies(l.cookies, f)
        }
        return c
      } catch (c) {
        throw (console.error("Error restoring tab:", c), c)
      } finally {
        e.value = !1
      }
    },
    _ = async (l) => {
      e.value = !0
      try {
        const c = g.value.filter((f) => f.id !== l)
        await chrome.storage.local.set({ sessions: c }), (g.value = c)
      } catch (c) {
        throw (console.error("Error deleting session:", c), c)
      } finally {
        e.value = !1
      }
    },
    b = async (l) => {
      if (t.value.has(l)) return t.value.get(l)
      try {
        const c = new URL(l).hostname,
          f = `https://www.google.com/s2/favicons?domain=${c}&sz=32`
        if ((await fetch(f, { method: "HEAD" })).ok) return t.value.set(l, f), f
        const d = `https://www.google.com/s2/favicons?domain=${c}&sz=32`
        return t.value.set(l, d), d
      } catch (c) {
        return console.error("Error fetching favicon:", c), null
      }
    }
  return {
    sessions: g,
    loading: e,
    sessionCount: s,
    totalTabs: n,
    loadSessions: o,
    createNewSession: i,
    restoreSession: h,
    restoreTab: S,
    deleteSession: _,
    fetchFavicon: b,
  }
})
var X = (g, e) => {
  const t = g.__vccOpts || g
  for (const [s, n] of e) t[s] = n
  return t
}
const Q = { class: "session-manager" },
  Y = { class: "session-list max-h-[500px] overflow-y-auto" },
  ee = { key: 0, class: "flex justify-center items-center py-8" },
  te = { key: 1, class: "text-center py-8 text-gray-500" },
  se = { key: 2 },
  ne = ["onClick"],
  re = { class: "font-semibold text-gray-800" },
  oe = { class: "text-sm text-gray-500" },
  ie = { class: "flex items-center" },
  ae = { class: "text-gray-400 mr-2" },
  le = ["onClick"],
  ce = ["onClick"],
  ue = { key: 0, class: "session-content border-t border-gray-100 p-4" },
  de = { class: "tabs-list space-y-2" },
  he = { class: "favicon-container mr-3 mt-1" },
  me = ["src", "onError"],
  ge = { key: 1, class: "w-4 h-4 bg-gray-200 rounded-sm" },
  fe = { class: "tab-details flex-1 min-w-0" },
  pe = { class: "tab-title font-medium text-gray-800 truncate" },
  ye = { class: "tab-url text-sm text-gray-500 truncate" },
  we = { class: "tab-actions ml-2" },
  ve = ["onClick"],
  Ee = {
    class:
      "status-bar fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 flex justify-between items-center",
  },
  Se = { class: "text-sm text-gray-600" },
  _e = {
    __name: "SessionManager",
    emits: ["session-restored", "tab-restored"],
    setup(g, { emit: e }) {
      const t = e,
        s = G(),
        { sessions: n, loading: r } = U(s),
        o = O(new Set()),
        i = O("Ready")
      M(() => [...n.value].sort((a, m) => m.createdAt - a.createdAt))
      const h = (a) => o.value.has(a),
        S = (a) => {
          o.value.has(a) ? o.value.delete(a) : o.value.add(a)
        },
        _ = (a) => new Date(a).toLocaleString(),
        b = async () => {
          i.value = "Creating new session..."
          try {
            await s.createNewSession(), (i.value = "Session created successfully")
          } catch (a) {
            ;(i.value = "Error creating session"), console.error("Error creating session:", a)
          }
        },
        l = async (a) => {
          i.value = "Restoring session..."
          try {
            await s.restoreSession(a), t("session-restored", a), (i.value = "Session restored successfully")
          } catch (m) {
            ;(i.value = "Error restoring session"), console.error("Error restoring session:", m)
          }
        },
        c = async (a) => {
          i.value = "Restoring tab..."
          try {
            await s.restoreTab(a), t("tab-restored", a), (i.value = "Tab restored successfully")
          } catch (m) {
            ;(i.value = "Error restoring tab"), console.error("Error restoring tab:", m)
          }
        },
        f = async (a) => {
          if (!!confirm("Are you sure you want to delete this session?")) {
            i.value = "Deleting session..."
            try {
              await s.deleteSession(a), (i.value = "Session deleted successfully")
            } catch (m) {
              ;(i.value = "Error deleting session"), console.error("Error deleting session:", m)
            }
          }
        },
        k = (a, m) => {
          ;(a.target.style.display = "none"), m.favicon || s.fetchFavicon(m.url)
        },
        d = () => {
          chrome.runtime.openOptionsPage()
        }
      return (
        H(async () => {
          i.value = "Loading sessions..."
          try {
            await s.loadSessions(), (i.value = "Ready")
          } catch (a) {
            ;(i.value = "Error loading sessions"), console.error("Error loading sessions:", a)
          }
        }),
        (a, m) => (
          w(),
          v("div", Q, [
            u("div", { class: "header flex items-center justify-between mb-5 pb-3 border-b border-gray-200" }, [
              m[0] || (m[0] = u("h1", { class: "text-xl font-bold text-gray-800" }, "Session Manager", -1)),
              u(
                "button",
                {
                  onClick: b,
                  class: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors",
                },
                " New Session ",
              ),
            ]),
            u("div", Y, [
              R(r)
                ? (w(),
                  v(
                    "div",
                    ee,
                    m[1] ||
                      (m[1] = [
                        u("div", { class: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" }, null, -1),
                      ]),
                  ))
                : R(n).length === 0
                  ? (w(), v("div", te, " No sessions found. Create a new session to get started. "))
                  : (w(),
                    v("div", se, [
                      (w(!0),
                      v(
                        A,
                        null,
                        T(
                          R(n),
                          (p) => (
                            w(),
                            v(
                              "div",
                              { key: p.id, class: "session-item bg-white rounded-lg shadow-sm mb-3 overflow-hidden" },
                              [
                                u(
                                  "div",
                                  {
                                    class: "session-header p-4 flex items-center justify-between cursor-pointer",
                                    onClick: (E) => S(p.id),
                                  },
                                  [
                                    u("div", null, [
                                      u("h3", re, C(p.name), 1),
                                      u("p", oe, C(_(p.createdAt)) + " \u2022 " + C(p.data.length) + " tabs ", 1),
                                    ]),
                                    u("div", ie, [
                                      u("span", ae, C(h(p.id) ? "\u25BC" : "\u25B6"), 1),
                                      u(
                                        "button",
                                        {
                                          onClick: I((E) => l(p.id), ["stop"]),
                                          class:
                                            "px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors mr-2",
                                        },
                                        " Restore ",
                                        8,
                                        le,
                                      ),
                                      u(
                                        "button",
                                        {
                                          onClick: I((E) => f(p.id), ["stop"]),
                                          class:
                                            "px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors",
                                        },
                                        " Delete ",
                                        8,
                                        ce,
                                      ),
                                    ]),
                                  ],
                                  8,
                                  ne,
                                ),
                                h(p.id)
                                  ? (w(),
                                    v("div", ue, [
                                      u("div", de, [
                                        (w(!0),
                                        v(
                                          A,
                                          null,
                                          T(
                                            p.data,
                                            (E, F) => (
                                              w(),
                                              v(
                                                "div",
                                                {
                                                  key: F,
                                                  class: "tab-item flex items-start p-2 hover:bg-gray-50 rounded-md",
                                                },
                                                [
                                                  u("div", he, [
                                                    E.favicon
                                                      ? (w(),
                                                        v(
                                                          "img",
                                                          {
                                                            key: 0,
                                                            src: E.favicon,
                                                            class: "w-4 h-4",
                                                            alt: "",
                                                            onError: ($) => k($, E),
                                                          },
                                                          null,
                                                          40,
                                                          me,
                                                        ))
                                                      : (w(), v("div", ge)),
                                                  ]),
                                                  u("div", fe, [
                                                    u("div", pe, C(E.title), 1),
                                                    u("div", ye, C(E.url), 1),
                                                  ]),
                                                  u("div", we, [
                                                    u(
                                                      "button",
                                                      {
                                                        onClick: I(($) => c(E), ["stop"]),
                                                        class: "text-blue-500 hover:text-blue-700",
                                                        title: "Restore this tab",
                                                      },
                                                      m[2] ||
                                                        (m[2] = [
                                                          u(
                                                            "svg",
                                                            {
                                                              xmlns: "http://www.w3.org/2000/svg",
                                                              class: "h-4 w-4",
                                                              fill: "none",
                                                              viewBox: "0 0 24 24",
                                                              stroke: "currentColor",
                                                            },
                                                            [
                                                              u("path", {
                                                                "stroke-linecap": "round",
                                                                "stroke-linejoin": "round",
                                                                "stroke-width": "2",
                                                                d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
                                                              }),
                                                            ],
                                                            -1,
                                                          ),
                                                        ]),
                                                      8,
                                                      ve,
                                                    ),
                                                  ]),
                                                ],
                                              )
                                            ),
                                          ),
                                          128,
                                        )),
                                      ]),
                                    ]))
                                  : L("", !0),
                              ],
                            )
                          ),
                        ),
                        128,
                      )),
                    ])),
            ]),
            u("div", Ee, [
              u("span", Se, C(i.value), 1),
              u(
                "button",
                {
                  onClick: d,
                  class: "px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors",
                },
                " Settings ",
              ),
            ]),
          ])
        )
      )
    },
  }
var Ce = X(_e, [["__scopeId", "data-v-984faf30"]])
export { Ce as default }
//# sourceMappingURL=SessionManager.deec781d.js.map
