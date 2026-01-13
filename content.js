
/// content.js

// Liste chargée depuis background.js ou JSON
let newsSites = []; // sera rempli via message si besoin

// Verify if loaded page is a news website
function isNewsArticle() {
  try {
    const domain = (new URL(location.href)).hostname.replace(/^www\./, '').toLowerCase();
    return newsSites.some(site => site.domain === domain);
  } catch (err) {
    console.error('Erreur dans isNewsArticle:', err);
    return false;
  }
}

// Envoi au background
function analyzePage() {
  if (!isNewsArticle()) {
    console.log('Page non considérée comme article de presse, pas d’analyse');
    return;
  }

  const url = location.href;
  const text = document.body.innerText.slice(0, 5000);
  const title = document.title || '';

  chrome.runtime.sendMessage({
    type: "PAGE_ANALYSIS",
    payload: { url, text, title }
  });
}

window.addEventListener('load', () => setTimeout(analyzePage, 500));

// Affichage de l’assistant
function showAssistant(reasons) {
  if (document.getElementById('owlcat-assistant')) return;

  setTimeout(() => {
    const container = document.createElement('div');
    container.id = 'owlcat-assistant';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.width = '220px';
    container.style.padding = '10px';
    container.style.background = 'rgba(255,255,255,0.95)';
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '10px';
    container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    container.style.zIndex = '9999';
    container.style.fontFamily = 'sans-serif';
    container.style.fontSize = '13px';
    container.style.color = '#333';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';
    container.style.transition = 'opacity 0.3s, transform 0.3s';
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';

    setTimeout(() => {
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 50);

    // Message principal
    const message = document.createElement('div');
    message.innerText =
      'Cette page présente plusieurs signaux de faible fiabilité. Souhaitez-vous que je la vérifie ?';
    container.appendChild(message);

    // Options
    const optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '4px';

    const buttons = [
      { label: 'Pourquoi ?', action: 'WHY' },
      { label: 'Comparer', action: 'COMPARE' },
      { label: 'Ignorer', action: 'IGNORE' }
    ];

    buttons.forEach(btnInfo => {
      const option = document.createElement('div');
      option.style.cursor = 'pointer';
      option.style.paddingLeft = '18px';
      option.style.position = 'relative';
      option.style.userSelect = 'none';

      const bullet = document.createElement('span');
      bullet.style.position = 'absolute';
      bullet.style.left = '0';
      bullet.style.top = '4px';
      bullet.style.width = '10px';
      bullet.style.height = '10px';
      bullet.style.border = '1px solid #555';
      bullet.style.borderRadius = '50%';

      option.appendChild(bullet);
      option.appendChild(document.createTextNode(btnInfo.label));

      option.addEventListener('click', () =>
        handleAction(btnInfo.action, location.href, reasons)
      );

      optionsContainer.appendChild(option);
    });

    container.appendChild(optionsContainer);

    // Image décorative Owlcat
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('assets/owlcat.png');
    img.style.width = '61px';
    img.style.height = '61px';
    img.style.position = 'absolute';
    img.style.right = '8px';
    img.style.bottom = '6px';
    img.style.pointerEvents = 'none';

    container.appendChild(img);

    document.body.appendChild(container);
  }, 500);
}

// Actions utilisateur
function handleAction(action, url, reasons) {
  if (action === 'IGNORE') {
    chrome.runtime.sendMessage({
      type: 'USER_ACTION',
      payload: { action: 'IGNORE', url }
    });
    removeAssistant();
  }

  if (action === 'WHY') {
    if (!reasons || reasons.length === 0) {
      alert('Aucune raison spécifique détectée.');
      return;
    }
    alert(`Owlcat veut vous dire :\n${reasons.map(r => '- ' + r).join('\n')}`);
  }

  if (action === 'COMPARE') {
    alert('Proposition de sources plus fiables à venir…'); // placeholder
  }
}

function removeAssistant() {
  const existing = document.getElementById('owlcat-assistant');
  if (existing) existing.remove();
}

// Réception des messages du background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_ASSISTANT') {
    showAssistant(msg.payload);
  }
});