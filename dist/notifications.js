(() => {
  'use strict';
  window.ResumeItNotify = (message, options = {}) => {
    let root = document.getElementById('ri-notifications');
    if (!root) {
      root = document.createElement('div');
      root.id = 'ri-notifications'; root.className = 'toast toast-top toast-end';
      root.setAttribute('aria-live', 'polite'); root.setAttribute('aria-relevant', 'additions');
      document.body.appendChild(root);
    }
    const item = document.createElement('div');
    item.className = 'alert ri-notification'; item.dataset.kind = options.kind || 'info';
    const text = document.createElement('span');
    text.textContent = String(message).replace(/\.(?=\s|$)/g, ' ').trim();
    const close = document.createElement('button');
    close.type = 'button'; close.setAttribute('aria-label', 'بستن اعلان'); close.textContent = '×';
    item.append(text, close); root.appendChild(item);
    while (root.children.length > 3) root.firstChild.remove();
    let timer;
    const dismiss = () => { clearTimeout(timer); item.classList.add('is-leaving'); setTimeout(() => item.remove(), 200); };
    close.onclick = dismiss;
    timer = setTimeout(dismiss, options.duration || 4200);
  };
})();
