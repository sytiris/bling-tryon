import { normalizeLanguage, translate, applyTranslations, setTranslatedText } from "../../helper/public/i18n.js";
export async function createLocale(onChange = () => {}) {
  const state = await chrome.storage.local.get("blingLanguage");
  let language = normalizeLanguage(state.blingLanguage || chrome.i18n.getUILanguage());
  const locale = {
    get language() { return language; },
    t: (key, values) => translate(language, key, values),
    text: (node, key, values) => setTranslatedText(node, language, key, values),
    render() {
      applyTranslations(document, language);
      const button = document.getElementById("language");
      if (button) button.textContent = language === "zh" ? "EN" : "中文";
    },
    toggle: () => chrome.storage.local.set({ blingLanguage: language === "zh" ? "en" : "zh" }),
  };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.blingLanguage) return;
    language = normalizeLanguage(changes.blingLanguage.newValue || chrome.i18n.getUILanguage());
    locale.render(); onChange();
  });
  locale.render();
  document.getElementById("language")?.addEventListener("click", locale.toggle);
  return locale;
}
