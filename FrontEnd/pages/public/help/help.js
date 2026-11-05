"use strict";

// Help & policies is static content. When a section is opened from another page's footer,
// move focus to it so keyboard and screen-reader users land on the right heading.
const target = window.location.hash && document.querySelector(window.location.hash);
if (target && target.classList.contains("help__section")) {
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: false });
}
