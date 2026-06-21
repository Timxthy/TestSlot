// Browser-side analytics helpers. Loads PostHog via its official, dependency-free
// snippet (no SDK in the bundle — mirrors the dep-free Resend client) and is only
// ever invoked after the user grants cookie consent. All functions are guarded so
// importing this module on the server is harmless.

import {
  consentFromCookieString,
  serializeConsentCookie,
  type ConsentChoice,
} from "./consent";
import { POSTHOG_HOST, POSTHOG_KEY } from "./config";

declare global {
  interface Window {
    // PostHog attaches its (typed-elsewhere) client here once loaded.
    posthog?: {
      init: (key: string, opts: Record<string, unknown>) => void;
      capture: (event: string, props?: Record<string, unknown>) => void;
      identify: (distinctId: string, props?: Record<string, unknown>) => void;
      opt_out_capturing: () => void;
      __loaded?: boolean;
    };
  }
}

let loadStarted = false;
// Set if identify() is called before PostHog has been injected (effect ordering);
// flushed once the client exists.
let pendingDistinctId: string | null = null;

/** Reads the stored consent choice from document.cookie (null = undecided). */
export function getStoredConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  return consentFromCookieString(document.cookie);
}

/** Persists the user's consent choice as a first-party cookie. */
export function storeConsent(choice: ConsentChoice): void {
  if (typeof document === "undefined") return;
  document.cookie = serializeConsentCookie(choice);
}

/**
 * Loads + initialises PostHog exactly once. Privacy-conscious defaults:
 * autocapture and automatic pageviews are off (we send explicit events), and
 * person profiles are only created for identified users.
 */
export function loadPostHog(): void {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  if (loadStarted || window.posthog?.__loaded) return;
  loadStarted = true;

  const opts = {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: false,
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
  };

  // Official PostHog stub: defines window.posthog and lazy-loads array.js, which
  // drains any calls queued before it finishes downloading.
  const stub =
    '!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);';

  const script = document.createElement("script");
  script.textContent = `${stub}window.posthog.init(${JSON.stringify(
    POSTHOG_KEY,
  )}, ${JSON.stringify(opts)});`;
  document.head.appendChild(script);

  // The stub now exists (and queues calls until array.js arrives) — flush any
  // identify() that fired before the loader was injected.
  if (pendingDistinctId) {
    window.posthog?.identify(pendingDistinctId);
    pendingDistinctId = null;
  }
}

/**
 * Ties the browser's anonymous events to the signed-in user (their UUID) so the
 * client and server-side events stitch into one person in PostHog. No-ops until
 * PostHog is loaded; the id is held and flushed once it is.
 */
export function identify(distinctId: string): void {
  if (typeof window === "undefined" || !distinctId) return;
  if (window.posthog) window.posthog.identify(distinctId);
  else pendingDistinctId = distinctId;
}

/**
 * Best-effort client-side error report. Sends a bounded message only (no stack,
 * no PII) and no-ops unless PostHog is loaded.
 */
export function reportClientError(error: unknown): void {
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? error.message : String(error);
  window.posthog?.capture("$exception", {
    name: error instanceof Error ? error.name : "Error",
    message: message.slice(0, 300),
    digest: (error as { digest?: string } | null)?.digest,
  });
}

/** Fire-and-forget event capture. No-ops until PostHog has loaded. */
export function capture(
  event: string,
  props?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  window.posthog?.capture(event, props);
}

/** Manual pageview (we keep PostHog's automatic pageview tracking off). */
export function capturePageview(url: string): void {
  capture("$pageview", { $current_url: url });
}

/** Stops capture and clears PostHog cookies after a consent withdrawal. */
export function optOut(): void {
  if (typeof window === "undefined") return;
  window.posthog?.opt_out_capturing();
}
