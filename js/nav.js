/* Hardware-back support.
 *
 * An installed app gets the system back gesture, and without history entries
 * that gesture EXITS — from three panels deep. So every step into the UI
 * pushes one history entry, and popping one closes the topmost thing open,
 * exactly as its own close button would.
 *
 * Closing happens by clicking the control the finger would use, not by
 * calling into each module: the modules keep their state private, the
 * behaviour cannot drift apart from the visible button, and this file needs
 * no imports — so anything may import it without cycles.
 *
 * Closing things manually leaves stale entries behind; a pop that finds
 * nothing open consumes the entry and pops again, so back eventually leaves
 * the app only from the sector view, which is the right place to leave from.
 */

/** Call when a UI level opens — a panel, a sheet, a dive, a system. */
export function pushUi(tag = 'ui') {
  history.pushState({ ui: tag }, '');
}

/**
 * Close the topmost open UI element. Returns what it closed, or null.
 * Ordered from most to least modal — the same order a stack of Escapes
 * would want.
 */
export function closeTopUi() {
  const click = sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  };
  const open = sel => {
    const el = document.querySelector(sel);
    return el && !el.hidden;
  };

  if (click('.portrait-modal .sheet-x'))               return 'portrait-modal';
  if (open('#ship-actions') && open('#ship-cancel')
      && click('#ship-cancel'))                        return 'targeting';
  if (open('#about-panel') && click('#about-close'))   return 'about';
  if (open('#share-panel') && click('#share-close'))   return 'share';
  if (open('#stakeholders-panel')) {
    if (open('#stakeholder-detail')
        && click('#stakeholder-detail .sheet-back'))   return 'stakeholder-detail';
    if (click('#stakeholders-close'))                  return 'stakeholders';
  }
  if (open('#crew-panel')) {
    /* A sheet steps back to the roster; the roster closes the panel. */
    if (open('#crew-sheet') && click('#crew-sheet .sheet-back')) return 'crew-sheet';
    if (click('#crew-close'))                          return 'crew';
  }
  if (open('#fleet-panel')) {
    if (open('#fleet-sheet') && click('#fleet-sheet .sheet-back')) return 'fleet-sheet';
    if (click('#fleet-close'))                         return 'fleet';
  }
  {
    const info = document.querySelector('#location-view .loc-info-panel');
    if (info && !info.hidden
        && click('#location-view .loc-info-close'))    return 'loc-info';
  }
  if (document.getElementById('location-view')?.classList.contains('active')
      && click('.loc-back'))                           return 'location';
  /* System view -> sector, via the crumb that already does it. */
  {
    const crumb = document.querySelector('.crumb[data-go="sector"]:not(.current)');
    if (crumb) { crumb.click();                        return 'system'; }
  }
  return null;
}

export function installBackHandler() {
  window.addEventListener('popstate', () => {
    if (!closeTopUi() && history.state?.ui) {
      /* A stale entry from something closed by hand: consume it and keep
         unwinding, so back never appears to do nothing. */
      history.back();
    }
  });
}
