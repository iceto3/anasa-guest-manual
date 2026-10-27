/* Anasa Guest Manual — central app config.
 *
 * Everything here is loaded before app.js. Registries:
 *   I18N[code]  — one file per language in lang/<code>.js  (UI strings + manual text)
 *   BOATS[id]   — one file per boat in boats/<id>.js        (facts, contacts, structure)
 * See README.md for how to add a language or a boat.
 */
window.I18N = window.I18N || {};
window.BOATS = window.BOATS || {};
window.APP_CONFIG = {
  defaultBoat: "anasa",            // used when no ?boat=<id> is given in the URL
  defaultLang: "en",
  languages: ["en", "el", "bg", "de"],   // order shown in the language switcher
  messageLang: "en",               // language of the WhatsApp messages the OWNER receives (guest free text is sent as typed)
  ownerPin: "0000"                 // TBD: demo PIN for the hidden Owner settings — change before real use
};
