// Ajouts discrets dans les pages (aucun accès à Windows n'est donné aux pages) :
// - bouton 🏠 en bas à gauche pour revenir à l'accueil depuis une appli ;
// - rappel des raccourcis clavier à l'ouverture de l'accueil.
'use strict';
window.addEventListener('DOMContentLoaded', () => {
  const accueil = location.pathname === '/' || location.pathname === '/index.html';
  const style = document.createElement('style');
  style.textContent = `
    #win-accueil{position:fixed;left:8px;bottom:8px;z-index:2147483647;width:40px;height:40px;border-radius:50%;
      border:1px solid #334155;background:#1e293bcc;color:#e2e8f0;font-size:20px;line-height:38px;text-align:center;
      cursor:pointer;opacity:.45;transition:opacity .2s;padding:0}
    #win-accueil:hover,#win-accueil:focus-visible{opacity:1;outline:2px solid #f59e0b}
    #win-aide{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:#1e293bee;
      color:#e2e8f0;border:1px solid #f59e0b;border-radius:12px;padding:10px 16px;font:15px system-ui,"Segoe UI",sans-serif;
      transition:opacity .6s;pointer-events:none;text-align:center}`;
  document.head.appendChild(style);

  if (!accueil) {
    const b = document.createElement('button');
    b.id = 'win-accueil';
    b.type = 'button';
    b.title = 'Accueil (Ctrl+Accueil)';
    b.setAttribute('aria-label', 'Retour à l\'accueil');
    b.textContent = '🏠';
    b.addEventListener('click', () => { location.href = '/'; });
    document.body.appendChild(b);
  } else if (!sessionStorage.getItem('win-aide-vue')) {
    sessionStorage.setItem('win-aide-vue', '1');
    const a = document.createElement('div');
    a.id = 'win-aide';
    a.textContent = 'F11 : plein écran · Ctrl + / Ctrl − : agrandir / réduire · Ctrl+Accueil : accueil · Alt+F4 : quitter';
    document.body.appendChild(a);
    setTimeout(() => { a.style.opacity = '0'; }, 6000);
    setTimeout(() => a.remove(), 7000);
  }
});
