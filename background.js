// background.js
// It was originally written in french, I did an effort to translate it. It is fairly sketchy, my English is far from great. 
// Also, I cleaned the files for websites list and rating, I just put an example of what it should look like, and some "sensational" words.


let sensationalWords = [];
let pressScore = []; // List of news website with their scores
const ignoredSites = new Set();

// Sensational words function, most sketchy news websites uses them to catch attention, can be an indicator if there is too much of them
async function loadSensationalWords() {
  try {
    const response = await fetch(chrome.runtime.getURL('sensationalWords.json'));
    sensationalWords = await response.json();
    console.log('Loaded sensational words :', sensationalWords);
  } catch (err) {
    console.error('Error while loading sensationalWords.json', err);
  }
}

// Load sites list and their scores
async function loadPressScore() {
  try {
    const response = await fetch(chrome.runtime.getURL('pressScore.json'));
    pressScore = await response.json();
    console.log('Loaded news websites :', pressScore);
  } catch (err) {
    console.error('Error while loading pressScore.json', err);
  }
}


loadSensationalWords();
loadPressScore();


// Fetch website infos
function getSiteInfo(url) {
  const domain = (new URL(url)).hostname.replace(/^www\./, '').toLowerCase();
  return pressScore.find(site => site.domain === domain) || null;
}

// Analyze the page
function analyzePage({ url, text, title }) {
  if (!url) return { shouldNotify: false, reasons: [] };
  if (ignoredSites.has(url)) return { shouldNotify: false, reasons: [] };

  const siteInfo = getSiteInfo(url);
  if (!siteInfo) return { shouldNotify: false, reasons: [] }; // No alert if unknown website

  const reasons = [];

  // Page reliability, uses the score and the known violations of the website (like fake news, alarmism...)
  if (siteInfo.reliability < 50) {
    reasons.push("This website is rated with a low reliability according to press evaluations.");
    if (siteInfo.violations && siteInfo.violations.length > 0) {
      reasons.push(...siteInfo.violations);
    }
  }

  // Check for sensational title
  const sensational = sensationalWords.some(word =>
    new RegExp(`\\b${word}\\b`, 'i').test(title)
  );
  if (sensational) reasons.push("The title seems sensational or alarmist.");

  // Check for author
  const hasAuthor = /par\s+\w+/i.test(text);
  if (!hasAuthor) reasons.push("This article seems to lack an author.");

  const shouldNotify = reasons.length > 0;

  console.log('Page analyze :', { url, siteInfo, sensational, hasAuthor, reasons, shouldNotify });
  return { shouldNotify, reasons };
}

// Content script messages
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "PAGE_ANALYSIS") {
    const { url, text, title } = msg.payload;

    const result = analyzePage({ url, text, title });

    if (result.shouldNotify) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "SHOW_ASSISTANT",
        payload: result.reasons
      });
    }
  }

  if (msg.type === "USER_ACTION") {
    const { action, url } = msg.payload;
    if (action === "IGNORE") {
      ignoredSites.add(url);
      console.log(`Ignored website : ${url}`);
    }
  }
});