(() => {
  if (window.__communityProtonFixInstalled) return;
  window.__communityProtonFixInstalled = true;

  const WISHLIST_IDS = [
    "add_to_wishlist_area_success",
    "add_to_wishlist_area",
    "add_to_wishlist_area2",
    "add_to_wishlist_area_fail"
  ];

  const PROTON_PREFIX_RE = /^proton:\s*/i;
  let scheduled = false;

  function findActionsCtn() {
    return document.querySelector(".game_bg.application .queue_overflow_ctn .queue_actions_ctn");
  }

  function findActiveWishlistHost(actionsCtn) {
    if (!actionsCtn) return null;

    for (const id of WISHLIST_IDS) {
      const host = actionsCtn.querySelector("#" + id);
      if (!host) continue;

      const style = window.getComputedStyle(host);
      const visible = style.display !== "none" && style.visibility !== "hidden";
      if (visible) return host;
    }

    return actionsCtn.querySelector(
      "#add_to_wishlist_area_success, #add_to_wishlist_area, #add_to_wishlist_area2, #add_to_wishlist_area_fail"
    );
  }

  function findCommunityButton() {
    return (
      document.querySelector(".queue_overflow_ctn a.community_hub_btn.btn_medium") ||
      document.querySelector(".page_title_area .apphub_OtherSiteInfo > a.btnv6_blue_hoverfade.btn_medium:not(.btn_steamdb)") ||
      document.querySelector(".page_title_area .apphub_OtherSiteInfo > a[href*='steamcommunity.com']")
    );
  }

  function findProtonDivs() {
    return Array.from(document.querySelectorAll(".proton_rating_div"));
  }

  function normalizeProtonText(protonDiv) {
    if (!protonDiv) return;
    const link = protonDiv.querySelector(".proton_rating_link");
    if (!link) return;

    const clean = (link.textContent || "").replace(PROTON_PREFIX_RE, "").trim();
    if (clean) link.textContent = clean;
  }

  function placeCommunity(actionsCtn, wishlistHost) {
    const community = findCommunityButton();
    if (!community || !actionsCtn) return null;

    community.classList.add("community_hub_btn");
    community.removeAttribute("style");

    if (community.parentElement !== actionsCtn) {
      if (wishlistHost) {
        actionsCtn.insertBefore(community, wishlistHost);
      } else {
        actionsCtn.insertBefore(community, actionsCtn.firstChild);
      }
    }

    return community;
  }

  function placeProtons(actionsCtn, community, wishlistHost) {
    if (!actionsCtn) return;

    const protonDivs = findProtonDivs();
    if (!protonDivs.length) return;

    protonDivs.forEach((el) => {
      normalizeProtonText(el);
      el.removeAttribute("style");
    });

    const native = protonDivs.find((el) => el.classList.contains("proton_native"));
    const others = protonDivs.filter((el) => !el.classList.contains("proton_native"));

    const anchor = community || wishlistHost || actionsCtn.firstChild || null;

    for (const el of others) {
      actionsCtn.insertBefore(el, anchor);
    }

    if (native) {
      const firstOther = actionsCtn.querySelector(".proton_rating_div:not(.proton_native)");
      actionsCtn.insertBefore(native, firstOther || anchor);
    }
  }

  function applyFix() {
    const actionsCtn = findActionsCtn();
    if (!actionsCtn) return;

    const wishlistHost = findActiveWishlistHost(actionsCtn);
    const community = placeCommunity(actionsCtn, wishlistHost);
    placeProtons(actionsCtn, community, wishlistHost);
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      applyFix();
    });
  }

  scheduleApply();

  const root = document.querySelector(".game_bg.application") || document.body;
  const observer = new MutationObserver(() => scheduleApply());
  observer.observe(root, { childList: true, subtree: true });

  window.addEventListener("load", scheduleApply, { passive: true });
  window.addEventListener("popstate", scheduleApply, { passive: true });
})();
